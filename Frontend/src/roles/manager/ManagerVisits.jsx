import React, { useState, useEffect, useMemo } from 'react'
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
  const [dateFilterTab, setDateFilterTab] = useState('All') // 'All' | 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Custom'

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
    } else if (tab === 'This Week') {
      // Monday of current week
      const day = now.getDay() // 0=Sun, 1=Mon...
      const diffToMon = (day === 0 ? -6 : 1 - day)
      const monday = new Date(now)
      monday.setDate(now.getDate() + diffToMon)
      setFromDate(monday.toISOString().split('T')[0])
      setToDate(todayStr)
    } else if (tab === 'This Month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      setFromDate(firstDay.toISOString().split('T')[0])
      setToDate(todayStr)
    } else if (tab === 'All') {
      setFromDate('')
      setToDate('')
    } else if (tab === 'Custom') {
      // Keep existing dates; user will set them manually
    }
    setPage(1)
  }

  // Pagination State
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  // Active card filter state (which top card is selected, defaults to 'scheduled')
  const [activeCard, setActiveCard] = useState('scheduled') // null | 'scheduled' | 'completed' | 'pending' | 'missed' | 'followups'

  // Full Audit Modal State
  const [selectedAuditModal, setSelectedAuditModal] = useState(null)

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
    } catch (e) {}

    setExecutives([])
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

  const getSEAttendanceStatusOnDate = (seEmailOrName, seEmpCode, visitDate, visitStatus) => {
    if (!visitDate) return null
    
    const targetDateStr = formatDate(visitDate)
    const identifier = String(seEmailOrName || '').toLowerCase().trim()
    const codeIdentifier = String(seEmpCode || '').toLowerCase().trim()

    // 1. Filter attendance logs for this executive on this particular day
    const execLogs = attendanceLogs.filter((log) => {
      const logEmpCode = String(log.employee_id || log.employee_code || log.emp_code || log.user_id || '').toLowerCase().trim()
      const logEmail = String(log.email || log.user_email || '').toLowerCase().trim()
      const logName = String(log.name || log.employee_name || log.full_name || '').toLowerCase().trim()
      
      const codeMatch = codeIdentifier && logEmpCode && (codeIdentifier === logEmpCode || logEmpCode.includes(codeIdentifier) || codeIdentifier.includes(logEmpCode))
      const emailMatch = logEmail && identifier && (identifier === logEmail || logEmail.includes(identifier) || identifier.includes(logEmail))
      const nameMatch = logName && identifier && (identifier === logName || logName.includes(identifier) || identifier.includes(logName))

      if (!(codeMatch || emailMatch || nameMatch)) return false

      const logDateStr = formatDate(log.attendance_date || log.date || log.created_at || log.check_in_time || log.punch_in)
      return logDateStr === targetDateStr
    })

    const isCompletedVisit = String(visitStatus || '').toLowerCase().includes('complete')

    if (execLogs.length > 0) {
      const hasPresent = execLogs.some((l) => {
        const st = String(l.status || l.attendance_status || '').toLowerCase().trim()
        return st === 'present' || st === 'late' || st.includes('half') || st.includes('wfh') || st.includes('office') || st.includes('check') || l.check_in_time || l.punch_in
      })
      const hasAbsent = execLogs.some((l) => {
        const st = String(l.status || l.attendance_status || '').toLowerCase().trim()
        return st === 'absent' || st.includes('leave')
      })

      if (hasPresent || isCompletedVisit) {
        return { status: 'PRESENT', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' }
      }
      if (hasAbsent) {
        return { status: 'ABSENT', badgeClass: 'bg-rose-100 text-rose-800 border-rose-300' }
      }
    }

    // 2. Search in localStorage 'tc_attendance_logs'
    try {
      const localLogs = JSON.parse(localStorage.getItem('tc_attendance_logs') || '[]')
      const matchLocal = localLogs.find((log) => {
        const lCode = String(log.employee_id || log.employee_code || log.emp_code || '').toLowerCase().trim()
        const lEmail = String(log.email || log.user_email || '').toLowerCase().trim()
        const lName = String(log.name || log.employee_name || '').toLowerCase().trim()
        
        const cM = codeIdentifier && lCode && (codeIdentifier === lCode || lCode.includes(codeIdentifier))
        const eM = identifier && lEmail && (identifier === lEmail || lEmail.includes(identifier))
        const nM = identifier && lName && (identifier === lName || lName.includes(identifier))
        
        if (!(cM || eM || nM)) return false
        const dStr = formatDate(log.attendance_date || log.date || log.created_at || log.check_in_time)
        return dStr === targetDateStr
      })

      if (matchLocal) {
        const st = String(matchLocal.status || matchLocal.attendance_status || '').toLowerCase().trim()
        if (st === 'absent' || st.includes('leave')) {
          return { status: 'ABSENT', badgeClass: 'bg-rose-100 text-rose-800 border-rose-300' }
        }
        return { status: 'PRESENT', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' }
      }
    } catch (e) {}

    if (isCompletedVisit) {
      return { status: 'PRESENT', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' }
    }

    return null
  }

  const isSEAbsentOnDate = (seEmailOrName, visitDate, seEmpCode = null) => {
    const attInfo = getSEAttendanceStatusOnDate(seEmailOrName, seEmpCode, visitDate)
    return attInfo?.status === 'ABSENT'
  }

  const normalizeVisit = (v, idx = 0) => {
    if (!v) return null
    const id = v.id || v.visit_id || `VST-${1001 + idx}`
    const seName = v.assigned_to || v.assignedTo || v.executive || v.executiveName || v.sales_executive_name || v.employee_name || 'Sales Executive'
    const seEmail = v.assigned_to_email || v.assignedToEmail || v.executiveEmail || v.email || ''
    const empCode = resolveEmployeeCode(seName, seEmail, v.employee_code || v.employee_id || v.emp_code)

    // Resolve scheduled date — fallback to created_at or today if unpopulated in DB
    let rawSchedDate = v.visit_date || v.visitDate || v.scheduledDate || v.date || ''
    if (!rawSchedDate && v.created_at) {
      rawSchedDate = String(v.created_at).split('T')[0]
    }
    if (!rawSchedDate) {
      rawSchedDate = new Date().toISOString().split('T')[0]
    }

    // Resolve scheduled time — prefer visit_time/time, fallback to 10:00 AM
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
  // Filtered calculation
  const filteredVisits = useMemo(() => {
    const rawFiltered = visits.filter((v) => {
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

      // Client-side date filter check
      let matchesDate = true
      const vDateStr = String(v.visit_date || v.visitDate || v.date || '')
      if (vDateStr) {
        let vDate = vDateStr.split('T')[0].split(' ')[0]
        if (vDate.includes('/')) {
          const parts = vDate.split('/')
          if (parts.length === 3) {
            if (parts[2].length === 4) {
              vDate = `${parts[2]}-${parts[1]}-${parts[0]}`
            } else if (parts[0].length === 4) {
              vDate = `${parts[0]}-${parts[1]}-${parts[2]}`
            }
          }
        }
        if (fromDate && vDate < fromDate) matchesDate = false
        if (toDate && vDate > toDate) matchesDate = false
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

      return matchesSearch && matchesVisitStatus && matchesLeadStatus && matchesPriority && matchesSE && matchesDate
    })

    // Deduplicate visits to prevent showing repeated records
    const seen = new Set()
    return rawFiltered.filter((v) => {
      const exec = String(v.assigned_to || v.assigned_to_email || '').toLowerCase().trim()
      const client = String(v.customer_name || v.company || '').toLowerCase().trim()
      const date = String(v.visit_date || '').toLowerCase().trim()
      const time = String(v.visit_time || '').toLowerCase().trim()
      const summary = String(v.discussion_summary || '').toLowerCase().trim()

      const key = `${exec}|${client}|${date}|${time}|${summary}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [visits, search, selectedSE, selectedVisitStatus, selectedLeadStatus, selectedPriority, customSEInput, executives, fromDate, toDate])

  useEffect(() => {
    calculateLocalSummary(filteredVisits)
  }, [filteredVisits])


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
        <div
          onClick={() => setActiveCard(activeCard === 'scheduled' ? null : 'scheduled')}
          className={`mgr-card p-3.5 rounded-xl shadow-2xs space-y-1 cursor-pointer transition hover:scale-[1.02] active:scale-[0.98] ${activeCard === 'scheduled' ? 'bg-mgr-primary-300 border-2 border-mgr-primary-600 ring-2 ring-mgr-primary-400/40' : 'bg-mgr-primary-50 border border-mgr-primary-300'}`}
        >
          <span className="text-[10px] font-black uppercase tracking-wider text-mgr-primary-900">Today's Scheduled</span>
          <h2 className="text-2xl font-black text-mgr-primary-950">{summary.scheduled_today}</h2>
          <p className="text-[10px] text-mgr-primary-800 font-semibold">{activeCard === 'scheduled' ? '▼ Showing list' : 'Tap to view list'}</p>
        </div>

        {/* 2. Today's Completed Visits */}
        <div
          onClick={() => setActiveCard(activeCard === 'completed' ? null : 'completed')}
          className={`mgr-card p-3.5 rounded-xl shadow-2xs space-y-1 cursor-pointer transition hover:scale-[1.02] active:scale-[0.98] ${activeCard === 'completed' ? 'bg-emerald-200 border-2 border-emerald-600 ring-2 ring-emerald-400/40' : 'bg-emerald-50 border border-emerald-200'}`}
        >
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Completed Visits</span>
          <h2 className="text-2xl font-black text-emerald-950">{summary.completed_today}</h2>
          <p className="text-[10px] text-emerald-700 font-semibold">{activeCard === 'completed' ? '▼ Showing list' : 'Tap to view list'}</p>
        </div>

        {/* 3. Pending Visits */}
        <div
          onClick={() => setActiveCard(activeCard === 'pending' ? null : 'pending')}
          className={`mgr-card p-3.5 rounded-xl shadow-2xs space-y-1 cursor-pointer transition hover:scale-[1.02] active:scale-[0.98] ${activeCard === 'pending' ? 'bg-mgr-accent-200 border-2 border-mgr-accent-600 ring-2 ring-mgr-accent-400/40' : 'bg-mgr-accent-50 border border-mgr-accent-200'}`}
        >
          <span className="text-[10px] font-black uppercase tracking-wider text-mgr-accent-800">Pending Visits</span>
          <h2 className="text-2xl font-black text-mgr-accent-950">{summary.pending_visits}</h2>
          <p className="text-[10px] text-mgr-accent-700 font-semibold">{activeCard === 'pending' ? '▼ Showing list' : 'Tap to view list'}</p>
        </div>

        {/* 4. Missed Visits */}
        <div
          onClick={() => setActiveCard(activeCard === 'missed' ? null : 'missed')}
          className={`mgr-card p-3.5 rounded-xl shadow-2xs space-y-1 cursor-pointer transition hover:scale-[1.02] active:scale-[0.98] ${activeCard === 'missed' ? 'bg-rose-100 border-2 border-rose-500 ring-2 ring-rose-400/40' : 'bg-slate-50 border-slate-200'}`}
        >
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">Missed Visits</span>
          <h2 className="text-2xl font-black text-slate-800">{summary.missed_visits}</h2>
          <p className="text-[10px] text-slate-500 font-semibold">{activeCard === 'missed' ? '▼ Showing list' : 'Tap to view list'}</p>
        </div>

        {/* 5. Follow Ups Required */}
        <div
          onClick={() => setActiveCard(activeCard === 'followups' ? null : 'followups')}
          className={`mgr-card p-3.5 rounded-xl shadow-2xs space-y-1 cursor-pointer transition hover:scale-[1.02] active:scale-[0.98] ${activeCard === 'followups' ? 'bg-mgr-secondary-300 border-2 border-mgr-secondary-600 ring-2 ring-mgr-secondary-400/40' : 'bg-mgr-secondary-50 border border-mgr-secondary-200'}`}
        >
          <span className="text-[10px] font-black uppercase tracking-wider text-mgr-secondary-800">Follow Ups Required</span>
          <h2 className="text-2xl font-black text-mgr-secondary-950">{summary.followups}</h2>
          <p className="text-[10px] text-mgr-secondary-700 font-semibold">{activeCard === 'followups' ? '▼ Showing list' : 'Tap to view list'}</p>
        </div>
      </div>

      {/* ── VISIT CARD LIST (shows when a summary card is clicked) ─────────── */}
      {activeCard && (() => {
        const todayStr = new Date().toISOString().split('T')[0]
        const cardConfig = {
          scheduled: {
            label: "Today's Scheduled Visits",
            filter: (v) => {
              const vDate = getYYYYMMDD(v.visit_date || v.scheduledDate || v.date)
              const statusStr = String(v.visit_status || v.status || '').toLowerCase()
              return vDate === todayStr || (!vDate && statusStr.includes('schedule'))
            },
            accent: 'mgr-primary',
            icon: '📅',
          },
          completed: {
            label: 'Completed Visits',
            filter: (v) => String(v.visit_status || v.status || '').toLowerCase().includes('complete'),
            accent: 'emerald',
            icon: '✅',
          },
          pending: {
            label: 'Pending Visits',
            filter: (v) => {
              const vDate = getYYYYMMDD(v.visit_date || v.scheduledDate || v.date)
              const statusStr = String(v.visit_status || v.status || '').toLowerCase()
              const isCompleted = statusStr.includes('complete')
              const isMissedStatus = statusStr.includes('miss') || statusStr.includes('cancel')
              return !isCompleted && !isMissedStatus && (!vDate || vDate >= todayStr)
            },
            accent: 'mgr-accent',
            icon: '🔄',
          },
          missed: {
            label: 'Missed Visits',
            filter: (v) => {
              const vDate = getYYYYMMDD(v.visit_date || v.scheduledDate || v.date)
              const statusStr = String(v.visit_status || v.status || '').toLowerCase()
              const isCompleted = statusStr.includes('complete')
              const isMissedStatus = statusStr.includes('miss') || statusStr.includes('cancel')
              return !isCompleted && ((vDate && vDate < todayStr) || isMissedStatus)
            },
            accent: 'rose',
            icon: '⚠️',
          },
          followups: {
            label: 'Follow-Up Required',
            filter: (v) => String(v.lead_status || '').toLowerCase().includes('follow'),
            accent: 'mgr-secondary',
            icon: '🔔',
          },
        }
        const cfg = cardConfig[activeCard]
        const listVisits = filteredVisits.filter(cfg.filter)
        return (
          <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                {cfg.icon} {cfg.label}
                <span className="ml-1 text-xs font-bold bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{listVisits.length} visits</span>
              </h2>
              <button
                onClick={() => setActiveCard(null)}
                className="text-xs font-bold text-slate-400 hover:text-slate-700 transition flex items-center gap-1"
              >
                <X size={14} /> Close
              </button>
            </div>

            {loading ? (
              <div className="py-16 text-center text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-mgr-primary-500 mb-3" />
                <p className="text-sm font-bold">Loading visits...</p>
              </div>
            ) : listVisits.length === 0 ? (
              <div className="py-16 text-center text-slate-400 bg-white border border-slate-200 rounded-3xl">
                <p className="text-sm font-bold">No visits found in this category.</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-4">Client / Company</th>
                        <th className="py-3 px-4">Assigned Executive</th>
                        <th className="py-3 px-4">Location / Area</th>
                        <th className="py-3 px-4">Purpose & Summary</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {listVisits.map((visit, idx) => {
                        const isComplete = String(visit.visit_status || '').toLowerCase().includes('complete')
                        const isSched = String(visit.visit_status || '').toLowerCase().includes('schedule')
                        const isMissed = String(visit.visit_status || '').toLowerCase().includes('miss') || String(visit.visit_status || '').toLowerCase().includes('cancel')
                        const isAbsent = (isMissed || activeCard === 'missed') && isSEAbsentOnDate(visit.assigned_to_email || visit.assigned_to, visit.visit_date)
                        const formattedDateStr = formatDate(visit.visit_date || visit.scheduledDate || visit.date)

                        return (
                          <tr
                            key={visit.id || idx}
                            onClick={() => setSelectedAuditModal(visit)}
                            className="hover:bg-slate-50/80 transition cursor-pointer group"
                          >
                            {/* Status */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                                isComplete
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  : isSched
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : isMissed
                                  ? 'bg-rose-100 text-rose-900 border-rose-300'
                                  : 'bg-blue-100 text-blue-900 border-blue-300'
                              }`}>
                                {visit.visit_status || 'SCHEDULED'}
                              </span>
                            </td>

                            {/* Date & Time (DD/MM/YYYY) */}
                            <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                              <div className="font-bold text-slate-900">{formattedDateStr}</div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 font-sans">
                                <Clock size={10} /> {visit.visit_time || '10:00 AM'}
                              </div>
                            </td>

                            {/* Client / Company */}
                            <td className="py-3.5 px-4 min-w-[170px]">
                              <div className="font-black text-slate-900 group-hover:text-amber-800 transition">
                                {visit.company || visit.customer_name || 'Enterprise Ltd'}
                              </div>
                              <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                                {visit.poc_name || 'Point of Contact'}
                              </div>
                            </td>

                            {/* Assigned Executive */}
                            <td className="py-3.5 px-4 min-w-[180px]">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-black text-xs shrink-0 border border-amber-300">
                                  {(visit.assigned_to || 'S').charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-black text-slate-800 text-xs truncate">
                                    {visit.assigned_to || 'Sales Executive'}
                                  </div>
                                  <div className="text-[10px] font-mono text-amber-700 font-bold">
                                    {visit.employee_code || ''}
                                  </div>
                                </div>
                                {(() => {
                                  const attInfo = getSEAttendanceStatusOnDate(
                                    visit.assigned_to_email || visit.assigned_to,
                                    visit.employee_code || visit.employee_id,
                                    visit.visit_date || visit.scheduledDate || visit.date,
                                    visit.visit_status
                                  )
                                  if (!attInfo) return null
                                  return (
                                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border shrink-0 ml-auto ${attInfo.badgeClass}`}>
                                      {attInfo.status}
                                    </span>
                                  )
                                })()}
                              </div>
                            </td>

                            {/* Location / Address */}
                            <td className="py-3.5 px-4 max-w-[200px]">
                              <div className="flex items-center gap-1 text-slate-700 font-semibold truncate">
                                <MapPin size={12} className="text-amber-700 shrink-0" />
                                <span className="truncate">{visit.gps_location || visit.address || 'Chennai'}</span>
                              </div>
                            </td>

                            {/* Purpose & Summary */}
                            <td className="py-3.5 px-4 max-w-[220px]">
                              <p className="text-[11px] text-slate-600 font-medium truncate bg-slate-50 border border-slate-200/60 rounded-lg px-2.5 py-1 italic">
                                {visit.products_discussed || visit.discussion_summary || 'Field Visit'}
                              </p>
                            </td>

                            {/* Action */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedAuditModal(visit)
                                }}
                                className="px-3 py-1.5 text-[11px] font-black text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Eye size={12} /> View Full Audit
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* Helper spacer if no card is selected */}
      {!activeCard && (
        <div className="py-20 text-center text-slate-400 bg-white/60 border border-slate-200 border-dashed rounded-3xl">
          <Calendar className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-black text-slate-500">Click on any card above to view the visit list</p>
          <p className="text-xs font-semibold text-slate-400 mt-1">Scheduled, Completed, Pending, Missed, or Follow Ups</p>
        </div>
      )}




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
                {(() => {
                  const attInfo = getSEAttendanceStatusOnDate(
                    selectedAuditModal.assigned_to_email || selectedAuditModal.assigned_to,
                    selectedAuditModal.employee_code || selectedAuditModal.employee_id,
                    selectedAuditModal.visit_date,
                    selectedAuditModal.visit_status
                  )
                  if (!attInfo) return null
                  return (
                    <span className={`absolute top-2 right-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-md border shadow-2xs ${attInfo.badgeClass}`}>
                      {attInfo.status} on Visit Date
                    </span>
                  )
                })()}
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
                <p className="font-mono font-bold text-slate-800 mt-0.5">{formatDate(selectedAuditModal.visit_date)} ({selectedAuditModal.visit_time || '10:30 AM'})</p>
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
