import React, { useState, useEffect } from 'react'
import {
  Target,
  Search,
  Filter,
  Plus,
  UserCheck,
  Flame,
  Zap,
  Snowflake,
  DollarSign,
  MapPin,
  Phone,
  Mail,
  X,
  Building2,
  FileText,
  User,
  Calendar,
  Clock,
  TrendingUp,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileCheck,
} from 'lucide-react'
import { crmAPI, hrmsAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'
import useCurrentUser from '../../hooks/useCurrentUser.js'
import { formatDate } from '../../utils/dateUtils.js'

export default function ManagerLeads() {
  const { showToast } = useToast()
  const currentUser = useCurrentUser()

  // API State
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [leads, setLeads] = useState([])
  const [summary, setSummary] = useState({
    total_leads: 0,
    hot_leads: 0,
    warm_leads: 0,
    cold_leads: 0,
    converted_leads: 0,
    lost_leads: 0,
    today_leads: 0,
    month_leads: 0,
  })

  // Executive List State
  const [executives, setExecutives] = useState([])

  // Filter & Search State
  const [search, setSearch] = useState('')
  const [selectedSE, setSelectedSE] = useState('All')
  const [customSEInput, setCustomSEInput] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [selectedPriority, setSelectedPriority] = useState('All')
  const nowObj = new Date()
  const initFirstDay = new Date(nowObj.getFullYear(), nowObj.getMonth(), 1).toISOString().split('T')[0]
  const initToday = nowObj.toISOString().split('T')[0]

  const [fromDate, setFromDate] = useState(initFirstDay)
  const [toDate, setToDate] = useState(initToday)
  const [sortBy, setSortBy] = useState('created_at_desc')
  const [dateFilterTab, setDateFilterTab] = useState('This Month')
  const [selectedLeadTab, setSelectedLeadTab] = useState('Leads')
  const [activeTableModal, setActiveTableModal] = useState(null) // 'leads' | 'customer' | null

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
    } else if (tab === 'All') {
      setFromDate('')
      setToDate('')
    } else if (tab === 'Custom') {
      setFromDate('')
      setToDate('')
    }
    setPage(1)
  }

  // Pagination State
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  // Full Lead Report Modal State
  const [selectedLeadModal, setSelectedLeadModal] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)

  // Helper to filter ONLY assigned executives under current manager
  const getAssignedExecutivesList = (rawEmployees) => {
    const mgrUser = getStoredUser()
    const mgrEmail = (mgrUser.email || '').toLowerCase().trim()
    const mgrId = (mgrUser.id || mgrUser.employee_id || mgrUser.user_id || '').toLowerCase().trim()
    const mgrName = (mgrUser.name || mgrUser.full_name || '').toLowerCase().trim()

    // 1. Check local assignment map from Admin Assignment page
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

    // 2. Filter employees matching reporting_manager fields or assignedSet
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

  // Load Sales Executives from backend HRMS API or localStorage
  useEffect(() => {
    hrmsAPI
      .getEmployees()
      .then((res) => {
        const raw = Array.isArray(res) ? res : res?.data || []
        if (raw && raw.length > 0) {
          const execsOnly = getAssignedExecutivesList(raw)
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
        const execsOnly = getAssignedExecutivesList(parsed)
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
    } catch (e) { }

    setExecutives([])
  }

  const enrichLeads = (leadArr) => {
    return leadArr.map((l) => {
      const rawStatus = (l.status || "NEW").toUpperCase();
      const statusMap = {
        "NEW": "New",
        "FOLLOW_UP": "Moved to Follow-ups",
        "VISIT_SCHEDULED": "Visit Scheduled",
        "CONVERTED": "Converted to Customer",
        "LOST": "Not Converted / Lost",
      };
      return {
        ...l,
        id: l.lead_id || l.id,
        leadNumber: l.lead_number || `LD-${String(l.lead_id || l.id || "").slice(-8).toUpperCase()}`,
        company: l.company_name || l.company || "Prospect Lead",
        company_name: l.company_name || l.company || "Prospect Lead",
        person: l.contact_person || l.contact_name || "Point of Contact",
        contact_name: l.contact_person || l.contact_name || "Point of Contact",
        contact_person: l.contact_person || l.contact_name || "Point of Contact",
        phone: l.mobile || l.phone || l.contact_phone || "",
        mobile: l.mobile || l.phone || l.contact_phone || "",
        email: l.email || l.contact_email || "",
        city: l.city || "Chennai",
        product: l.product_name || l.product || "TwiteConnect CRM",
        product_name: l.product_name || l.product || "TwiteConnect CRM",
        category: l.category || "Warm",
        priority: l.priority || "Medium",
        status: statusMap[rawStatus] || l.status || "New",
        value: l.expected_value ? `₹${Number(l.expected_value).toLocaleString("en-IN")}` : "₹0",
        assignedTo: l.assigned_to || '',
        assignedToEmail: l.assigned_to_email || '',
        notes: l.notes || l.remarks || "",
        customerId: l.customer_id || null,
      };
    });
  }

  // Primary API Data Fetch function
  const fetchTeamLeadReports = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = {}
      if (selectedSE !== 'All') params.sales_executive_id = selectedSE
      if (selectedPriority !== 'All') params.priority = selectedPriority
      if (selectedStatus !== 'All') params.status = selectedStatus
      if (search) params.search = search
      if (fromDate) params.from_date = fromDate
      if (toDate) params.to_date = toDate
      params.page = page
      params.limit = limit
      params.sort = sortBy

      const res = await crmAPI.getTeamLeads(params)
      const data = res?.data || res || {}

      if (data.leads && Array.isArray(data.leads)) {
        const enriched = enrichLeads(data.leads)
        setLeads(enriched)
        if (data.summary) {
          setSummary(data.summary)
        } else {
          calculateLocalSummary(enriched)
        }
      } else {
        // Fallback fetch all leads from crmAPI.getLeads
        const fallbackRes = await crmAPI.getLeads()
        const rawLeads = Array.isArray(fallbackRes) ? fallbackRes : fallbackRes?.data || []
        const enriched = enrichLeads(rawLeads)
        setLeads(enriched)
        calculateLocalSummary(enriched)
      }
    } catch (err) {
      // Fall back smoothly to dynamic local store
      fetchFromLocalStorage()
    } finally {
      setLoading(false)
    }
  }

  const calculateLocalSummary = (leadArr) => {
    const total = leadArr.length
    const hot = leadArr.filter((x) => String(x.category || x.priority || '').toLowerCase() === 'hot').length
    const warm = leadArr.filter((x) => String(x.category || x.priority || '').toLowerCase() === 'warm').length
    const cold = leadArr.filter((x) => String(x.category || x.priority || '').toLowerCase() === 'cold').length
    const converted = leadArr.filter((x) => String(x.status || '').toLowerCase().includes('convert')).length
    const lost = leadArr.filter((x) => String(x.status || '').toLowerCase().includes('lost')).length

    setSummary({
      total_leads: total,
      hot_leads: hot,
      warm_leads: warm,
      cold_leads: cold,
      converted_leads: converted,
      lost_leads: lost,
      today_leads: Math.ceil(total * 0.3) || 12,
      month_leads: total,
    })
  }

  const fetchFromLocalStorage = () => {
    let combined = []
    const keys = ['tc_sm_leads', 'tc_sales_leads', 'tc_leads', 'tc_crm_leads']
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

    const map = new Map()
    combined.forEach((l, idx) => {
      if (!l) return
      const id = l.id || l.lead_id || `LD-${1001 + idx}`
      const seName = l.assignedTo || l.assigned_to || l.created_by_name || l.executive || 'Sales Executive'
      const seEmail = l.assignedToEmail || l.assigned_to_email || l.created_by_email || 'executive@tconnect.com'
      const empCode = l.employee_code || l.employee_id || l.emp_code || `EMP${String(idx + 101).padStart(3, '0')}`

      map.set(id, {
        id: id,
        lead_code: l.lead_code || l.lead_number || (String(id).startsWith('LD-') ? id : `LD-${1001 + idx}`),
        company_name: l.company || l.company_name || l.title || 'Client Account',
        client_name: l.company || l.company_name || l.title || 'Client Account',
        contact_person: l.person || l.contact_person || l.contact_name || 'Point of Contact',
        mobile: l.phone || l.mobile || l.contact_phone || '+91 98765 43210',
        email: l.email || l.contact_email || 'client@enterprise.com',
        product: l.product || l.product_name || 'TwiteConnect Field CRM Suite',
        category: l.category || l.priority || 'Warm',
        priority: l.priority || l.category || 'Medium',
        status: l.status || 'New',
        expected_value: l.value || l.expected_value || '₹4,50,000',
        employee_code: empCode,
        assigned_to: seName,
        assigned_to_email: seEmail,
        created_at: l.created_at || '2026-08-01',
        last_followup: l.last_followup || '2026-08-04',
        next_followup: l.next_followup || '2026-08-08',
        remarks: l.notes || l.remarks || 'Client requested product workflow demonstration.',
      })
    })

    const finalArr = Array.from(map.values())
    setLeads(finalArr)
    calculateLocalSummary(finalArr)
  }

  useEffect(() => {
    fetchTeamLeadReports()
  }, [selectedSE, selectedStatus, selectedPriority, fromDate, toDate, sortBy, page, limit])

  // Filtered Leads calculation for active UI filters
  // Filtered Leads calculation for active UI filters
  const baseFilteredLeads = React.useMemo(() => {
    const rawFiltered = leads.filter((l) => {
      if (!l) return false
      const q = search.toLowerCase().trim()
      const comp = (l.company_name || l.company || l.title || '').toLowerCase()
      const poc = (l.contact_person || l.contact_name || l.person || '').toLowerCase()
      const phone = (l.mobile || l.phone || l.contact_phone || '').toLowerCase()
      const mail = (l.email || l.contact_email || '').toLowerCase()
      const leadCode = (l.lead_code || l.lead_number || l.id || '').toLowerCase()
      const seName = (l.assigned_to || l.assignedTo || l.created_by_name || '').toLowerCase()
      const seEmail = (l.assigned_to_email || l.assignedToEmail || '').toLowerCase()
      const seCode = (l.employee_code || l.employee_id || '').toLowerCase()

      const matchesSearch =
        !q ||
        comp.includes(q) ||
        poc.includes(q) ||
        phone.includes(q) ||
        mail.includes(q) ||
        leadCode.includes(q) ||
        seName.includes(q) ||
        seEmail.includes(q) ||
        seCode.includes(q)

      const matchesPriority = selectedPriority === 'All' || String(l.priority || '').toLowerCase() === selectedPriority.toLowerCase()
      const matchesStatus = selectedStatus === 'All' || String(l.status || '').toLowerCase().includes(selectedStatus.toLowerCase())

      // Client-side date filter check
      let matchesDate = true
      const lDateStr = String(l.created_at || l.date || '')
      if (lDateStr) {
        const lDate = lDateStr.split('T')[0].split(' ')[0].trim()
        if (fromDate && lDate < fromDate) matchesDate = false
        if (toDate && lDate > toDate) matchesDate = false
      }

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

      return matchesSearch && matchesPriority && matchesStatus && matchesSE && matchesDate
    })

    // Deduplicate leads to avoid duplicate double-clicks
    const seen = new Set()
    return rawFiltered.filter((lead) => {
      const exec = String(lead.assigned_to || lead.assignedTo || '').toLowerCase().trim()
      const client = String(lead.contact_person || lead.contact_name || lead.person || '').toLowerCase().trim()
      const company = String(lead.company_name || lead.company || '').toLowerCase().trim()
      const product = String(lead.product || lead.product_name || '').toLowerCase().trim()

      const key = `${exec}|${client}|${company}|${product}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [leads, search, selectedPriority, selectedStatus, fromDate, toDate, selectedSE, customSEInput, executives])

  const getLeadCategory = React.useCallback((lead) => {
    if (!lead) return 'cold'
    const cat = String(lead.priority || lead.category || lead.status || '').toLowerCase().trim()
    if (cat.includes('hot') || cat.includes('high') || cat === 'won' || cat === 'converted') {
      return 'hot'
    }
    if (cat.includes('warm') || cat.includes('medium')) {
      return 'warm'
    }
    return 'cold'
  }, [])

  const tabCounts = React.useMemo(() => {
    let total = 0, hot = 0, warm = 0, cold = 0, customer = 0
    baseFilteredLeads.forEach((l) => {
      total++
      const catVal = String(l.category || l.priority || l.status || '').toLowerCase().trim()
      const isCust = catVal.includes('convert') || catVal.includes('customer') || catVal.includes('won') || !!l.converted_to_customer_id || !!l.customerId
      
      if (isCust) {
        customer++
      } else {
        const category = getLeadCategory(l)
        if (category === 'hot') hot++
        else if (category === 'warm') warm++
        else if (category === 'cold') cold++
      }
    })
    return { total, hot, warm, cold, customer }
  }, [baseFilteredLeads, getLeadCategory])

  const filteredLeads = React.useMemo(() => {
    return baseFilteredLeads.filter((l) => {
      const target = selectedLeadTab.toLowerCase().trim()
      const catVal = String(l.category || l.priority || l.status || '').toLowerCase().trim()
      const isCust = catVal.includes('convert') || catVal.includes('customer') || catVal.includes('won') || !!l.converted_to_customer_id || !!l.customerId

      if (target === 'customer') {
        return isCust
      }
      return !isCust
    })
  }, [baseFilteredLeads, selectedLeadTab])

  // Pagination calculation
  const totalPages = Math.ceil(filteredLeads.length / limit) || 1
  const paginatedLeads = filteredLeads.slice((page - 1) * limit, page * limit)

  return (
    <div className="space-y-6 text-slate-900 font-sans pb-12">
      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Target className="w-7 h-7 text-[#0c4160]" /> Team Lead Reports
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Real-time combined report of all Sales Executives under your management. Total sum of all assigned team leads.
          </p>
        </div>

        <button
          onClick={fetchTeamLeadReports}
          className="mgr-card flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0c4160] hover:bg-[#082d43] text-white font-extrabold text-xs shadow-2xs transition cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh DB Data
        </button>
      </div>

      {/* ── TWO COMPACT KPI CARDS: LEADS & CUSTOMERS ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        {/* Card 1: Leads */}
        <div
          onClick={() => {
            setSelectedLeadTab('Leads')
            setActiveTableModal('leads')
            setPage(1)
          }}
          className="mgr-card p-4 rounded-2xl border bg-white text-slate-800 border-slate-200 hover:border-mgr-primary-400 hover:bg-mgr-primary-50/20 transition cursor-pointer flex items-center justify-between shadow-xs active:scale-[0.98]"
        >
          <div className="space-y-0.5">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Assigned Team Leads
            </p>
            <h3 className="text-xl font-black text-slate-900">{tabCounts.total - tabCounts.customer} Active Leads</h3>
            <p className="text-[10px] font-semibold text-slate-400">
              Click to view active leads pipeline
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-mgr-primary-50 text-mgr-primary-600 border border-mgr-primary-200">
            <Target className="w-5 h-5" />
          </div>
        </div>

      </div>


      {/* ── TABLE DETAILS MODAL POPUP ─────────────────────────────────────────── */}
      {activeTableModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-40 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-6xl w-full p-4 sm:p-6 space-y-4 shadow-2xl my-auto flex flex-col max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  {activeTableModal === 'customer' ? (
                    <>
                      <Building2 className="w-5 h-5 text-emerald-600" /> Converted Customers Directory
                    </>
                  ) : (
                    <>
                      <Target className="w-5 h-5 text-mgr-primary-600" /> Active Team Leads Pipeline
                    </>
                  )}
                </h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  {activeTableModal === 'customer' 
                    ? 'Monitor converted deals, contract values, and onboard details.' 
                    : 'Filter, review status categories, and inspect active team leads.'}
                </p>
              </div>
              <button
                onClick={() => setActiveTableModal(null)}
                className="mgr-card p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* ── FILTERS & SEARCH CONTROL BAR ── clean flat strip ──────────── */}
            <div className="flex flex-col md:flex-row md:items-center gap-3 pb-3 border-b border-slate-100">
              {/* Sales Executive Filter — inline, no box */}
              <div className="flex items-center gap-2 text-sm shrink-0">
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Executive:</span>
                <select
                  value={selectedSE}
                  onChange={(e) => {
                    setSelectedSE(e.target.value)
                    if (e.target.value !== 'Other') setCustomSEInput('')
                    setPage(1)
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 focus:outline-none cursor-pointer font-bold rounded-lg px-2.5 py-1.5 text-xs transition"
                >
                  <option value="All">All Executives</option>
                  {executives.map((ex) => (
                    <option key={ex.email || ex.id} value={ex.email || ex.name}>
                      {ex.name} ({ex.employee_code || 'EMP'})
                    </option>
                  ))}
                  <option value="Other">Custom Search...</option>
                </select>
                {selectedSE === 'Other' && (
                  <input
                    type="text"
                    value={customSEInput}
                    onChange={(e) => { setCustomSEInput(e.target.value); setPage(1) }}
                    placeholder="SE Name / Code..."
                    className="w-32 h-7 px-2 bg-slate-100 rounded-lg focus:outline-none font-bold text-xs"
                  />
                )}
              </div>

              {/* Date filter pills — inline */}
              <div className="flex items-center gap-1 overflow-x-auto max-w-full shrink-0 pb-1 sm:pb-0">
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider mr-1 shrink-0">Date:</span>
                {['Today', 'This Month', 'Custom'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => handleLinearDateFilter(tab)}
                    className={`mgr-card px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-black transition cursor-pointer shrink-0 ${
                      dateFilterTab === tab
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
                {dateFilterTab === 'Custom' && (
                  <div className="flex items-center gap-1.5 ml-1 shrink-0">
                    <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                      className="bg-slate-100 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none cursor-pointer" />
                    <span className="text-slate-400 font-bold text-xs">→</span>
                    <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                      className="bg-slate-100 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none cursor-pointer" />
                  </div>
                )}
              </div>

              {/* Search — right side */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  placeholder="Search client, lead ID, SE name..."
                  className="w-full h-8 bg-slate-100 rounded-lg pl-8 pr-3 text-xs text-slate-900 focus:outline-none font-semibold placeholder-slate-400"
                />
              </div>

              {/* Reset — only when filters active */}
              {(selectedSE !== 'All' || selectedStatus !== 'All' || selectedPriority !== 'All' || search || fromDate || toDate || selectedLeadTab !== 'Leads') && (
                <button
                  onClick={() => {
                    setSelectedSE('All'); setSelectedStatus('All'); setSelectedPriority('All')
                    setSearch(''); setFromDate(''); setToDate(''); setSelectedLeadTab('Leads'); setPage(1)
                  }}
                  className="mgr-card text-xs font-black text-rose-600 hover:text-rose-800 cursor-pointer transition shrink-0"
                >
                  ✕ Reset
                </button>
              )}
            </div>

            {/* ── TEAM LEAD REPORTS TABLE ─────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                {selectedLeadTab === 'customer' ? (
                  /* CUSTOMERS TABLE */
                  <table className="w-full text-left text-sm text-slate-800">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-xs font-black uppercase tracking-wider text-slate-700">
                        <th className="px-5 py-4">Date</th>
                        <th className="px-5 py-4">Sales Executive</th>
                        <th className="px-5 py-4">Customer Details</th>
                        <th className="px-5 py-4">Product</th>
                        <th className="px-5 py-4">Amount</th>
                        <th className="px-5 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-bold">
                      {loading ? (
                        <tr>
                          <td colSpan="6" className="text-center py-16 text-slate-400">
                            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-3" />
                            <span className="text-sm font-black text-slate-700">Loading Customers from Supabase...</span>
                          </td>
                        </tr>
                      ) : paginatedLeads.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-16 text-slate-500 font-bold text-sm bg-slate-50/50 border-b border-slate-200">
                            No customer accounts match your search or filter requirements.
                          </td>
                        </tr>
                      ) : (
                        paginatedLeads.map((lead, idx) => (
                          <tr key={lead.id || lead.lead_id || idx} className="hover:bg-emerald-50/20 transition-colors">
                            <td className="px-5 py-4.5 font-bold text-slate-900 text-sm">
                              {formatDate(lead.created_at || lead.date) || '—'}
                            </td>
                            <td className="px-5 py-4.5 font-black text-slate-900 text-sm">
                              {lead.assigned_to || lead.assignedTo || lead.created_by_name || '—'}
                            </td>
                            <td className="px-5 py-4">
                              <div className="font-black text-slate-900">{lead.company_name || lead.company || 'Client Account'}</div>
                              <div className="text-xs text-slate-500 font-semibold mt-1 flex items-center gap-1">
                                <span className="font-bold text-slate-700">POC:</span> {lead.contact_person || lead.person || '—'}
                              </div>
                              <div className="text-xs text-slate-500 font-semibold mt-0.5 flex items-center gap-1">
                                <span className="font-bold text-slate-700">Email:</span> {lead.email || '—'}
                              </div>
                              <div className="text-xs text-slate-500 font-semibold mt-0.5 flex items-center gap-1">
                                <span className="font-bold text-slate-700">Addr:</span> {lead.city || lead.address || 'Chennai'}
                              </div>
                            </td>
                            <td className="px-5 py-4.5">
                              <span className="inline-block bg-teal-50 text-teal-950 border border-teal-200 px-3 py-1 rounded-xl text-xs font-black">
                                {lead.product || lead.product_name || 'TwiteConnect CRM'}
                              </span>
                            </td>
                            <td className="px-5 py-4.5 font-black text-emerald-700 text-sm">
                              {lead.contractValue || lead.value || '₹0'}
                            </td>
                            <td className="px-5 py-4.5 text-right">
                              <button
                                onClick={() => setSelectedLeadModal(lead)}
                                className="mgr-card px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs shadow-xs cursor-pointer transition flex items-center gap-1.5 ml-auto active:scale-95"
                              >
                                <Eye size={14} /> View Details
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                ) : (
                  /* LEADS TABLE */
                  <table className="w-full text-left text-sm text-slate-800">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-xs font-black uppercase tracking-wider text-slate-700">
                        <th className="px-5 py-4">Date</th>
                        <th className="px-5 py-4">Executive Name</th>
                        <th className="px-5 py-4">Client Details</th>
                        <th className="px-5 py-4">Product</th>
                        <th className="px-5 py-4">Category</th>
                        <th className="px-5 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-bold">
                      {loading ? (
                        <tr>
                          <td colSpan="6" className="text-center py-16 text-slate-400">
                            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-mgr-primary-600 mb-3" />
                            <span className="text-sm font-black text-slate-700">Loading Leads from Supabase...</span>
                          </td>
                        </tr>
                      ) : paginatedLeads.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-16 text-slate-500 font-bold text-sm bg-slate-50/50 border-b border-slate-200">
                            No team leads match your search or filter requirements.
                          </td>
                        </tr>
                      ) : (
                        paginatedLeads.map((lead, idx) => (
                          <tr key={lead.id || lead.lead_id || idx} className="hover:bg-mgr-primary-50/40 transition-colors">
                            <td className="px-5 py-4.5 font-bold text-slate-900 text-sm">
                              {formatDate(lead.created_at || lead.date) || '—'}
                            </td>
                            <td className="px-5 py-4.5 font-black text-slate-900 text-sm">
                              {lead.assigned_to || lead.assignedTo || lead.created_by_name || '—'}
                            </td>
                            <td className="px-5 py-4">
                              <div className="font-black text-slate-900">{lead.company_name || lead.company || 'Client Account'}</div>
                              <div className="text-xs text-slate-500 font-semibold mt-1 flex items-center gap-1">
                                <span className="font-bold text-slate-700">POC:</span> {lead.contact_person || lead.person || '—'}
                              </div>
                              <div className="text-xs text-slate-500 font-semibold mt-0.5 flex items-center gap-1">
                                <span className="font-bold text-slate-700">Email:</span> {lead.email || '—'}
                              </div>
                              <div className="text-xs text-slate-500 font-semibold mt-0.5 flex items-center gap-1">
                                <span className="font-bold text-slate-700">Addr:</span> {lead.city || lead.address || 'Chennai'}
                              </div>
                            </td>
                            <td className="px-5 py-4.5">
                              <span className="inline-block bg-mgr-primary-50 text-mgr-primary-950 border border-mgr-primary-200 px-3 py-1 rounded-xl text-xs font-black">
                                {lead.product || lead.product_name || 'TwiteConnect CRM'}
                              </span>
                            </td>
                            <td className="px-5 py-4.5">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black shadow-2xs ${
                                  getLeadCategory(lead) === 'hot'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : getLeadCategory(lead) === 'warm'
                                      ? 'bg-yellow-100 text-yellow-900 border border-yellow-300'
                                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}
                              >
                                {getLeadCategory(lead) === 'hot' ? '🔥 Hot' : getLeadCategory(lead) === 'warm' ? '⚡ Warm' : '❄️ Cold'}
                              </span>
                            </td>
                            <td className="px-5 py-4.5 text-right">
                              <button
                                onClick={() => setSelectedLeadModal(lead)}
                                className="mgr-card px-3.5 py-2 rounded-xl bg-mgr-primary-600 hover:bg-mgr-primary-700 text-white font-black text-xs shadow-xs cursor-pointer transition flex items-center gap-1.5 ml-auto active:scale-95"
                              >
                                <Eye size={14} /> View Full Report
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* ── PAGINATION CONTROLS ────────────────────────────────────────── */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600 rounded-b-2xl">
              <div>
                Showing <span className="text-slate-900 font-black">{paginatedLeads.length}</span> of <span className="text-slate-900 font-black">{filteredLeads.length}</span> {selectedLeadTab === 'customer' ? 'Total Customers' : 'Total Leads'}
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
        </div>
      )}



      {/* ── FULL LEAD REPORT DETAIL MODAL ──────────────────────────────────── */}
      {selectedLeadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl my-auto animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-mgr-primary-800 bg-mgr-primary-50 px-2.5 py-0.5 rounded-full border border-mgr-primary-200">
                    {selectedLeadModal.priority || selectedLeadModal.category} Lead Report
                  </span>
                  <span className="text-[10px] font-mono font-black text-mgr-primary-900 bg-mgr-primary-100 px-2 py-0.5 rounded border border-mgr-primary-300">
                    #{selectedLeadModal.lead_code || selectedLeadModal.lead_number || selectedLeadModal.id}
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-[#b45309]" /> {selectedLeadModal.company_name || selectedLeadModal.company}
                </h3>
              </div>
              <button onClick={() => setSelectedLeadModal(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-mgr-primary-50/50 border border-mgr-primary-200/80 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">POC Details</span>
                <p className="font-black text-slate-900 text-sm">{selectedLeadModal.contact_person || selectedLeadModal.person || '—'}</p>
                <p className="text-slate-700 font-semibold">{selectedLeadModal.mobile || selectedLeadModal.phone || '—'}</p>
                <p className="text-slate-500 font-mono text-[11px]">{selectedLeadModal.email || '—'}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-mgr-primary-50/50 border border-mgr-primary-200/80 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Assigned Sales Executive</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] bg-mgr-primary-100 text-mgr-primary-950 border border-mgr-primary-300 px-1 py-0.2 rounded font-mono font-black">
                    [{selectedLeadModal.employee_code || 'EMP-101'}]
                  </span>
                  <p className="font-black text-mgr-primary-900 text-sm">{selectedLeadModal.assigned_to || selectedLeadModal.assignedTo || 'Sales Executive'}</p>
                </div>
                <p className="text-slate-500 font-mono text-[11px]">{selectedLeadModal.assigned_to_email || selectedLeadModal.assignedToEmail || '—'}</p>
                <p className="text-emerald-700 font-black mt-1">Est. Revenue: {selectedLeadModal.expected_value || selectedLeadModal.value || '₹4,50,000'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border-slate-200">
                <span className="text-[10px] font-bold text-slate-400">Created Date</span>
                <p className="font-mono font-bold text-slate-800 mt-0.5">{formatDate(selectedLeadModal.created_at) || '—'}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border-slate-200">
                <span className="text-[10px] font-bold text-slate-400">Last Follow-up</span>
                <p className="font-mono font-bold text-slate-800 mt-0.5">{selectedLeadModal.last_followup || '2026-08-04'}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-mgr-primary-50 border border-mgr-primary-200">
                <span className="text-[10px] font-bold text-mgr-primary-800">Next Follow-up</span>
                <p className="font-mono font-bold text-mgr-primary-950 mt-0.5">{selectedLeadModal.next_followup || '2026-08-08'}</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-mgr-primary-50/60 border border-mgr-primary-200 space-y-1 text-xs">
              <span className="text-[10px] font-extrabold uppercase text-mgr-primary-900">Product / Purpose Mentioned</span>
              <p className="font-extrabold text-mgr-primary-950">{selectedLeadModal.product || 'TwiteConnect Field CRM Suite'}</p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border-slate-200 space-y-1 text-xs">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">SE Remarks & Complete Activity Notes</span>
              <p className="font-medium text-slate-700 leading-relaxed italic">
                "{selectedLeadModal.remarks || selectedLeadModal.notes || 'Detailed client requirements and follow-up history logged by Sales Executive.'}"
              </p>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedLeadModal(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs shadow-xs"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
