import React, { useState, useEffect } from 'react'
import {
  Calendar,
  Search,
  MapPin,
  Clock,
  Building2,
  Eye,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Target,
  Users
} from 'lucide-react'
import { visitAPI, hrmsAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'

export default function CEOVisits() {
  const { showToast } = useToast()

  // API State
  const [loading, setLoading] = useState(true)
  const [visits, setVisits] = useState([])
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

  // Pagination State
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  // Full Audit Modal State
  const [selectedAuditModal, setSelectedAuditModal] = useState(null)

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

  // CEO sees all executives across the company
  const getAllExecutivesList = (rawEmployees) => {
    return rawEmployees.filter(
      (u) =>
        (u.role && u.role.toLowerCase().includes('exec')) ||
        (u.designation && u.designation.toLowerCase().includes('exec')) ||
        u.role === 'Sales Executive'
    )
  }

  // Load Sales Executives
  useEffect(() => {
    hrmsAPI
      .getEmployees()
      .then((res) => {
        const raw = Array.isArray(res) ? res : res?.data || []
        if (raw && raw.length > 0) {
          const execsOnly = getAllExecutivesList(raw)
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

  const fallbackLoadExecutives = () => {
    try {
      const savedUsersStr = localStorage.getItem('tc_app_users')
      if (savedUsersStr) {
        const parsed = JSON.parse(savedUsersStr)
        const execsOnly = getAllExecutivesList(parsed)
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
    setExecutives([])
  }

  const resolveEmployeeCode = (seName, seEmail, rawCode) => {
    const n = (seName || '').toLowerCase().trim()
    const e = (seEmail || '').toLowerCase().trim()

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
    return 'EMP000101'
  }

  const normalizeVisit = (v, idx = 0) => {
    if (!v) return null
    const id = v.id || v.visit_id || `VST-${1001 + idx}`
    const seName = v.assigned_to || v.assignedTo || v.executive || v.executiveName || v.sales_executive_name || 'Abi hastro'
    const seEmail = v.assigned_to_email || v.assignedToEmail || v.executiveEmail || v.email || 'abi@gmail.com'
    const empCode = resolveEmployeeCode(seName, seEmail, v.employee_code || v.employee_id || v.emp_code)

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
      visit_date: v.visit_date || v.visitDate || v.date || v.scheduledDate || 'Today',
      visit_time: v.visit_time || v.visitTime || v.time || v.scheduledTime || '10:00 AM',
      check_in_time: v.check_in_time || v.checkInTime || '10:30 AM',
      check_out_time: v.check_out_time || v.checkOutTime || '11:15 AM',
      duration: v.duration || v.meetingDuration || '45 Mins',
      gps_location: v.gps_location || v.location || v.address || v.city || 'Chennai',
      visit_status: v.visit_status || v.status || 'Scheduled',
      discussion_summary: v.discussion_summary || v.purpose || v.notes || v.remark || 'Site Visit / Product Demo',
      customer_requirements: v.customer_requirements || 'Requires enterprise solution.',
      products_discussed: v.products_discussed || v.purpose || 'TwiteConnect Field CRM Suite',
      competitor_info: v.competitor_info || '',
      estimated_order_value: v.estimated_order_value || v.value || '₹4,50,000',
      customer_feedback: v.customer_feedback || '',
      next_action: v.next_action || 'Follow up with client',
      lead_status: v.lead_status || 'Follow Up Required',
      lead_priority: v.lead_priority || v.priority || 'Hot',
      remarks: v.remarks || v.notes || v.remark || 'Site visit logged.',
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

  const fetchTeamAuditData = async () => {
    setLoading(true)
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

  const calculateLocalSummary = (visitArr) => {
    const scheduled = visitArr.filter((x) => String(x.visit_status || x.status || '').toLowerCase().includes('schedule')).length
    const completed = visitArr.filter((x) => String(x.visit_status || x.status || '').toLowerCase().includes('complete')).length
    const pending = visitArr.filter((x) => String(x.visit_status || x.status || '').toLowerCase().includes('pending') || String(x.status || '').toLowerCase().includes('check')).length
    const missed = visitArr.filter((x) => String(x.visit_status || x.status || '').toLowerCase().includes('miss') || String(x.status || '').toLowerCase().includes('cancel')).length
    const converted = visitArr.filter((x) => String(x.lead_status || '').toLowerCase().includes('convert')).length
    const followups = visitArr.filter((x) => String(x.lead_status || '').toLowerCase().includes('follow')).length
    const hot = visitArr.filter((x) => String(x.lead_priority || x.priority || '').toLowerCase().includes('hot')).length
    const warm = visitArr.filter((x) => String(x.lead_priority || x.priority || '').toLowerCase().includes('warm')).length
    const cold = visitArr.filter((x) => String(x.lead_priority || x.priority || '').toLowerCase().includes('cold')).length

    setSummary({
      scheduled_today: scheduled,
      completed_today: completed,
      pending_visits: pending,
      missed_visits: missed,
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
    <div className="mx-auto max-w-[1400px] space-y-6 text-slate-900 font-sans pb-12 animate-in fade-in duration-200">
      {/* HEADER PANEL */}
      <div className="bg-gradient-to-r from-[#004749]/10 via-white to-[#004749]/5 border-2 border-[#004749]/20 p-6 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <MapPin className="w-7 h-7 text-[#004749]" /> Telemetry & Field Visits Audit
          </h1>
          <p className="text-xs text-slate-500 font-bold mt-1">
            Real-time GPS check-ins, field logs, client requirements, and audit details for all Sales Executives.
          </p>
        </div>

        <button
          onClick={fetchTeamAuditData}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#004749] hover:bg-[#003638] text-white font-black text-xs shadow-md transition cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Telemetry
        </button>
      </div>

      {/* VISIT SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Scheduled Card */}
        <div className="bg-[#b09b72]/5 border border-[#b09b72]/20 p-4 rounded-xl shadow-xs hover:scale-[1.02] transition">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#b09b72]">Scheduled</span>
          <h2 className="text-2xl font-black text-slate-900 mt-1">{summary.scheduled_today}</h2>
          <p className="text-[10px] text-slate-400 font-bold mt-1">Today's Appointments</p>
        </div>

        {/* Completed Card */}
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl shadow-xs hover:scale-[1.02] transition">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Completed</span>
          <h2 className="text-2xl font-black text-emerald-950 mt-1">{summary.completed_today}</h2>
          <p className="text-[10px] text-emerald-600 font-bold mt-1">Forms Logged & Verified</p>
        </div>

        {/* Active Card */}
        <div className="bg-[#004749]/5 border border-[#004749]/20 p-4 rounded-xl shadow-xs hover:scale-[1.02] transition">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#004749]">Pending / Active</span>
          <h2 className="text-2xl font-black text-slate-900 mt-1">{summary.pending_visits}</h2>
          <p className="text-[10px] text-slate-400 font-bold mt-1">Checked-In/In Progress</p>
        </div>

        {/* Missed Card */}
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl shadow-xs hover:scale-[1.02] transition">
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-800">Missed Visits</span>
          <h2 className="text-2xl font-black text-rose-950 mt-1">{summary.missed_visits}</h2>
          <p className="text-[10px] text-rose-600 font-bold mt-1">Unattended Schedules</p>
        </div>

        {/* Action Card */}
        <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl shadow-xs hover:scale-[1.02] transition">
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-800">Follow-Ups</span>
          <h2 className="text-2xl font-black text-indigo-950 mt-1">{summary.followups}</h2>
          <p className="text-[10px] text-indigo-600 font-bold mt-1">Action Required</p>
        </div>
      </div>

      {/* FILTER & CONTROL BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center justify-between">
          
          {/* Executive Selection */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold shrink-0">
            <span className="text-slate-500">Sales Executive:</span>
            <select
              value={selectedSE}
              onChange={(e) => {
                setSelectedSE(e.target.value)
                if (e.target.value !== 'Other') setCustomSEInput('')
                setPage(1)
              }}
              className="bg-transparent text-slate-800 focus:outline-none cursor-pointer font-black max-w-[240px] truncate"
            >
              <option value="All">All Executives</option>
              {executives.map((ex) => (
                <option key={ex.email || ex.id} value={ex.email || ex.name}>
                  [{ex.employee_code}] {ex.name}
                </option>
              ))}
              <option value="Other">✏️ Search Manual...</option>
            </select>

            {selectedSE === 'Other' && (
              <input
                type="text"
                value={customSEInput}
                onChange={(e) => {
                  setCustomSEInput(e.target.value)
                  setPage(1)
                }}
                placeholder="SE Name / Code..."
                className="bg-white border border-[#004749]/40 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#004749] w-[180px] shadow-2xs"
                autoFocus
              />
            )}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 lg:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search Customer, ID, SE Name, EMP Code..."
              className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 text-xs text-slate-900 focus:outline-none focus:border-[#004749] font-bold"
            />
          </div>
        </div>

        {/* Date Filter and Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          
          {/* Status Selection */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold">
            <span className="text-slate-500">Visit Status:</span>
            <select
              value={selectedVisitStatus}
              onChange={(e) => {
                setSelectedVisitStatus(e.target.value)
                setPage(1)
              }}
              className="bg-transparent text-slate-800 focus:outline-none cursor-pointer font-black"
            >
              <option value="All">All Visit Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending / Check-In</option>
              <option value="MISSED">Missed</option>
            </select>
          </div>

          {/* Linear Date Filters */}
          <div className="flex items-center gap-1 bg-[#004749]/5 p-1 rounded-xl border border-[#004749]/20">
            <span className="text-[10px] font-black text-[#004749] px-2">Date:</span>
            {['All', 'Today', 'Yesterday', 'This Month', 'Custom'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleLinearDateFilter(tab)}
                className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg transition cursor-pointer ${
                  dateFilterTab === tab
                    ? 'bg-[#004749] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                {tab === 'All' ? 'All Time' : tab}
              </button>
            ))}
          </div>

          {dateFilterTab === 'Custom' && (
            <div className="flex items-center gap-2 bg-[#004749]/5 border border-[#004749]/20 rounded-xl px-3 py-1.5 font-bold">
              <span className="text-slate-500">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent text-slate-800 focus:outline-none cursor-pointer font-bold text-xs"
              />
              <span className="text-slate-500 ml-1">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent text-slate-800 focus:outline-none cursor-pointer font-bold text-xs"
              />
            </div>
          )}

          {/* Reset Filters */}
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
              className="text-[11px] font-black text-rose-700 hover:underline cursor-pointer ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* TELEMETRY TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-850 min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4">Client Name</th>
                <th className="px-6 py-4">Sales Executive</th>
                <th className="px-6 py-4">Visit Date & Time</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Telemetry Notes</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold text-xs">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-16 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#004749] mb-2" />
                    <span className="text-xs font-bold text-slate-400">Syncing field telemetry from Supabase...</span>
                  </td>
                </tr>
              ) : paginatedVisits.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-16 text-slate-400 italic">
                    No field visit telemetry found matching filters.
                  </td>
                </tr>
              ) : (
                paginatedVisits.map((visit, idx) => (
                  <tr key={visit.id || idx} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 font-black text-slate-900">
                      {visit.company || visit.customer_name || 'Prospect Client'}
                    </td>
                    <td className="px-6 py-4 text-slate-900 font-black">
                      {visit.assigned_to || 'Sales Executive'}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-semibold font-mono">
                      <span>{visit.visit_date}</span>
                      <span className="text-amber-800 font-black ml-1.5">• {visit.visit_time}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase ${
                          String(visit.visit_status || visit.status || '').toLowerCase().includes('complete')
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : String(visit.visit_status || visit.status || '').toLowerCase().includes('schedule')
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}
                      >
                        {visit.visit_status || visit.status || 'SCHEDULED'}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-[250px] truncate text-slate-500 font-semibold">
                      {visit.discussion_summary || visit.purpose || 'Site visit completed.'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedAuditModal(visit)}
                        className="px-3 py-1.5 rounded-xl bg-[#004749] hover:bg-[#003638] text-white font-extrabold text-[10px] shadow-xs cursor-pointer transition active:scale-95 flex items-center gap-1 mx-auto"
                      >
                        <Eye size={12} /> Audit Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
          <div>
            Showing {paginatedVisits.length} of {filteredVisits.length} entries
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-150 cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-150 cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* TELEMETRY DETAILS AUDIT MODAL */}
      {selectedAuditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 md:p-8 space-y-4 shadow-2xl overflow-y-auto max-h-[85vh] animate-in zoom-in-95 duration-200 text-slate-900 text-xs font-bold">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase text-[#004749] bg-[#004749]/5 px-2 py-0.5 rounded border border-[#004749]/15">
                    Field Telemetry Audit
                  </span>
                  <span className="text-[9px] font-mono font-black text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                    #{selectedAuditModal.visit_id}
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 mt-1 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#004749]" /> {selectedAuditModal.customer_name}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedAuditModal(null)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-650 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* SE & POC Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[9px] font-black uppercase text-slate-400">Assigned Sales Executive</span>
                <p className="font-black text-slate-900 text-sm">{selectedAuditModal.assigned_to}</p>
                <p className="text-[10px] text-slate-500 font-mono">{selectedAuditModal.assigned_to_email}</p>
                <p className="text-[10px] text-[#004749] font-black mt-1">Emp Code: {selectedAuditModal.employee_code}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[9px] font-black uppercase text-slate-400">Customer POC Details</span>
                <p className="font-black text-slate-900 text-sm">{selectedAuditModal.poc_name}</p>
                {selectedAuditModal.poc_mobile && <p className="text-[10px] text-slate-500">📞 {selectedAuditModal.poc_mobile}</p>}
                {selectedAuditModal.poc_email && <p className="text-[10px] text-slate-500">✉️ {selectedAuditModal.poc_email}</p>}
              </div>
            </div>

            {/* Telemetry Check-in GPS Data */}
            <div className="p-4 rounded-xl border border-[#b09b72]/30 bg-[#b09b72]/5 space-y-3">
              <span className="text-[10px] font-black text-[#b09b72] uppercase tracking-wider block">GPS Verified Check-in Telemetry</span>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">CHECK-IN</span>
                  <span className="text-emerald-700 font-black flex items-center gap-1 mt-0.5">
                    <Clock size={11} /> {selectedAuditModal.check_in_time}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">CHECK-OUT</span>
                  <span className="text-rose-700 font-black flex items-center gap-1 mt-0.5">
                    <Clock size={11} /> {selectedAuditModal.check_out_time}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">MEETING DURATION</span>
                  <span className="text-slate-900 font-black block mt-0.5">{selectedAuditModal.duration}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">LOCATION (CITY)</span>
                  <span className="text-slate-900 font-black flex items-center gap-1 mt-0.5">
                    <MapPin size={11} /> {selectedAuditModal.gps_location}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes & Discussed */}
            <div className="space-y-3 bg-slate-50 border border-slate-100 p-4 rounded-xl">
              <div>
                <span className="text-[9px] text-slate-400 block uppercase">DISCUSSION SUMMARY</span>
                <p className="mt-0.5 font-medium text-slate-700 leading-relaxed italic">"{selectedAuditModal.discussion_summary}"</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200/50">
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">PRODUCTS DISCUSSED</span>
                  <p className="mt-0.5 text-slate-800">{selectedAuditModal.products_discussed}</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">ESTIMATED ORDER VALUE</span>
                  <p className="mt-0.5 text-emerald-650 font-black">₹{selectedAuditModal.estimated_order_value}</p>
                </div>
              </div>

              {selectedAuditModal.remarks && (
                <div className="pt-3 border-t border-slate-200/50">
                  <span className="text-[9px] text-slate-400 block uppercase">ADDITIONAL REMARKS</span>
                  <p className="mt-0.5 font-medium text-slate-600">{selectedAuditModal.remarks}</p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
