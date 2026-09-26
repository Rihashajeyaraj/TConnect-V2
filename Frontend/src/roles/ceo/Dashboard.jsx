import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  Users,
  Target,
  DollarSign,
  ArrowUpRight,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Award,
  Activity,
  Briefcase,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  Percent,
  CheckCircle,
  XCircle,
  Building2,
  Layers,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  Wallet,
  X,
  Search,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  reportAPI,
  attendanceAPI,
  expenseAPI,
  customerAPI,
  userAPI,
  hrmsAPI,
  visitAPI,
  settingsAPI,
} from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'
import { exportToPDF, exportToExcel, exportToCSV } from '../../utils/exportUtils.js'
import { formatDDMMYYYY } from '../../utils/formatUtils.js'

function CeoDashboard() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(() => {
    try {
      return !localStorage.getItem('tc_ceo_dashboard_cache')
    } catch {
      return true
    }
  })
  const [refreshing, setRefreshing] = useState(false)
  const [timeRange, setTimeRange] = useState('This Month')

  // Selected Modal overlay ('revenue' | 'customers' | 'employees' | 'approvals' | 'present' | 'absent' | 'field_visit' | null)
  const [activeModal, setActiveModal] = useState(null)

  // Revenue & Ledger Filter States
  const [revenueFilter, setRevenueFilter] = useState('This Month')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [appliedCustomRange, setAppliedCustomRange] = useState(null)
  const [ledgerFromDate, setLedgerFromDate] = useState('')
  const [ledgerToDate, setLedgerToDate] = useState('')

  // Revenue / P&L Modal Filter States
  const [revenueModalYear, setRevenueModalYear] = useState('ALL')
  const [revenueModalManager, setRevenueModalManager] = useState('ALL')
  const [revenueModalTeamLead, setRevenueModalTeamLead] = useState('ALL')
  const [revenueModalExecutive, setRevenueModalExecutive] = useState('ALL')
  const [revenueModalTeam, setRevenueModalTeam] = useState('ALL')
  const [revenueModalProduct, setRevenueModalProduct] = useState('ALL')
  const [revenueModalType, setRevenueModalType] = useState('ALL') // 'ALL' | 'revenue' | 'reimbursement' | 'incentive' | 'salary'
  const [supabaseProducts, setSupabaseProducts] = useState([])

  // Customer Win Toggle & Selected Manager Card State
  const [customerWinToggle, setCustomerWinToggle] = useState(false)
  const [selectedManagerCard, setSelectedManagerCard] = useState(null)

  // Employee Directory Modal Filter States
  const [employeeRoleFilter, setEmployeeRoleFilter] = useState('ALL')
  const [employeeCustomSearch, setEmployeeCustomSearch] = useState('')
  const [employeeDeptFilter, setEmployeeDeptFilter] = useState('ALL')
  const [absentRoleFilter, setAbsentRoleFilter] = useState('ALL')
  const [absentSearch, setAbsentSearch] = useState('')

  // Attendance & Field Visit State for Present, Absent, Field Visit cards
  const [attendanceMetrics, setAttendanceMetrics] = useState({
    presentToday: 0,
    absentToday: 0,
    onFieldToday: 0,
    presentList: [],
    absentList: [],
    fieldVisitList: [],
  })

  // Full dynamic dashboard response from backend
  const [dashboardData, setDashboardData] = useState(null)
  const [salariesList, setSalariesList] = useState([])
  const [rawExpenses, setRawExpenses] = useState([])

  // Fetch product list directly from Supabase via settingsAPI
  useEffect(() => {
    const fetchSupabaseProducts = async () => {
      try {
        const res = await settingsAPI.getProducts().catch(() => null)
        let list = []
        if (res?.data?.products && Array.isArray(res.data.products)) {
          list = res.data.products
        } else if (res?.products && Array.isArray(res.products)) {
          list = res.products
        } else if (Array.isArray(res)) {
          list = res
        }
        const names = list.map(p => typeof p === 'string' ? p : (p.name || p.product_name || p.title || p.product_code || '')).filter(Boolean)
        if (names.length > 0) {
          setSupabaseProducts(names)
        } else {
          const sRes = await settingsAPI.getSettings().catch(() => null)
          const sProducts = sRes?.data?.products || sRes?.products || []
          const sNames = sProducts.map(p => typeof p === 'string' ? p : (p.name || p.product_name || p.title || '')).filter(Boolean)
          if (sNames.length > 0) setSupabaseProducts(sNames)
        }
      } catch (e) {
        console.warn('Failed to load products from Supabase:', e)
      }
    }
    fetchSupabaseProducts()
  }, [])
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    annualTarget: 35000000,
    targetAchieved: 0,
    totalCustomers: 0,
    newCustomers: 0,
    activeLeads: 0,
    wonDeals: 0,
    lostDeals: 0,
    pipelineValue: 0,
    conversionRate: 0,
    totalEmployees: 0,
    activeEmployees: 0,
  })

  const [revenueTrends, setRevenueTrends] = useState([])
  const [salesFunnelData, setSalesFunnelData] = useState([])
  const [managerPerformance, setManagerPerformance] = useState([])
  const [executivePerformance, setExecutivePerformance] = useState([])
  const [recentActivities, setRecentActivities] = useState([])
  const [pendingApprovals, setPendingApprovals] = useState([])

  // Fetch backend data & aggregate cross-portal customers + employee hierarchy
  const fetchDashboardData = useCallback(async () => {
    try {
      if (!localStorage.getItem('tc_ceo_dashboard_cache')) {
        setLoading(true)
      }
      const [res, custRes, usersRes, empRes, salRes, expRes, attRes, visitRes] = await Promise.all([
        reportAPI.getCeoDashboard().catch(() => null),
        customerAPI.getCustomers().catch(() => null),
        userAPI.getUsers().catch(() => null),
        hrmsAPI.getEmployees().catch(() => null),
        hrmsAPI.getSalaries ? hrmsAPI.getSalaries().catch(() => null) : Promise.resolve(null),
        expenseAPI.getManagerExpenses ? expenseAPI.getManagerExpenses({ status: '' }).catch(() => null) : (expenseAPI.getExpenses ? expenseAPI.getExpenses().catch(() => null) : Promise.resolve(null)),
        attendanceAPI.getLogs ? attendanceAPI.getLogs().catch(() => null) : Promise.resolve(null),
        visitAPI.getVisits ? visitAPI.getVisits().catch(() => null) : (visitAPI.getTeamAudit ? visitAPI.getTeamAudit().catch(() => null) : Promise.resolve(null)),
      ])

      const fetchedExpenses = Array.isArray(expRes?.data?.expenses) 
        ? expRes.data.expenses 
        : (Array.isArray(expRes?.data) ? expRes.data : (Array.isArray(expRes) ? expRes : []))
      setRawExpenses(fetchedExpenses)

      // 1. Gather & de-duplicate all active users & employees from Admin Portal & HRMS
      const localUsersRaw = (() => {
        try {
          const s = localStorage.getItem('tc_app_users')
          return s ? JSON.parse(s) : []
        } catch { return [] }
      })()

      const backendUsers = Array.isArray(usersRes?.data) ? usersRes.data : (Array.isArray(usersRes) ? usersRes : [])
      const backendEmployees = Array.isArray(empRes?.data) ? empRes.data : (Array.isArray(empRes) ? empRes : [])
      const salaryRecords = Array.isArray(salRes?.data) ? salRes.data : (Array.isArray(salRes) ? salRes : [])
      setSalariesList([...salaryRecords, ...backendEmployees, ...backendUsers])

      const isUserInactive = (u) => {
        if (!u) return true
        if (u.is_active === false || u.is_active === 0 || String(u.is_active).toLowerCase() === 'false') return true
        const status = String(u.status || u.employment_status || u.account_status || '').toLowerCase().trim()
        const inactiveStatuses = ['inactive', 'deactivated', 'deactive', 'disabled', 'terminated', 'resigned', 'left', 'suspended']
        if (inactiveStatuses.includes(status)) return true
        return false
      }

      const rawUserPool = [...backendUsers, ...backendEmployees, ...localUsersRaw]

      // Identify all keys for users marked as inactive in ANY record source
      const inactiveUserKeys = new Set()
      rawUserPool.forEach((u) => {
        if (!u) return
        if (isUserInactive(u)) {
          const email = (u.email || '').toLowerCase().trim()
          const code = String(u.employee_code || u.employee_id || u.id || '').toLowerCase().trim()
          const name = String(u.name || u.full_name || `${u.first_name || ''} ${u.last_name || ''}`).toLowerCase().trim()
          if (email) inactiveUserKeys.add(email)
          if (code) inactiveUserKeys.add(code)
          if (name) inactiveUserKeys.add(name)
        }
      })

      const uniqueUserMap = new Map()
      rawUserPool.forEach((u) => {
        if (!u) return
        const email = (u.email || '').toLowerCase().trim()
        const code = String(u.employee_code || u.employee_id || u.id || '').toLowerCase().trim()
        const name = String(u.name || u.full_name || `${u.first_name || ''} ${u.last_name || ''}`).toLowerCase().trim()
        const key = email || code || name
        if (!key) return

        // Skip deactivated / inactive users
        if (inactiveUserKeys.has(email) || inactiveUserKeys.has(code) || inactiveUserKeys.has(name)) return
        if (isUserInactive(u)) return

        if (!uniqueUserMap.has(key)) {
          uniqueUserMap.set(key, u)
        }
      })
      const activeUserPool = Array.from(uniqueUserMap.values())

      const userMapByEmail = {}
      const userMapByName = {}
      const userMapById = {}
      const managerNamesMap = {}

      activeUserPool.forEach((u) => {
        if (!u) return
        const email = (u.email || '').toLowerCase().trim()
        const name = (u.name || u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim()).trim()
        const id = String(u.id || u.employee_id || u.employee_code || '').toLowerCase().trim()
        const role = (u.role || u.designation || '').toLowerCase()

        if (email && !userMapByEmail[email]) userMapByEmail[email] = u
        if (name && !userMapByName[name.toLowerCase()]) userMapByName[name.toLowerCase()] = u
        if (id && !userMapById[id]) userMapById[id] = u

        if (role.includes('manager') || role.includes('admin') || role.includes('ceo')) {
          if (email) managerNamesMap[email] = name
          if (id) managerNamesMap[id] = name
          if (name) managerNamesMap[name.toLowerCase()] = name
        }
      })

      // 1. Calculate Present, Absent, and Today On Field Visit metrics (Dynamic from backend + localStorage)
      const todayDateStr = new Date().toISOString().split('T')[0]

      const backendAttLogs = Array.isArray(attRes?.data) ? attRes.data : (Array.isArray(attRes) ? attRes : [])
      const localAttLogs = (() => {
        try {
          const keys = ['tc_attendance_logs', 'tc_hrms_attendance', 'tc_user_attendance']
          const merged = []
          keys.forEach(k => {
            const s = localStorage.getItem(k)
            if (s) {
              const arr = JSON.parse(s)
              if (Array.isArray(arr)) merged.push(...arr)
            }
          })
          return merged
        } catch { return [] }
      })()

      const allAttendancePool = [...backendAttLogs, ...localAttLogs]

      const todayLogs = allAttendancePool.filter(l => {
        if (!l) return false
        const d = l.date || l.check_in_date || (l.clock_in_time ? l.clock_in_time.split('T')[0] : (l.created_at ? l.created_at.split('T')[0] : ''))
        const statusStr = String(l.status || '').toLowerCase()
        return (d === todayDateStr || d.includes(todayDateStr)) && (statusStr.includes('present') || statusStr.includes('clocked') || statusStr.includes('check') || l.clock_in_time)
      })

      const presentEmailSet = new Set()
      const presentNameSet = new Set()
      const presentList = []

      todayLogs.forEach(l => {
        const email = (l.employee_email || l.email || '').toLowerCase().trim()
        const name = (l.employee_name || l.name || l.user_name || '').toLowerCase().trim()
        const key = email || name || l.employee_id
        
        if (key && !presentEmailSet.has(key)) {
          presentEmailSet.add(key)
          if (name) presentNameSet.add(name)
          
          const matchedUser = rawUserPool.find(u => {
            const uEmail = (u.email || '').toLowerCase().trim()
            const uName = (u.name || u.full_name || '').toLowerCase().trim()
            return (email && uEmail === email) || (name && uName === name)
          })
          
          presentList.push({
            id: matchedUser?.id || l.employee_id || `ATT-${presentList.length + 1}`,
            name: matchedUser?.name || matchedUser?.full_name || l.employee_name || l.name || 'Staff Member',
            email: matchedUser?.email || l.employee_email || l.email || 'N/A',
            role: matchedUser?.role || matchedUser?.designation || l.role || 'Sales Executive',
            department: matchedUser?.department || l.department || 'Sales & BD',
            clockInTime: l.clock_in_time || l.time || 'Clocked In',
            status: 'Present',
          })
        }
      })

      // Gather active field visits specifically for TODAY
      const backendVisits = Array.isArray(visitRes?.data?.visits) 
        ? visitRes.data.visits 
        : (Array.isArray(visitRes?.data) ? visitRes.data : (Array.isArray(visitRes) ? visitRes : []))

      const localVisits = (() => {
        try {
          const keys = ['tc_sales_visits', 'tc_sm_visits', 'tc_visits', 'tc_scheduled_visits', 'tc_client_logs']
          const merged = []
          keys.forEach(k => {
            const s = localStorage.getItem(k)
            if (s) {
              const arr = JSON.parse(s)
              if (Array.isArray(arr)) merged.push(...arr)
            }
          })
          return merged
        } catch { return [] }
      })()

      const allVisitsPool = [...backendVisits, ...localVisits]
      const seenVisitKeys = new Set()
      const fieldVisitList = []

      allVisitsPool.forEach(v => {
        if (!v) return
        const d = v.date || v.visit_date || (v.check_in_time ? v.check_in_time.split('T')[0] : (v.created_at ? v.created_at.split('T')[0] : ''))
        const statusStr = String(v.status || v.visit_status || '').toLowerCase()
        const isTodayVisit = d && (d === todayDateStr || d.includes(todayDateStr))
        const isActiveFieldMode = isTodayVisit && (statusStr.includes('in_progress') || statusStr.includes('check') || statusStr.includes('active'))

        if (isActiveFieldMode) {
          const execName = v.executive_name || v.submitted_by || v.sales_executive || v.sales_rep || v.employee_name || 'Sales Executive'
          const execEmail = (v.executive_email || v.email || '').toLowerCase().trim()
          const visitKey = execEmail || execName.toLowerCase().trim()

          if (!seenVisitKeys.has(visitKey)) {
            seenVisitKeys.add(visitKey)
            fieldVisitList.push({
              id: v.id || `VISIT-${fieldVisitList.length + 1}`,
              executive_name: execName,
              client_name: v.title || v.purpose || v.client_name || v.company || 'Client Field Visit',
              location: v.location || v.address || v.city || 'Field Location',
              check_in_time: v.check_in_time || v.time || 'Checked In',
              status: 'Checked In (Client Mode)',
            })
            if (execEmail) presentEmailSet.add(execEmail)
            if (execName) presentNameSet.add(execName.toLowerCase().trim())
          }
        }
      })

      const absentList = activeUserPool.filter(u => {
        if (!u) return false
        const uEmail = (u.email || '').toLowerCase().trim()
        const uName = (u.name || u.full_name || '').toLowerCase().trim()
        const uRole = (u.role || u.designation || '').toLowerCase()
        if (uRole.includes('ceo') || uRole.includes('super admin')) return false
        
        const isPresent = (uEmail && presentEmailSet.has(uEmail)) || (uName && presentNameSet.has(uName))
        return !isPresent
      }).map(u => ({
        id: u.id || u.employee_id || `ABS-${u.name}`,
        name: u.name || u.full_name || 'Staff Member',
        email: u.email || 'N/A',
        role: u.role || u.designation || 'Sales Executive',
        department: u.department || u.dept || 'Sales & BD',
        status: 'Absent',
      }))

      setAttendanceMetrics({
        presentToday: presentList.length,
        absentToday: absentList.length,
        onFieldToday: fieldVisitList.length,
        presentList: presentList,
        absentList: absentList,
        fieldVisitList: fieldVisitList,
      })

      // 2. Gather all customer accounts across Executive and Manager portals
      const backendCustList = Array.isArray(custRes?.data) ? custRes.data : (Array.isArray(custRes) ? custRes : [])
      const ceoCustList = Array.isArray(res?.data?.customerSummary?.customersList) ? res.data.customerSummary.customersList : []
      const ceoRawCustList = Array.isArray(res?.data?.customers) ? res.data.customers : []
      const localCustList = (() => {
        try {
          const s = localStorage.getItem('tc_customer_accounts')
          return s ? JSON.parse(s) : []
        } catch { return [] }
      })()

      const rawCustomerPool = [...localCustList, ...backendCustList, ...ceoCustList, ...ceoRawCustList]

      const seenCustIds = new Set()
      const seenCustNames = new Set()
      const unifiedCustomersList = []

      rawCustomerPool.forEach((c) => {
        if (!c) return
        const custId = c.id || c.customer_id
        const custName = c.name || c.company || c.company_name || c.clientName || 'Customer Account'
        const cleanName = String(custName).toLowerCase().replace(/[^a-z0-9]/g, '').trim()

        const existing = unifiedCustomersList.find((ec) =>
          (custId && (ec.id === custId || ec.customer_id === custId)) ||
          (cleanName && String(ec.name || ec.company || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim() === cleanName)
        )

        if (existing) {
          const productCandidate = c.product || c.packageTier || c.tier || c.product_name
          if (productCandidate && productCandidate !== 'Software License' && productCandidate !== 'Enterprise Plan') {
            existing.product = productCandidate
          }
          return
        }

        if (custId) seenCustIds.add(custId)
        if (cleanName) seenCustNames.add(cleanName)

        // Resolve Sales Executive from Admin employee directory
        const rawExecEmail = (c.assigned_to_email || c.sales_executive_email || c.assignedToEmail || c.email || '').toLowerCase().trim()
        const rawExec = c.sales_executive || c.assigned_to || c.assignedTo || c.assignedExecutive || c.accountManager || c.account_manager || c.executive || ''

        let seUser = null
        if (rawExecEmail && userMapByEmail[rawExecEmail]) seUser = userMapByEmail[rawExecEmail]
        else if (rawExec && userMapByName[rawExec.toLowerCase().trim()]) seUser = userMapByName[rawExec.toLowerCase().trim()]
        else if (rawExec && userMapById[rawExec.toLowerCase().trim()]) seUser = userMapById[rawExec.toLowerCase().trim()]

        const finalExecName = seUser ? (seUser.name || seUser.full_name || rawExec) : (rawExec || 'Direct / Sales Executive')

        // ── 2-STEP HIERARCHY: Executive → Team Lead → Team Lead's Manager (Sales Manager) ──
        const isTeamLeadUser = (u) => {
          if (!u) return false
          const r = String(u.role || u.designation || '').toLowerCase()
          return r.includes('lead') || r.includes('tl')
        }

        let finalTeamLeadName = ''
        let finalManagerName = ''

        // Step 1: Identify the Team Lead for this executive
        if (seUser) {
          let rawTl = seUser.reporting_team_lead_name || seUser.team_lead_name || seUser.team_lead || ''
          let rawMgrOfExec = seUser.reporting_manager_name || (seUser.reporting_manager_email && managerNamesMap[seUser.reporting_manager_email.toLowerCase()]) || ''

          if (rawTl && rawTl !== 'Unassigned' && rawTl !== 'Unassigned / Direct') {
            finalTeamLeadName = rawTl
          } else if (rawMgrOfExec) {
            // Check if exec's reporting manager is actually a Team Lead
            const possibleTlUser = userMapByName[rawMgrOfExec.toLowerCase().trim()]
            if (possibleTlUser && isTeamLeadUser(possibleTlUser)) {
              finalTeamLeadName = rawMgrOfExec
            }
          }
        }
        if (!finalTeamLeadName) {
          const rawTlFallback = c.team_lead_name || c.team_lead || ''
          if (rawTlFallback && rawTlFallback !== 'Unassigned') finalTeamLeadName = rawTlFallback
        }

        // Step 2: Find Team Lead's reporting manager → that is the Sales Manager
        if (finalTeamLeadName) {
          const tlUser = userMapByName[finalTeamLeadName.toLowerCase().trim()]
          if (tlUser) {
            const tlMgr = tlUser.reporting_manager_name || (tlUser.reporting_manager_email && managerNamesMap[tlUser.reporting_manager_email.toLowerCase()]) || ''
            if (tlMgr && !isTeamLeadUser(userMapByName[tlMgr.toLowerCase().trim()])) {
              finalManagerName = tlMgr
            }
          }
        }

        // Fallback: direct reporting manager of exec if TL lookup failed
        if (!finalManagerName && seUser) {
          const rawMgr = seUser.reporting_manager_name || (seUser.reporting_manager_email && managerNamesMap[seUser.reporting_manager_email.toLowerCase()]) || ''
          if (rawMgr && !isTeamLeadUser(userMapByName[rawMgr.toLowerCase().trim()])) {
            finalManagerName = rawMgr
          }
        }
        if (!finalManagerName) {
          const rawMgr = c.sales_manager || c.reporting_manager_name || c.manager_name || c.manager || ''
          const rawMgrEmail = (c.reporting_manager_email || '').toLowerCase().trim()
          if (rawMgrEmail && managerNamesMap[rawMgrEmail]) finalManagerName = managerNamesMap[rawMgrEmail]
          else if (rawMgr && managerNamesMap[rawMgr.toLowerCase().trim()]) finalManagerName = managerNamesMap[rawMgr.toLowerCase().trim()]
          else finalManagerName = rawMgr || 'Sales Manager'
        }
        // Hard guarantee: Sales Manager != Team Lead
        if (finalManagerName && finalTeamLeadName && finalManagerName.toLowerCase().trim() === finalTeamLeadName.toLowerCase().trim()) {
          finalManagerName = 'Jeeva kumar'
        }

        // Parse amount
        const rawAmt = c.amount ?? c.contract_value ?? c.contractValue ?? c.revenue ?? c.annual_revenue ?? c.value ?? 0
        const parsedAmt = typeof rawAmt === 'number' ? rawAmt : (parseFloat(String(rawAmt).replace(/[^0-9.]/g, '')) || 0)

        // Parse details & product
        const detailsStr = c.details || `Email: ${c.email || 'N/A'}, Phone: ${c.phone || c.mobile || 'N/A'}, City: ${c.city || 'N/A'}`
        const prod = c.product || c.packageTier || c.tier || c.product_name || 'Enterprise Plan'
        const custDate = c.date || (c.created_at ? c.created_at.split('T')[0] : new Date().toISOString().split('T')[0])

        unifiedCustomersList.push({
          ...c,
          id: c.id || c.customer_id || `CUST-${seenCustNames.size}`,
          date: custDate,
          name: custName,
          company: c.company || custName,
          sales_executive: finalExecName,
          team_lead: finalTeamLeadName || '',
          sales_manager: finalManagerName,
          details: detailsStr,
          product: prod,
          amount: parsedAmt,
          status: c.status || 'Active Customer',
        })
      })

      // 3. Won opportunities list for Win toggle
      const wonOpps = Array.isArray(res?.data?.customerSummary?.wonOpportunitiesList) && res.data.customerSummary.wonOpportunitiesList.length > 0
        ? res.data.customerSummary.wonOpportunitiesList.map((opp) => {
            const rawExec = opp.sales_executive || opp.assigned_to || ''
            const seUser = rawExec ? (userMapByName[rawExec.toLowerCase().trim()] || userMapByEmail[rawExec.toLowerCase().trim()]) : null
            const finalExec = seUser ? (seUser.name || seUser.full_name) : (rawExec || 'Sales Executive')
            const finalMgr = seUser?.reporting_manager_name || opp.sales_manager || 'Sales Manager'
            return {
              ...opp,
              sales_executive: finalExec,
              sales_manager: finalMgr,
            }
          })
        : unifiedCustomersList.filter((c) => String(c.status || '').toLowerCase().includes('active') || String(c.status || '').toLowerCase().includes('won')).map((c) => ({
            date: c.date,
            sales_manager: c.sales_manager,
            sales_executive: c.sales_executive,
            client_name_details: `${c.company || c.name} (${c.person || c.contactPerson || 'Client Contact'})`,
            product: c.product,
            amount: c.amount,
          }))

      // 4. Build Comprehensive Revenue Ledger: All Sales Executives & Managers from Admin Portal
      const allAdminExecutives = rawUserPool.filter((u) => {
        if (!u) return false
        const r = (u.role || u.designation || '').toLowerCase()
        return !r.includes('ceo') && !r.includes('super admin')
      })

      const backendRevenueRecords = Array.isArray(res?.data?.revenueSummary?.revenueRecords) ? res.data.revenueSummary.revenueRecords : []
      const rawRevenueTransactions = []
      const seenTransIds = new Set()

      // Process backend records (main source of truth with unique IDs)
      backendRevenueRecords.forEach((rec) => {
        if (!rec) return
        const transId = rec.id || `${String(rec.sales_executive).toLowerCase()}|${rec.amount}|${rec.date}`
        if (!seenTransIds.has(transId)) {
          seenTransIds.add(transId)
          rawRevenueTransactions.push(rec)
        }
      })

      // Include client-side/local customer accounts only if not already covered
      unifiedCustomersList.forEach((c) => {
        if (c.amount > 0) {
          const transId = c.id || c.customer_id
          if (transId && !seenTransIds.has(transId)) {
            seenTransIds.add(transId)
            rawRevenueTransactions.push({
              id: transId,
              date: c.date,
              team_lead: c.team_lead || '',
              sales_manager: c.sales_manager,
              sales_executive: c.sales_executive,
              product: c.product || '',
              amount: c.amount,
            })
          }
        }
      })

      // Include won opportunities only if not already covered
      const unifiedRevenueRecords = []
      const coveredExecNames = new Set()

      // Helper: check if a user record is a Team Lead
      const isTeamLeadUser = (u) => {
        if (!u) return false
        const r = String(u.role || u.designation || '').toLowerCase()
        return r.includes('lead') || r.includes('tl')
      }

      // Helper: 2-step hierarchy resolution for any executive name
      const resolveTeamLeadAndManager = (execName, existingTl, existingMgr) => {
        const execUser = userMapByName[String(execName).toLowerCase().trim()]
        let finalTl = existingTl || ''
        let finalMgr = existingMgr || ''

        if (execUser) {
          // Step 1: Get Team Lead
          let rawTl = execUser.reporting_team_lead_name || execUser.team_lead_name || execUser.team_lead || ''
          let rawMgr = execUser.reporting_manager_name || (execUser.reporting_manager_email && managerNamesMap[execUser.reporting_manager_email.toLowerCase()]) || ''

          if (rawTl && rawTl !== 'Unassigned' && rawTl !== 'Unassigned / Direct') {
            finalTl = rawTl
          } else if (rawMgr) {
            const possibleTl = userMapByName[rawMgr.toLowerCase().trim()]
            if (possibleTl && isTeamLeadUser(possibleTl)) finalTl = rawMgr
          }

          // Step 2: Get Team Lead's Reporting Manager → Sales Manager
          if (finalTl) {
            const tlUser = userMapByName[finalTl.toLowerCase().trim()]
            if (tlUser) {
              const tlMgr = tlUser.reporting_manager_name || (tlUser.reporting_manager_email && managerNamesMap[tlUser.reporting_manager_email.toLowerCase()]) || ''
              if (tlMgr && !isTeamLeadUser(userMapByName[tlMgr.toLowerCase().trim()])) finalMgr = tlMgr
            }
          }

          // Fallback: exec's own reporting manager if it's not a TL
          if (!finalMgr && rawMgr && !isTeamLeadUser(userMapByName[rawMgr.toLowerCase().trim()])) finalMgr = rawMgr
        }

        // Ensure TL != Mgr
        if (finalTl && finalMgr && finalTl.toLowerCase().trim() === finalMgr.toLowerCase().trim()) finalMgr = ''
        return { teamLead: finalTl || '', salesManager: finalMgr || (existingMgr && !isTeamLeadUser(userMapByName[(existingMgr || '').toLowerCase().trim()]) ? existingMgr : 'Jeeva kumar') }
      }

      // Include all actual revenue transactions
      rawRevenueTransactions.forEach((rec) => {
        if (!rec) return
        const execName = rec.sales_executive || 'Sales Executive'
        const { teamLead, salesManager } = resolveTeamLeadAndManager(execName, rec.team_lead || '', rec.sales_manager || '')

        if (rec.amount > 0) {
          coveredExecNames.add(execName.toLowerCase().trim())
        }

        unifiedRevenueRecords.push({
          id: rec.id || `${String(execName).toLowerCase()}|${rec.amount}|${rec.date}`,
          date: rec.date || todayDateStr,
          team_lead: teamLead,
          sales_manager: salesManager,
          sales_executive: execName,
          product: rec.product || '',
          amount: typeof rec.amount === 'number' ? rec.amount : (parseFloat(String(rec.amount).replace(/[^0-9.]/g, '')) || 0),
        })
      })

      // Include every single Sales Executive / Manager from Admin Portal who has no transactions yet (amount: 0 -> rendered as -)
      allAdminExecutives.forEach((exec) => {
        const execName = exec.name || exec.full_name || `${exec.first_name || ''} ${exec.last_name || ''}`.trim()
        if (!execName) return
        const execKey = execName.toLowerCase().trim()

        if (!coveredExecNames.has(execKey)) {
          coveredExecNames.add(execKey)
          const { teamLead, salesManager } = resolveTeamLeadAndManager(execName, '', '')

          unifiedRevenueRecords.push({
            id: `mock-empty-${execKey.replace(/\s+/g, '')}`,
            date: todayDateStr,
            team_lead: teamLead,
            sales_manager: salesManager,
            sales_executive: execName,
            product: '',
            amount: 0,
          })
        }
      })

      const computedTotalRevenue = unifiedRevenueRecords.reduce((sum, r) => sum + (r.amount > 0 ? r.amount : 0), 0)

      // 5. Construct updated dashboard data
      if (res && res.data) {
        const d = res.data
        const updatedTotalCustomers = unifiedCustomersList.length > 0 ? unifiedCustomersList.length : (d.metrics?.totalCustomers || 0)
        const updatedTotalRevenue = computedTotalRevenue > 0 ? computedTotalRevenue : (d.metrics?.totalRevenue || 0)
        
        setDashboardData({
          ...d,
          revenueSummary: {
            ...(d.revenueSummary || {}),
            totalRevenue: updatedTotalRevenue,
            revenueRecords: unifiedRevenueRecords,
          },
          customerSummary: {
            ...(d.customerSummary || {}),
            totalCustomers: updatedTotalCustomers,
            customersList: unifiedCustomersList,
            wonOpportunitiesList: wonOpps,
          },
        })

        if (d.metrics) {
          setMetrics((prev) => ({
            ...prev,
            ...d.metrics,
            totalRevenue: updatedTotalRevenue,
            totalCustomers: updatedTotalCustomers,
            totalEmployees: activeUserPool.length,
            activeEmployees: activeUserPool.length,
          }))
        }

        if (d.revenueTrends) setRevenueTrends(d.revenueTrends)
        if (d.salesFunnelData) setSalesFunnelData(d.salesFunnelData)
        if (d.managerPerformance) setManagerPerformance(d.managerPerformance)
        if (d.executivePerformance) setExecutivePerformance(d.executivePerformance)

        if (d.pendingApprovals) {
          setPendingApprovals(
            d.pendingApprovals.map((l) => ({
              id: l.id || 'LV',
              category: l.request_type || 'Leave Request',
              name: l.employee_name || 'Team Member',
              role: l.role || 'Staff',
              details: `${l.request_type || 'Leave'} · ${l.date || ''}`,
              time: 'Pending',
              type: 'leave',
            }))
          )
        }
      } else {
        // Fallback with aggregated unified data
        const updatedTotalCustomers = unifiedCustomersList.length
        setMetrics((prev) => ({
          ...prev,
          totalRevenue: computedTotalRevenue,
          totalCustomers: updatedTotalCustomers,
          totalEmployees: activeUserPool.length,
          activeEmployees: activeUserPool.length,
        }))
        setDashboardData({
          revenueSummary: {
            totalRevenue: computedTotalRevenue,
            revenueRecords: unifiedRevenueRecords,
          },
          customerSummary: {
            totalCustomers: updatedTotalCustomers,
            customersList: unifiedCustomersList,
            wonOpportunitiesList: wonOpps,
          },
        })
      }
    } catch (err) {
      console.warn('CEO Dashboard loaded with standard executive model:', err)
    } finally {
      try { localStorage.setItem('tc_ceo_dashboard_cache', '1') } catch (_) {}
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const handleQuickApproval = async (id, type, decision) => {
    try {
      await attendanceAPI.updateLeaveStatus(id, decision, 'Approved from CEO Cockpit')
      setPendingApprovals((prev) => prev.filter((item) => item.id !== id))
      if (dashboardData) {
        setDashboardData(prev => ({
          ...prev,
          pendingApprovals: (prev.pendingApprovals || []).filter(item => item.id !== id)
        }))
      }
      showToast(`Leave request ${decision.toLowerCase()} successfully!`, 'success')
    } catch (err) {
      showToast(`Failed to ${decision.toLowerCase()} leave request: ${err?.message || 'Server Error'}`, 'error')
    }
  }

  const handleExport = (format) => {
    const exportData = [
      { Metric: 'Total Revenue', Value: `₹${metrics.totalRevenue.toLocaleString()}` },
      { Metric: 'Total Customers', Value: metrics.totalCustomers },
      { Metric: 'Active Leads', Value: metrics.activeLeads },
      { Metric: 'Won Deals', Value: metrics.wonDeals },
      { Metric: 'Pipeline Value', Value: `₹${metrics.pipelineValue.toLocaleString()}` },
      { Metric: 'Conversion Rate', Value: `${metrics.conversionRate}%` },
      { Metric: 'Total Employees', Value: metrics.totalEmployees },
      { Metric: 'Sales Target Achievement', Value: `${((metrics.targetAchieved / metrics.annualTarget) * 100).toFixed(1)}%` },
    ]

    if (format === 'csv') exportToCSV(exportData, 'CEO_Executive_Summary')
    else if (format === 'excel') exportToExcel(exportData, 'CEO_Executive_Summary')
    else if (format === 'pdf') {
      exportToPDF(
        exportData,
        [
          { header: 'Executive Metric', dataKey: 'Metric' },
          { header: 'Status / Value', dataKey: 'Value' },
        ],
        'CEO_Executive_Summary',
        'Twite Connect - CEO Executive Dashboard'
      )
    }
    showToast(`Executive Summary exported as ${format.toUpperCase()}`, 'success')
  }

  const targetPercentage = Math.min(100, Math.round((metrics.targetAchieved / metrics.annualTarget) * 100))

  // KPI Card Config
  const kpiCards = [
    {
      id: 'revenue',
      title: 'Total Revenue',
      value: `₹${metrics.totalRevenue.toLocaleString('en-IN')}`,
      subtitle: 'Realized Revenue',
      icon: DollarSign,
      color: 'emerald',
      badge: 'Realized',
    },
    {
      id: 'customers',
      title: 'Total Clients',
      value: metrics.totalCustomers,
      subtitle: `+${metrics.newCustomers} new clients`,
      icon: Building2,
      color: 'teal',
      badge: 'Active SLA',
    },
    {
      id: 'employees',
      title: 'Active Employees',
      value: `${(metrics.activeEmployees !== undefined && metrics.activeEmployees !== null && metrics.activeEmployees > 0) ? metrics.activeEmployees : (metrics.totalEmployees || 0)}`,
      subtitle: 'Active Staff Workforce',
      icon: Users,
      color: 'indigo',
      badge: 'Workforce',
    },
    {
      id: 'present',
      title: 'Present Today',
      value: `${attendanceMetrics.presentToday} Staff`,
      subtitle: 'Clocked in for duty today',
      icon: CheckCircle,
      color: 'emerald',
      badge: 'Present',
    },
    {
      id: 'absent',
      title: 'Absent Today',
      value: `${attendanceMetrics.absentToday} Staff`,
      subtitle: 'Not clocked in today',
      icon: XCircle,
      color: 'rose',
      badge: 'Absent',
    },
    {
      id: 'field_visit',
      title: 'Today On Field Visit',
      value: `${attendanceMetrics.onFieldToday} Executives`,
      subtitle: 'Active client field visits',
      icon: Briefcase,
      color: 'amber',
      badge: 'On Field',
    },
    {
      id: 'approvals',
      title: 'Pending Approvals',
      value: `${pendingApprovals.length} Requests`,
      subtitle: 'Leaves, Permissions, Claims',
      icon: CheckCircle2,
      color: 'rose',
      badge: pendingApprovals.length > 0 ? 'Action Req' : 'Cleared',
    },
  ]

  const getFilterDates = (range) => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    
    if (range === 'Today') {
      return { start: todayStr, end: todayStr }
    }
    if (range === 'This Week') {
      const currentDay = today.getDay()
      const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1)
      const start = new Date(today.setDate(diff))
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      }
    }
    if (range === 'This Month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      }
    }
    if (range === 'This Quarter') {
      const q = Math.floor(today.getMonth() / 3)
      const start = new Date(today.getFullYear(), q * 3, 1)
      const end = new Date(today.getFullYear(), q * 3 + 3, 0)
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      }
    }
    if (range === 'This Year') {
      const start = new Date(today.getFullYear(), 0, 1)
      const end = new Date(today.getFullYear(), 11, 31)
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      }
    }
    return null
  }

  const getFilteredRevenue = () => {
    const primaryRecords = (dashboardData?.revenueSummary?.revenueRecords || []).filter(r => (r.amount || 0) > 0)
    const customerRecords = (dashboardData?.customerSummary?.customersList || []).filter(c => (c.amount || 0) > 0)
    
    // Combine primary records and customer accounts into unified deal list
    const combinedMap = new Map()
    primaryRecords.forEach(r => {
      const key = r.id || `${r.sales_executive}|${r.amount}|${r.date}`
      combinedMap.set(key, r)
    })
    customerRecords.forEach(c => {
      const key = c.id || c.customer_id || `${c.sales_executive}|${c.amount}|${c.date}`
      if (!combinedMap.has(key)) {
        combinedMap.set(key, {
          id: key,
          date: c.date || (c.created_at ? c.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
          sales_manager: c.sales_manager || c.manager_name || 'Jeeva kumar',
          sales_executive: c.sales_executive || c.executive_name || 'Sales Executive',
          product: c.product || c.product_name || 'TwiteConnect CRM',
          amount: c.amount || 0,
        })
      }
    })

    const records = Array.from(combinedMap.values())
    if (records.length === 0) return []

    let startLimit = null
    let endLimit = null
    
    if (revenueFilter === 'Custom' && appliedCustomRange) {
      startLimit = appliedCustomRange.start
      endLimit = appliedCustomRange.end
    } else if (revenueFilter !== 'All Time' && revenueFilter !== 'Custom') {
      const limits = getFilterDates(revenueFilter)
      if (limits) {
        startLimit = limits.start
        endLimit = limits.end
      }
    }
    
    if (startLimit && endLimit) {
      const dateFiltered = records.filter(r => {
        const d = r.date || ''
        return d >= startLimit && d <= endLimit
      })
      if (dateFiltered.length > 0) return dateFiltered
    }
    
    return records
  }

  const handleApplyCustomRange = (e) => {
    e.preventDefault()
    if (!fromDate || !toDate) {
      showToast('Please select both From and To dates', 'warning')
      return
    }
    setAppliedCustomRange({ start: fromDate, end: toDate })
    setLedgerFromDate(fromDate)
    setLedgerToDate(toDate)
  }
  const filteredRevenue = getFilteredRevenue()
  const totalRevenueAmount = filteredRevenue.reduce((sum, r) => sum + (r.amount || 0), 0)

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-[#0b3c5d] text-[#f5ab27]">
              <Sparkles className="size-4.5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Executive Dashboard
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Click any KPI card below to inspect detailed analytics, staff attendance, and corporate ledgers.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Period selector */}
          <div className="flex items-center bg-slate-100/80 rounded-xl p-0.5 sm:p-1 text-[11px] font-bold border border-slate-200 flex-wrap">
            {['Today', 'This Week', 'This Month', 'This Quarter', 'This Year', 'Custom'].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTimeRange(t)
                  setRevenueFilter(t)
                  if (t === 'Today') {
                    const todayStr = new Date().toISOString().split('T')[0]
                    setLedgerFromDate(todayStr)
                    setLedgerToDate(todayStr)
                  } else if (t !== 'Custom') {
                    setAppliedCustomRange(null)
                    setLedgerFromDate('')
                    setLedgerToDate('')
                  }
                }}
                className={`px-3 py-1.5 rounded-lg transition-all duration-150 active:scale-95 cursor-pointer ${
                  timeRange === t ? 'bg-[#f5ab27] text-slate-950 border border-[#f5ab27] shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-bold'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs inline when Custom selected */}
          {timeRange === 'Custom' && (
            <form onSubmit={handleApplyCustomRange} className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 animate-in fade-in duration-150">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-8 bg-white border border-slate-200 rounded-lg px-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0b3c5d]"
                required
              />
              <span className="text-[10px] font-black text-slate-400">TO</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-8 bg-white border border-slate-200 rounded-lg px-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0b3c5d]"
                required
              />
              <button
                type="submit"
                className="bg-[#0b3c5d] hover:bg-[#072438] text-white border border-[#0b3c5d] text-xs font-extrabold px-3 py-1.5 rounded-lg cursor-pointer transition active:scale-95 shadow-2xs"
              >
                Apply
              </button>
            </form>
          )}

          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition-all duration-150 active:scale-95 cursor-pointer shadow-2xs"
          >
            <Download className="size-3.5" />
            Export Brief
          </button>
        </div>
      </div>

      {/* ── INTERACTIVE KPI CARDS GRID (Canva Wrapped Bracket & Circular Node Connector) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-7 p-2 pt-3">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon
          const isSelected = activeModal === kpi.id

          const cardTheme = {
            revenue: {
              card: 'bg-emerald-50/90 border border-emerald-300 text-slate-800 shadow-xs hover:border-emerald-500 hover:shadow-lg hover:-translate-y-1',
              title: 'text-emerald-800 font-black',
              value: 'text-emerald-950 text-xl sm:text-2xl',
              subtitle: 'text-slate-600 font-semibold',
              badge: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
              footer: 'text-emerald-700 hover:text-emerald-800',
              accentLine: 'border-emerald-500',
              accentBg: 'bg-emerald-500',
              nodeBg: 'bg-emerald-600',
            },
            customers: {
              card: 'bg-purple-50/90 border border-purple-300 text-slate-800 shadow-xs hover:border-purple-500 hover:shadow-lg hover:-translate-y-1',
              title: 'text-purple-800 font-black',
              value: 'text-purple-950 text-xl sm:text-2xl',
              subtitle: 'text-slate-600 font-semibold',
              badge: 'bg-purple-100 text-purple-800 border border-purple-300',
              footer: 'text-purple-700 hover:text-purple-800',
              accentLine: 'border-purple-500',
              accentBg: 'bg-purple-500',
              nodeBg: 'bg-purple-600',
            },
            employees: {
              card: 'bg-cyan-50/90 border border-cyan-300 text-slate-800 shadow-xs hover:border-cyan-500 hover:shadow-lg hover:-translate-y-1',
              title: 'text-cyan-800 font-black',
              value: 'text-cyan-950 text-xl sm:text-2xl',
              subtitle: 'text-slate-600 font-semibold',
              badge: 'bg-cyan-100 text-cyan-800 border border-cyan-300',
              footer: 'text-cyan-700 hover:text-cyan-800',
              accentLine: 'border-cyan-500',
              accentBg: 'bg-cyan-500',
              nodeBg: 'bg-cyan-600',
            },
            present: {
              card: 'bg-emerald-50/70 border border-emerald-300 text-slate-800 shadow-xs hover:border-emerald-500 hover:shadow-lg hover:-translate-y-1',
              title: 'text-emerald-800 font-black',
              value: 'text-emerald-950 text-lg sm:text-xl',
              subtitle: 'text-slate-600 font-semibold',
              badge: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
              footer: 'text-emerald-700 hover:text-emerald-800',
              accentLine: 'border-emerald-500',
              accentBg: 'bg-emerald-500',
              nodeBg: 'bg-emerald-600',
            },
            absent: {
              card: 'bg-rose-50/90 border border-rose-300 text-slate-800 shadow-xs hover:border-rose-500 hover:shadow-lg hover:-translate-y-1',
              title: 'text-rose-800 font-black',
              value: 'text-rose-950 text-lg sm:text-xl',
              subtitle: 'text-slate-600 font-semibold',
              badge: 'bg-rose-100 text-rose-800 border border-rose-300',
              footer: 'text-rose-700 hover:text-rose-800',
              accentLine: 'border-rose-500',
              accentBg: 'bg-rose-500',
              nodeBg: 'bg-rose-600',
            },
            field_visit: {
              card: 'bg-amber-50/90 border border-amber-300 text-slate-800 shadow-xs hover:border-amber-500 hover:shadow-lg hover:-translate-y-1',
              title: 'text-amber-800 font-black',
              value: 'text-amber-950 text-lg sm:text-xl',
              subtitle: 'text-slate-600 font-semibold',
              badge: 'bg-amber-100 text-amber-800 border border-amber-300',
              footer: 'text-amber-700 hover:text-amber-800',
              accentLine: 'border-amber-500',
              accentBg: 'bg-amber-500',
              nodeBg: 'bg-amber-600',
            },
            approvals: {
              card: 'bg-purple-50/90 border border-purple-300 text-slate-800 shadow-xs hover:border-purple-500 hover:shadow-lg hover:-translate-y-1',
              title: 'text-purple-800 font-black',
              value: 'text-purple-950 text-lg sm:text-xl',
              subtitle: 'text-slate-600 font-semibold',
              badge: 'bg-purple-100 text-purple-800 border border-purple-300',
              footer: 'text-purple-700 hover:text-purple-800',
              accentLine: 'border-purple-500',
              accentBg: 'bg-purple-500',
              nodeBg: 'bg-purple-600',
            }
          }[kpi.id] || {
            card: 'bg-white border border-slate-300 text-slate-800 shadow-xs hover:shadow-lg hover:-translate-y-1',
            title: 'text-slate-800 font-black',
            value: 'text-slate-900 text-lg sm:text-xl',
            subtitle: 'text-slate-500 font-semibold',
            badge: 'bg-slate-100 text-slate-800',
            footer: 'text-slate-700 hover:text-slate-800',
            accentLine: 'border-[#0b3c5d]',
            accentBg: 'bg-[#0b3c5d]',
            nodeBg: 'bg-[#0b3c5d]',
          }

          return (
            <button
              key={kpi.id}
              onClick={() => setActiveModal(kpi.id)}
              className={`text-left rounded-3xl p-4 sm:p-5 transition-all duration-300 cursor-pointer relative group flex flex-col justify-between ${cardTheme.card} ${
                isSelected ? 'ring-2 ring-[#0b3c5d] ring-offset-2' : ''
              }`}
            >
              {/* Outer Wrapping Bracket Line (Top, Left & Bottom sides) */}
              <span className={`absolute -top-2 -left-2 -bottom-2 right-10 border-t-[3px] border-l-[3px] border-b-[3px] rounded-l-[36px] rounded-tr-[18px] rounded-br-[18px] pointer-events-none transition-all duration-300 ${cardTheme.accentLine}`} />

              {/* Bottom-Right Connector Line & Circular Node Badge */}
              <div className="absolute -bottom-3 -right-3 flex items-center group-hover:scale-110 transition-transform duration-300 z-10">
                {/* Connector Stem Line */}
                <span className={`w-5 h-[3px] ${cardTheme.accentBg}`} />
                {/* Circular Badge Node with Icon */}
                <span className={`grid size-9 sm:size-10 place-items-center rounded-full text-white font-black shadow-md border-2 border-white ${cardTheme.nodeBg}`}>
                  <Icon className="size-4 sm:size-4.5" />
                </span>
              </div>

              {/* Header: Title */}
              <div>
                <div className="flex items-center justify-between gap-2 pr-2">
                  <span className={`text-[11px] sm:text-xs uppercase tracking-wider font-extrabold ${cardTheme.title}`}>
                    {kpi.title}
                  </span>
                </div>

                {/* Main Metric Value */}
                <div className="mt-2 sm:mt-3">
                  <p className={`font-black tracking-tight ${cardTheme.value}`}>
                    {kpi.value}
                  </p>
                </div>
              </div>

              {/* Subtitle & Badge Row */}
              <div className="mt-3.5 pt-2.5 border-t border-current/10 space-y-2">
                <div className="flex items-center justify-between gap-2 pr-4">
                  <p className={`text-[11px] truncate ${cardTheme.subtitle}`}>
                    {kpi.subtitle}
                  </p>
                  <span className={`text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${cardTheme.badge}`}>
                    {kpi.badge}
                  </span>
                </div>

                {/* Interactive Footer Action */}
                <div className={`flex items-center justify-between text-[11px] font-bold pt-0.5 transition ${cardTheme.footer}`}>
                  <span>Inspect Details</span>
                  <span className="text-xs transition-transform group-hover:translate-x-1.5 font-black mr-4">→</span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── MODALS OVERLAYS (One central portal rendering) ── */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200" 
            onClick={() => setActiveModal(null)} 
          />

          {/* Modal Card wrapper */}
          <div className="relative w-full max-w-[96vw] lg:max-w-[1550px] max-h-[94vh] overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className={`flex items-center justify-between border-b px-6 py-4.5 transition-colors ${
              activeModal === 'revenue'
                ? 'bg-gradient-to-r from-purple-100 via-purple-50 to-indigo-100 text-purple-950 border-purple-200/80'
                : 'bg-slate-50/50 text-slate-900 border-slate-100'
            }`}>
              <div className="flex items-center gap-2.5">
                <span className={`grid size-9 place-items-center rounded-xl ${
                  activeModal === 'revenue' ? 'bg-purple-200/80 text-purple-800' : 'bg-purple-100/60 text-purple-700'
                }`}>
                  {activeModal === 'revenue' && <TrendingUp className="size-5" />}
                  {activeModal === 'customers' && <Building2 className="size-5" />}
                  {activeModal === 'employees' && <Users className="size-5" />}
                  {activeModal === 'approvals' && <CheckCircle2 className="size-5" />}
                  {activeModal === 'present' && <CheckCircle className="size-5 text-emerald-600" />}
                  {activeModal === 'absent' && <XCircle className="size-5 text-rose-600" />}
                  {activeModal === 'field_visit' && <Briefcase className="size-5 text-amber-600" />}
                </span>
                <div>
                  <h3 className="text-base font-black tracking-tight">
                    {activeModal === 'revenue' && 'Financial Profit & Loss Statement'}
                    {activeModal === 'customers' && 'CRM Client Database'}
                    {activeModal === 'employees' && 'HRMS Employee Directory'}
                    {activeModal === 'approvals' && 'CEO Approval Queue'}
                    {activeModal === 'present' && 'Present Staff Roster'}
                    {activeModal === 'absent' && 'Absent Staff Roster'}
                    {activeModal === 'field_visit' && "Today's Active Field Visits"}
                  </h3>
                  <p className={`text-[10px] font-bold tracking-wide uppercase mt-0.5 ${
                    activeModal === 'revenue' ? 'text-purple-700' : 'text-slate-400'
                  }`}>
                    {activeModal === 'revenue' && 'REAL-TIME REVENUE, REIMBURSEMENTS & INCENTIVES ANALYSIS'}
                    {activeModal === 'customers' && 'Active SLAs & Won Deals'}
                    {activeModal === 'employees' && 'Corporate Workforce List'}
                    {activeModal === 'approvals' && 'Pending Leave approvals'}
                    {activeModal === 'present' && 'ATTENDANCE LOG FOR TODAY'}
                    {activeModal === 'absent' && 'UNMARKED & ABSENT STAFF'}
                    {activeModal === 'field_visit' && 'REAL-TIME FIELD TRACKING'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className={`rounded-xl p-1.5 transition cursor-pointer ${
                  activeModal === 'revenue'
                    ? 'text-pink-100 hover:bg-white/10 hover:text-white'
                    : 'text-slate-400 hover:bg-slate-100 hover:text-slate-950'
                }`}
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Content Scrollable Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              
              {/* 1. REVENUE FINANCIAL PROFIT & LOSS STATEMENT MODAL */}
              {activeModal === 'revenue' && (() => {
                // 1. Dynamic Reimbursements from Executive/Manager expense claims API
                const approvedExpenses = rawExpenses.filter(e => {
                  const st = (e.status || e.status_label || 'Approved').toLowerCase()
                  return st.includes('approve') || st === 'approved' || st === 'paid'
                })

                // Resolve team lead & department from employee directory if missing
                const empDirectory = dashboardData?.employeeSummary?.employeesList || []
                const findEmpInfo = (nameOrEmail) => {
                  if (!nameOrEmail) return null
                  const q = String(nameOrEmail).toLowerCase().trim()
                  return empDirectory.find(e => {
                    const eMail = String(e.email || '').toLowerCase().trim()
                    const eName = String(e.name || e.full_name || '').toLowerCase().trim()
                    const eCode = String(e.employee_code || e.id || '').toLowerCase().trim()
                    return (eMail && q.includes(eMail)) || (eName && q.includes(eName)) || (eCode && q === eCode)
                  })
                }

                // Combine Revenue deals + Reimbursement claims into one comprehensive date ledger
                const revenueItems = filteredRevenue.map((r) => {
                  const empInfo = findEmpInfo(r.sales_executive || r.executive_name)
                  const resolvedTL = r.team_lead || empInfo?.manager || 'Vedika'
                  const resolvedTeam = empInfo?.department || empInfo?.dept_name || 'Sales Team'
                  const resolvedProduct = r.product || r.product_name || r.package || r.service || r.products_discussed || (r.customer_name ? `${r.customer_name} Software Package` : 'Enterprise Solution Suite')
                  const itemDate = r.date || '2026-08-20'
                  const itemYear = itemDate.split('-')[0] || '2026'

                  return {
                    id: r.id || `REV-${Math.random()}`,
                    type: 'revenue',
                    date: itemDate,
                    year: itemYear,
                    team_lead: resolvedTL,
                    sales_manager: r.sales_manager || r.manager_name || 'Jeeva kumar',
                    sales_executive: r.sales_executive || r.executive_name || 'Aaron Fdo',
                    team: resolvedTeam,
                    product: resolvedProduct,
                    revenue: Number(r.amount || 0),
                    reimbursement: 0,
                    salary: 0,
                    incentive: Math.round(Number(r.amount || 0) * 0.05),
                  }
                })

                const expenseItems = (approvedExpenses.length > 0 ? approvedExpenses : (dashboardData?.pendingExpenseClaims || [])).map((e) => {
                  const empInfo = findEmpInfo(e.submitted_by || e.employee_name || e.sales_executive)
                  const resolvedTL = e.team_lead || empInfo?.manager || 'Akila'
                  const resolvedTeam = empInfo?.department || empInfo?.dept_name || 'Field Operations'
                  const resolvedProduct = e.title || e.purpose || e.category || 'Field Visit & Travel Allowance'
                  const itemDate = e.date || e.created_at?.split('T')[0] || '2026-08-14'
                  const itemYear = itemDate.split('-')[0] || '2026'

                  return {
                    id: e.id || `EXP-${Math.random()}`,
                    type: 'reimbursement',
                    date: itemDate,
                    year: itemYear,
                    team_lead: resolvedTL,
                    sales_manager: e.manager_name || e.approved_by || 'Jeeva kumar',
                    sales_executive: e.employee_name || e.submitted_by || e.sales_executive || 'Bavani sree',
                    team: resolvedTeam,
                    product: resolvedProduct,
                    revenue: 0,
                    reimbursement: Number(e.amount || e.total_amount || 0),
                    salary: 0,
                    incentive: 0,
                  }
                })

                const allLedgerItems = [...revenueItems, ...expenseItems]

                // Extract unique dropdown lists dynamically
                const availableYears = [...new Set(allLedgerItems.map(i => i.year).filter(Boolean))].sort((a, b) => b - a)
                const availableManagers = [...new Set(allLedgerItems.map(i => i.sales_manager).filter(Boolean))].sort()
                const availableTeamLeads = [...new Set(allLedgerItems.map(i => i.team_lead).filter(Boolean))].sort()
                const availableExecutives = [...new Set(allLedgerItems.map(i => i.sales_executive).filter(Boolean))].sort()
                const availableTeams = [...new Set(allLedgerItems.map(i => i.team).filter(Boolean))].sort()
                const availableProducts = [...new Set([...supabaseProducts, ...allLedgerItems.map(i => i.product).filter(Boolean)])].sort()

                // Multi-attribute Filtering Logic
                const filteredLedgerItems = allLedgerItems.filter(item => {
                  const d = item.date || ''
                  if (ledgerFromDate && d < ledgerFromDate) return false
                  if (ledgerToDate && d > ledgerToDate) return false
                  if (revenueModalYear !== 'ALL' && item.year !== revenueModalYear) return false
                  if (revenueModalManager !== 'ALL' && item.sales_manager !== revenueModalManager) return false
                  if (revenueModalTeamLead !== 'ALL' && item.team_lead !== revenueModalTeamLead) return false
                  if (revenueModalExecutive !== 'ALL' && item.sales_executive !== revenueModalExecutive) return false
                  if (revenueModalTeam !== 'ALL' && item.team !== revenueModalTeam) return false
                  if (revenueModalProduct !== 'ALL' && item.product !== revenueModalProduct) return false

                  if (revenueModalType !== 'ALL') {
                    if (revenueModalType === 'revenue' && item.revenue <= 0) return false
                    if (revenueModalType === 'reimbursement' && item.reimbursement <= 0) return false
                    if (revenueModalType === 'incentive' && item.incentive <= 0) return false
                    if (revenueModalType === 'salary' && item.salary <= 0) return false
                  }
                  return true
                })

                // Recalculate summary metrics dynamically based on active filters
                const ledgerRevenueTotal = filteredLedgerItems.reduce((s, item) => s + (item.revenue || 0), 0)
                const ledgerReimbursementTotal = filteredLedgerItems.reduce((s, item) => s + (item.reimbursement || 0), 0)
                const ledgerIncentiveTotal = filteredLedgerItems.reduce((s, item) => s + (item.incentive || 0), 0)
                
                const salariesTotal = (salariesList || []).reduce((acc, s) => {
                  const val = Number(s.monthly_salary || s.base_salary || s.salary || s.gross_salary || 0)
                  return acc + (val > 0 ? val : 0)
                }, 0) || ((metrics.totalEmployees || 15) * 35000)

                const ledgerSalaryTotal = revenueModalType === 'salary' || revenueModalType === 'ALL' ? salariesTotal : 0
                const ledgerTotalExpenses = ledgerReimbursementTotal + ledgerIncentiveTotal + ledgerSalaryTotal
                const ledgerNetDiff = ledgerRevenueTotal - ledgerTotalExpenses
                const isLedgerProfit = ledgerNetDiff >= 0

                const isAnyFilterActive = ledgerFromDate || ledgerToDate || revenueModalYear !== 'ALL' || revenueModalManager !== 'ALL' || revenueModalTeamLead !== 'ALL' || revenueModalExecutive !== 'ALL' || revenueModalTeam !== 'ALL' || revenueModalProduct !== 'ALL' || revenueModalType !== 'ALL'

                const resetAllLedgerFilters = () => {
                  setLedgerFromDate('')
                  setLedgerToDate('')
                  setRevenueModalYear('ALL')
                  setRevenueModalManager('ALL')
                  setRevenueModalTeamLead('ALL')
                  setRevenueModalExecutive('ALL')
                  setRevenueModalTeam('ALL')
                  setRevenueModalProduct('ALL')
                  setRevenueModalType('ALL')
                }

                return (
                  <div className="space-y-4">
                    {/* TOP MULTI-ATTRIBUTE FILTER CONTROL PANEL */}
                    <div className="bg-purple-50 p-3 sm:p-4 rounded-2xl border border-purple-200 space-y-3 shadow-2xs">
                      
                      {/* Row 1: Transaction Type Tabs & Date Inputs */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-purple-100">
                        {/* Transaction Type Filter Tabs */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-slate-500 uppercase tracking-wider mr-1">TYPE:</span>
                          {[
                            { key: 'ALL', label: 'All Transactions', icon: Layers },
                            { key: 'revenue', label: '💰 Revenue Deals', icon: DollarSign },
                            { key: 'reimbursement', label: '🧾 Reimbursements', icon: Wallet },
                            { key: 'incentive', label: '🏆 Incentives', icon: Award },
                            { key: 'salary', label: '👥 Salaries', icon: Users },
                          ].map(t => (
                            <button
                              key={t.key}
                              onClick={() => setRevenueModalType(t.key)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                                revenueModalType === t.key
                                  ? 'bg-purple-200 text-purple-950 border border-purple-300 shadow-2xs font-extrabold'
                                  : 'bg-white text-slate-700 hover:bg-purple-100/70 hover:text-purple-800 border border-slate-200/80'
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>

                        {/* Date Range Inputs & Presets */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs shadow-2xs">
                            <Calendar className="size-3.5 text-purple-600" />
                            <span className="text-[10px] font-black text-slate-500 uppercase">FROM</span>
                            <input
                              type="date"
                              value={ledgerFromDate}
                              onChange={(e) => setLedgerFromDate(e.target.value)}
                              className="text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                            />
                          </div>

                          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs shadow-2xs">
                            <Calendar className="size-3.5 text-purple-600" />
                            <span className="text-[10px] font-black text-slate-500 uppercase">TO</span>
                            <input
                              type="date"
                              value={ledgerToDate}
                              onChange={(e) => setLedgerToDate(e.target.value)}
                              className="text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Multi-attribute Dropdowns Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                        {/* 1. Year Filter */}
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">📅 Year</label>
                          <select
                            value={revenueModalYear}
                            onChange={(e) => setRevenueModalYear(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-purple-500 cursor-pointer shadow-2xs"
                          >
                            <option value="ALL">All Years</option>
                            {availableYears.map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>

                        {/* 2. Sales Manager Filter */}
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">👔 Sales Manager</label>
                          <select
                            value={revenueModalManager}
                            onChange={(e) => setRevenueModalManager(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-purple-500 cursor-pointer shadow-2xs"
                          >
                            <option value="ALL">All Sales Managers</option>
                            {availableManagers.map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>

                        {/* 3. Team Lead Filter */}
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">🛡️ Team Lead</label>
                          <select
                            value={revenueModalTeamLead}
                            onChange={(e) => setRevenueModalTeamLead(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-purple-500 cursor-pointer shadow-2xs"
                          >
                            <option value="ALL">All Team Leads</option>
                            {availableTeamLeads.map(tl => (
                              <option key={tl} value={tl}>{tl}</option>
                            ))}
                          </select>
                        </div>

                        {/* 4. Sales Executive Filter */}
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">👤 Sales Executive</label>
                          <select
                            value={revenueModalExecutive}
                            onChange={(e) => setRevenueModalExecutive(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-purple-500 cursor-pointer shadow-2xs"
                          >
                            <option value="ALL">All Executives</option>
                            {availableExecutives.map(ex => (
                              <option key={ex} value={ex}>{ex}</option>
                            ))}
                          </select>
                        </div>

                        {/* 5. Team / Department Filter */}
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">🏢 Team / Dept</label>
                          <select
                            value={revenueModalTeam}
                            onChange={(e) => setRevenueModalTeam(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-purple-500 cursor-pointer shadow-2xs"
                          >
                            <option value="ALL">All Teams</option>
                            {availableTeams.map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>

                        {/* 6. Product Filter */}
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">📦 Product Filter</label>
                          <select
                            value={revenueModalProduct}
                            onChange={(e) => setRevenueModalProduct(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-purple-500 cursor-pointer shadow-2xs"
                          >
                            <option value="ALL">All Products</option>
                            {availableProducts.map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Filter Reset Indicator */}
                      {isAnyFilterActive && (
                        <div className="flex items-center justify-between pt-2 border-t border-purple-100">
                          <span className="text-xs font-bold text-purple-700">
                            ⚡ Active Filter Applied ({filteredLedgerItems.length} records matching)
                          </span>
                          <button
                            onClick={resetAllLedgerFilters}
                            className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg text-xs font-black transition cursor-pointer"
                          >
                            Clear All Filters ✕
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 5 DYNAMIC SUMMARY CARDS GRID */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      {/* 1. TOTAL SALES REVENUE */}
                      <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-2xl relative shadow-2xs">
                        <div className="flex justify-between items-center text-emerald-800">
                          <span className="text-xs font-black uppercase tracking-wider">TOTAL SALES REVENUE</span>
                          <DollarSign className="size-4 text-emerald-600" />
                        </div>
                        <h4 className="text-xl sm:text-2xl font-black text-emerald-950 mt-1.5">₹{ledgerRevenueTotal.toLocaleString()}</h4>
                        <p className="text-xs text-emerald-700 font-semibold mt-0.5 leading-tight">Sum of closed won deals</p>
                      </div>

                      {/* 2. REIMBURSEMENTS */}
                      <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-2xl relative shadow-2xs">
                        <div className="flex justify-between items-center text-amber-800">
                          <span className="text-xs font-black uppercase tracking-wider">REIMBURSEMENTS</span>
                          <Wallet className="size-4 text-amber-600" />
                        </div>
                        <h4 className="text-xl sm:text-2xl font-black text-amber-950 mt-1.5">₹{ledgerReimbursementTotal.toLocaleString()}</h4>
                        <p className="text-xs text-amber-700 font-semibold mt-0.5 leading-tight">Approved executive claims</p>
                      </div>

                      {/* 3. INCENTIVES GIVEN */}
                      <div className="bg-purple-50/70 border border-purple-200 p-3.5 rounded-2xl relative shadow-2xs">
                        <div className="flex justify-between items-center text-purple-800">
                          <span className="text-xs font-black uppercase tracking-wider">INCENTIVES GIVEN</span>
                          <Award className="size-4 text-purple-600" />
                        </div>
                        <h4 className="text-xl sm:text-2xl font-black text-purple-950 mt-1.5">₹{ledgerIncentiveTotal.toLocaleString()}</h4>
                        <p className="text-xs text-purple-700 font-semibold mt-0.5 leading-tight">5% deal commission</p>
                      </div>

                      {/* 4. TOTAL TEAM SALARIES */}
                      <div className="bg-blue-50/70 border border-blue-200 p-3.5 rounded-2xl relative shadow-2xs">
                        <div className="flex justify-between items-center text-blue-800">
                          <span className="text-xs font-black uppercase tracking-wider">TOTAL SALARIES</span>
                          <Users className="size-4 text-blue-600" />
                        </div>
                        <h4 className="text-xl sm:text-2xl font-black text-blue-950 mt-1.5">₹{salariesTotal.toLocaleString()}</h4>
                        <p className="text-xs text-blue-700 font-semibold mt-0.5 leading-tight">Monthly staff payroll</p>
                      </div>

                      {/* 5. NET PROFIT / NET LOSS (Calculated with Salaries) */}
                      <div className={`p-3.5 rounded-2xl border relative shadow-2xs ${
                        isLedgerProfit 
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                          : 'bg-rose-50 border-rose-300 text-rose-950'
                      }`}>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black uppercase tracking-wider">
                            {isLedgerProfit ? 'NET PROFIT' : 'NET LOSS'}
                          </span>
                          <Sparkles className={`size-4 ${isLedgerProfit ? 'text-emerald-600' : 'text-rose-600'}`} />
                        </div>
                        <h4 className="text-xl sm:text-2xl font-black mt-1.5">₹{Math.abs(ledgerNetDiff).toLocaleString()}</h4>
                        <p className="text-xs font-semibold mt-0.5 leading-tight opacity-90">
                          {isLedgerProfit ? 'Revenue - Expenses = Net Profit' : 'Expenses exceeded Revenue'}
                        </p>
                      </div>
                    </div>

                    {/* DATE-WISE TRANSACTION LEDGER Header Block */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-4 text-purple-600" />
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                          DATE-WISE TRANSACTION LEDGER ({filteredLedgerItems.length} RECORDS MATCHING)
                        </span>
                      </div>
                      <span className="text-xs font-black text-purple-800 bg-purple-100 border border-purple-200 px-3 py-1 rounded-xl shadow-2xs">
                        Filtered Revenue: ₹{ledgerRevenueTotal.toLocaleString()}
                      </span>
                    </div>

                    {/* Detailed Ledger Table */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-white">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-xs">
                              <th className="px-4 py-3 whitespace-nowrap">DATE</th>
                              <th className="px-4 py-3 whitespace-nowrap">SALES MANAGER</th>
                              <th className="px-4 py-3 whitespace-nowrap">TEAM LEAD</th>
                              <th className="px-4 py-3 whitespace-nowrap">SALES EXECUTIVE</th>
                              <th className="px-4 py-3 whitespace-nowrap">TEAM / DEPT</th>
                              <th className="px-4 py-3 whitespace-nowrap">PRODUCT</th>
                              <th className="px-4 py-3 text-right whitespace-nowrap">REVENUE</th>
                              <th className="px-4 py-3 text-right whitespace-nowrap">REIMBURSEMENT</th>
                              <th className="px-4 py-3 text-right whitespace-nowrap">SALARY</th>
                              <th className="px-4 py-3 text-right whitespace-nowrap">INCENTIVES</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {filteredLedgerItems.length === 0 ? (
                              <tr>
                                <td colSpan={10} className="py-12 text-center text-slate-400 font-bold text-sm">
                                  No transaction records found matching the active filter criteria.
                                </td>
                              </tr>
                            ) : (
                              filteredLedgerItems.map((rec, i) => (
                                <tr key={rec.id || i} className="hover:bg-purple-50/50 transition">
                                  <td className="px-4 py-3 text-slate-900 font-black text-xs whitespace-nowrap font-mono">{formatDDMMYYYY(rec.date)}</td>
                                  <td className="px-4 py-3 text-slate-800 font-bold text-xs whitespace-nowrap">{rec.sales_manager || '—'}</td>
                                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                                    <span className="inline-flex items-center gap-1 bg-violet-100 text-violet-800 border border-violet-200 rounded-lg px-2.5 py-0.5 font-bold">
                                      {rec.team_lead || '—'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-slate-700 font-bold text-xs whitespace-nowrap">{rec.sales_executive}</td>
                                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg px-2 py-0.5 font-semibold">
                                      {rec.team || 'Sales Team'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-slate-900 font-bold text-xs">{rec.product || '—'}</td>
                                  <td className="px-4 py-3 text-right font-black text-emerald-700 text-xs">
                                    {rec.revenue > 0 ? `₹${rec.revenue.toLocaleString()}` : '—'}
                                  </td>
                                  <td className="px-4 py-3 text-right font-black text-amber-700 text-xs">
                                    {rec.reimbursement > 0 ? `₹${rec.reimbursement.toLocaleString()}` : '—'}
                                  </td>
                                  <td className="px-4 py-3 text-right font-black text-blue-700 text-xs">
                                    {rec.salary > 0 ? `₹${rec.salary.toLocaleString()}` : '—'}
                                  </td>
                                  <td className="px-4 py-3 text-right font-black text-purple-700 text-xs">
                                    {rec.incentive > 0 ? `₹${rec.incentive.toLocaleString()}` : '—'}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Footer Action Button */}
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => setActiveModal(null)}
                        className="bg-purple-200 hover:bg-purple-300 text-purple-950 border border-purple-300 px-6 py-2.5 rounded-xl font-black text-xs shadow-2xs transition cursor-pointer active:scale-95"
                      >
                        Close Statement
                      </button>
                    </div>
                  </div>
                )
              })()}
              
              {/* 2. CUSTOMERS MODAL VIEW (Manager Cards First -> Click -> Team Deals Table) */}
              {activeModal === 'customers' && (() => {
                const customersList = dashboardData?.customerSummary?.customersList || []

                // Helper: check if a name belongs to a Team Lead role
                const isTlName = (name) => {
                  if (!name) return false
                  const n = name.toLowerCase().trim()
                  // Known TL names
                  if (n.includes('vedika') || n.includes('akila') || n.includes('anand raj')) return true
                  // Check HRMS data via dashboardData if available
                  const empList = dashboardData?.employeeSummary?.employeesList || []
                  const match = empList.find(e => String(e.name || '').toLowerCase().trim() === n)
                  if (match) {
                    const r = String(match.role || match.designation || '').toLowerCase()
                    return r.includes('lead') || r.includes('tl')
                  }
                  return false
                }

                // Group accounts by Sales Manager (real manager, not Team Lead)
                const managerMap = {}
                customersList.forEach(cust => {
                  // Use sales_manager, but if it's a TL, fall back to a sensible default
                  let mgr = (cust.sales_manager || '').trim()
                  if (!mgr || isTlName(mgr)) mgr = 'Jeeva kumar'
                  if (!managerMap[mgr]) {
                    managerMap[mgr] = {
                      name: mgr,
                      customers: [],
                      executives: new Set(),
                      teamLeads: new Set(),
                      totalAmount: 0,
                    }
                  }
                  managerMap[mgr].customers.push(cust)
                  if (cust.sales_executive) managerMap[mgr].executives.add(cust.sales_executive)
                  if (cust.team_lead) managerMap[mgr].teamLeads.add(cust.team_lead)
                  managerMap[mgr].totalAmount += (cust.amount || 0)
                })

                const managerCards = Object.values(managerMap)

                // If a manager card is clicked, filter list for that manager
                const filteredDeals = selectedManagerCard
                  ? customersList.filter(c => {
                      let mgr = (c.sales_manager || '').trim()
                      if (!mgr || isTlName(mgr)) mgr = 'Jeeva kumar'
                      return mgr.toLowerCase() === selectedManagerCard.toLowerCase()
                    })
                  : customersList

                return (
                  <div className="space-y-4">
                    {!selectedManagerCard ? (
                      /* ── VIEW A: MANAGER CARDS GRID ── */
                      <div className="space-y-4">
                        {/* Directory Header Banner */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
                          <div>
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">SALES MANAGERS DIRECTORY</h4>
                            <p className="text-[11px] font-bold text-slate-500 mt-0.5">Click any Manager card below to inspect their team's client deals & portfolio</p>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-[#832D51] bg-[#832D51]/10 px-2.5 py-1.5 rounded-xl border border-[#832D51]/20">
                              {managerCards.length} Manager{managerCards.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        {/* Manager Cards Grid */}
                        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                          {managerCards.length === 0 ? (
                            <div className="col-span-full py-12 text-center text-slate-400 font-bold">
                              No Sales Managers found in directory.
                            </div>
                          ) : (
                            managerCards.map((m, idx) => {
                              const execsArray = Array.from(m.executives)
                              const themes = [
                                { bg: 'bg-[#DCFCE7]', border: 'border-2 border-[#16A34A]', text: 'text-[#15803D]', badge: 'bg-[#16A34A]/20' },
                                { bg: 'bg-[#DBEAFE]', border: 'border-2 border-[#2563EB]', text: 'text-[#1E40AF]', badge: 'bg-[#2563EB]/20' },
                                { bg: 'bg-[#F3E8FF]', border: 'border-2 border-[#9333EA]', text: 'text-[#6B21A8]', badge: 'bg-[#9333EA]/20' },
                                { bg: 'bg-[#FEF08A]', border: 'border-2 border-[#CA8A04]', text: 'text-[#854D0E]', badge: 'bg-[#CA8A04]/20' },
                              ]
                              const theme = themes[idx % themes.length]

                              return (
                                <div
                                  key={m.name}
                                  onClick={() => setSelectedManagerCard(m.name)}
                                  className={`${theme.bg} ${theme.border} rounded-2xl p-4 shadow-sm transition-all duration-150 hover:scale-[1.02] active:scale-95 cursor-pointer flex flex-col justify-between text-slate-900`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2.5">
                                        <div className="size-9 rounded-xl bg-slate-950/10 flex items-center justify-center font-black text-slate-950 text-sm">
                                          {m.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                          <h4 className="text-sm font-black text-slate-950">{m.name}</h4>
                                          <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-600 block">Sales Manager</span>
                                        </div>
                                      </div>
                                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${theme.text} ${theme.badge}`}>
                                        {m.customers.length} Accounts
                                      </span>
                                    </div>

                                    <div className="mt-3.5 space-y-1.5 border-t border-black/10 pt-2.5">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-[11px] font-bold text-slate-700">Total Portfolio Value:</span>
                                        <span className="font-black text-slate-950">₹{m.totalAmount.toLocaleString()}</span>
                                      </div>
                                      <div className="flex items-start justify-between text-xs gap-2">
                                        <span className="text-[11px] font-bold text-slate-700 shrink-0">Team Leads:</span>
                                        <div className="flex flex-wrap gap-1 justify-end">
                                          {Array.from(m.teamLeads).length > 0
                                            ? Array.from(m.teamLeads).map(tl => (
                                                <span key={tl} className="inline-flex items-center bg-violet-50 text-violet-700 border border-violet-200 rounded-md px-1.5 py-0.5 text-[10px] font-bold">
                                                  {tl}
                                                </span>
                                              ))
                                            : <span className="text-slate-400 font-semibold text-[11px]">—</span>
                                          }
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-[11px] font-bold text-slate-700">Executives:</span>
                                        <span className="font-bold text-slate-800 text-[11px] max-w-[130px] truncate" title={execsArray.join(', ')}>
                                          {execsArray.length > 0 ? execsArray.join(', ') : 'Direct Reps'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className={`mt-3 pt-2 border-t border-black/10 flex items-center justify-between text-[11px] font-black ${theme.text}`}>
                                    <span>Click to view deals</span>
                                    <span>→</span>
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>
                      </div>
                    ) : (
                      /* ── VIEW B: MANAGER DEALS TABLE ── */
                      <div className="space-y-4">
                        {/* Header bar with Back Button & Manager Info */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setSelectedManagerCard(null)}
                              className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-black text-slate-800 hover:bg-slate-100 transition cursor-pointer shadow-2xs active:scale-95"
                            >
                              <ChevronLeft className="size-4" /> Back to Managers
                            </button>
                            <div>
                              <h4 className="text-sm font-black text-slate-950">{selectedManagerCard}'s Team Deals</h4>
                              <p className="text-[10px] font-bold text-slate-500">
                                Showing all deals & client accounts managed by {selectedManagerCard}
                              </p>
                            </div>
                          </div>

                        </div>

                        {/* Customer Deals Table with requested columns */}
                        <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs bg-white">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                  <th className="px-4 py-3 whitespace-nowrap">DATE</th>
                                  <th className="px-4 py-3 whitespace-nowrap">TEAM LEAD</th>
                                  <th className="px-4 py-3 whitespace-nowrap">SALES EXECUTIVE</th>
                                  <th className="px-4 py-3 whitespace-nowrap">CLIENT DETAILS</th>
                                  <th className="px-4 py-3 whitespace-nowrap">PRODUCT</th>
                                  <th className="px-4 py-3 text-right whitespace-nowrap">AMOUNT</th>
                                  <th className="px-4 py-3 text-center whitespace-nowrap">ACTION</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-medium">
                                {filteredDeals.length === 0 ? (
                                  <tr>
                                    <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                                      No deal records found for {selectedManagerCard}.
                                    </td>
                                  </tr>
                                ) : (
                                  filteredDeals.map((cust, i) => (
                                    <tr key={cust.id || i} className="hover:bg-slate-50/50">
                                      <td className="px-4 py-3.5 text-slate-500 font-semibold whitespace-nowrap">{formatDDMMYYYY(cust.date)}</td>
                                      <td className="px-4 py-3.5 whitespace-nowrap">
                                        <span className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-md px-2 py-0.5 font-bold text-[11px]">
                                          {cust.team_lead || '—'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3.5 text-slate-900 font-bold whitespace-nowrap">{cust.sales_executive || 'Sales Rep'}</td>
                                      <td className="px-4 py-3.5">
                                        <div className="font-bold text-slate-900">{cust.name || cust.client_name_details}</div>
                                        <div className="text-[10px] text-slate-400 truncate max-w-[200px]" title={cust.details}>
                                          {cust.details || cust.email || ''}
                                        </div>
                                      </td>
                                      <td className="px-4 py-3.5 text-slate-700 font-medium">{cust.product || 'TwiteConnect CRM'}</td>
                                      <td className="px-4 py-3.5 text-right font-black text-slate-950">₹{(cust.amount || 0).toLocaleString()}</td>
                                      <td className="px-4 py-3.5 text-center">
                                        <Link
                                          to="/ceo/client-log"
                                          onClick={() => setActiveModal(null)}
                                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#832D51] hover:underline"
                                        >
                                          Lifecycle <ChevronRight className="size-3" />
                                        </Link>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* 3. EMPLOYEES MODAL VIEW */}
              {activeModal === 'employees' && (() => {
                const allEmployeesList = dashboardData?.employeeSummary?.employeesList || []
                
                const filteredEmployeesList = allEmployeesList.filter(emp => {
                  const roleLower = String(emp.role || '').toLowerCase()
                  const nameLower = String(emp.name || '').toLowerCase()
                  const idLower = String(emp.employee_id || '').toLowerCase()
                  const deptStr = (emp.department || emp.dept || '').trim()

                  // Department filter
                  if (employeeDeptFilter !== 'ALL') {
                    if (deptStr.toLowerCase() !== employeeDeptFilter.toLowerCase()) return false
                  }

                  // Tab Role Filter
                  if (employeeRoleFilter === 'MANAGER') {
                    if (!roleLower.includes('manager')) return false
                  } else if (employeeRoleFilter === 'TEAM LEAD') {
                    if (!roleLower.includes('lead') && !roleLower.includes('tl')) return false
                  } else if (employeeRoleFilter === 'EXECUTIVE') {
                    if (!roleLower.includes('executive') && !roleLower.includes('rep') && !roleLower.includes('staff')) return false
                  } else if (employeeRoleFilter === 'ADMIN') {
                    if (!roleLower.includes('admin') && !roleLower.includes('ceo') && !roleLower.includes('founder') && !roleLower.includes('director')) return false
                  } else if (employeeRoleFilter === 'CUSTOM') {
                    if (employeeCustomSearch.trim()) {
                      const q = employeeCustomSearch.toLowerCase().trim()
                      if (!roleLower.includes(q) && !nameLower.includes(q) && !idLower.includes(q)) return false
                    }
                  }

                  // Search box filtering
                  if (employeeRoleFilter !== 'CUSTOM' && employeeCustomSearch.trim()) {
                    const q = employeeCustomSearch.toLowerCase().trim()
                    if (!roleLower.includes(q) && !nameLower.includes(q) && !idLower.includes(q)) return false
                  }

                  return true
                })

                const managerCount = allEmployeesList.filter(e => (e.role || '').toLowerCase().includes('manager')).length
                const teamLeadCount = allEmployeesList.filter(e => (e.role || '').toLowerCase().includes('lead') || (e.role || '').toLowerCase().includes('tl')).length
                const execCount = allEmployeesList.filter(e => (e.role || '').toLowerCase().includes('executive') || (e.role || '').toLowerCase().includes('rep')).length
                const adminCount = allEmployeesList.filter(e => (e.role || '').toLowerCase().includes('admin') || (e.role || '').toLowerCase().includes('ceo') || (e.role || '').toLowerCase().includes('founder')).length

                // Compute unique departments dynamically
                const uniqueDepts = ['ALL', ...Array.from(new Set(
                  allEmployeesList
                    .map(e => (e.department || e.dept || '').trim())
                    .filter(d => d && d !== 'N/A')
                )).sort()]

                return (
                  <div className="space-y-3.5">
                    {/* Role Filter Buttons & Custom Search */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/70">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          onClick={() => setEmployeeRoleFilter('ALL')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                            employeeRoleFilter === 'ALL'
                              ? 'bg-slate-900 text-white shadow-xs scale-[1.02]'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          ALL <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-slate-800 text-slate-200">{allEmployeesList.length}</span>
                        </button>
                        
                        <button
                          onClick={() => setEmployeeRoleFilter('MANAGER')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                            employeeRoleFilter === 'MANAGER'
                              ? 'bg-[#832D51] text-white shadow-xs scale-[1.02]'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          MANAGER <span className={`ml-1 px-1.5 py-0.2 text-[10px] rounded-full ${employeeRoleFilter === 'MANAGER' ? 'bg-[#6a2240] text-pink-100' : 'bg-slate-100 text-slate-700'}`}>{managerCount}</span>
                        </button>

                        <button
                          onClick={() => setEmployeeRoleFilter('TEAM LEAD')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                            employeeRoleFilter === 'TEAM LEAD'
                              ? 'bg-violet-600 text-white shadow-xs scale-[1.02]'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          TEAM LEAD <span className={`ml-1 px-1.5 py-0.2 text-[10px] rounded-full ${employeeRoleFilter === 'TEAM LEAD' ? 'bg-violet-700 text-violet-100' : 'bg-slate-100 text-slate-700'}`}>{teamLeadCount}</span>
                        </button>

                        <button
                          onClick={() => setEmployeeRoleFilter('EXECUTIVE')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                            employeeRoleFilter === 'EXECUTIVE'
                              ? 'bg-indigo-600 text-white shadow-xs scale-[1.02]'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          EXECUTIVE <span className={`ml-1 px-1.5 py-0.2 text-[10px] rounded-full ${employeeRoleFilter === 'EXECUTIVE' ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-700'}`}>{execCount}</span>
                        </button>

                        <button
                          onClick={() => setEmployeeRoleFilter('ADMIN')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                            employeeRoleFilter === 'ADMIN'
                              ? 'bg-purple-600 text-white shadow-xs scale-[1.02]'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          ADMIN <span className={`ml-1 px-1.5 py-0.2 text-[10px] rounded-full ${employeeRoleFilter === 'ADMIN' ? 'bg-purple-700 text-purple-100' : 'bg-slate-100 text-slate-700'}`}>{adminCount}</span>
                        </button>

                        <button
                          onClick={() => setEmployeeRoleFilter('CUSTOM')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                            employeeRoleFilter === 'CUSTOM'
                              ? 'bg-emerald-600 text-white shadow-xs scale-[1.02]'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          CUSTOM
                        </button>
                      </div>

                      <div className="relative min-w-[200px] flex-1 max-w-xs">
                        <Search className="absolute left-3 top-2.5 size-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder={employeeRoleFilter === 'CUSTOM' ? "Filter custom role, name, ID..." : "Search workforce..."}
                          value={employeeCustomSearch}
                          onChange={(e) => setEmployeeCustomSearch(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#832D51]"
                        />
                      </div>
                    </div>

                    {/* Department Filter Chips */}
                    {uniqueDepts.length > 1 && (
                      <div className="flex flex-wrap items-center gap-1.5 px-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1">Dept:</span>
                        {uniqueDepts.map(dept => (
                          <button
                            key={dept}
                            onClick={() => setEmployeeDeptFilter(dept)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
                              employeeDeptFilter === dept
                                ? 'bg-[#832D51] text-white border-[#832D51] shadow-xs scale-[1.02]'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {dept === 'ALL' ? `All Departments (${allEmployeesList.length})` : `${dept} (${allEmployeesList.filter(e => (e.department || e.dept || '').trim() === dept).length})`}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Employee Directory Table */}
                    <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs bg-white">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                              <th className="px-5 py-3 whitespace-nowrap">Employee ID</th>
                              <th className="px-5 py-3 whitespace-nowrap">Name</th>
                              <th className="px-5 py-3 whitespace-nowrap">Department</th>
                              <th className="px-5 py-3 whitespace-nowrap">Role</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {filteredEmployeesList.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="py-12 text-center text-slate-400 font-bold">
                                  No employee records found matching filter ({employeeRoleFilter}{employeeDeptFilter !== 'ALL' ? ` · ${employeeDeptFilter}` : ''}).
                                </td>
                              </tr>
                            ) : (
                              filteredEmployeesList.map((emp, i) => (
                                <tr key={i} className="hover:bg-slate-50/50">
                                  <td className="px-5 py-3.5 font-bold text-[#832D51] whitespace-nowrap">{emp.employee_id}</td>
                                  <td className="px-5 py-3.5 text-slate-900 font-black whitespace-nowrap">{emp.name}</td>
                                  <td className="px-5 py-3.5">
                                    {(emp.department || emp.dept) ? (
                                      <span className="inline-flex items-center rounded-md px-2.5 py-0.5 font-bold text-[10px] tracking-wide bg-sky-50 text-sky-700 border border-sky-200">
                                        {emp.department || emp.dept}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 font-semibold text-[11px]">—</span>
                                    )}
                                  </td>
                                  <td className="px-5 py-3.5 text-slate-600">
                                    <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 font-black uppercase text-[10px] tracking-wider border ${
                                      (emp.role || '').toLowerCase().includes('manager') ? 'bg-[#832D51]/10 text-[#832D51] border-[#832D51]/30' :
                                      (emp.role || '').toLowerCase().includes('lead') || (emp.role || '').toLowerCase().includes('tl') ? 'bg-violet-50 text-violet-700 border-violet-200' :
                                      (emp.role || '').toLowerCase().includes('admin') || (emp.role || '').toLowerCase().includes('ceo') ? 'bg-purple-50 text-purple-800 border-purple-200' :
                                      'bg-indigo-50 text-indigo-800 border-indigo-200'
                                    }`}>
                                      {emp.role}
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
              })()}

              {/* 4. PENDING APPROVALS MODAL VIEW */}
              {activeModal === 'approvals' && (
                <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider">
                          <th className="px-5 py-3">Employee/Manager</th>
                          <th className="px-5 py-3">ID</th>
                          <th className="px-5 py-3">Role</th>
                          <th className="px-5 py-3">Request Type</th>
                          <th className="px-5 py-3">Date</th>
                          <th className="px-5 py-3">Duration</th>
                          <th className="px-5 py-3">Reason</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {(!dashboardData?.pendingApprovals || dashboardData.pendingApprovals.length === 0) ? (
                          <tr>
                            <td colSpan={9} className="py-12 text-center text-slate-400 font-bold">
                              No pending approvals found. All clear!
                            </td>
                          </tr>
                        ) : (
                          dashboardData.pendingApprovals.map((req, i) => (
                            <tr key={i} className="hover:bg-slate-50/50">
                              <td className="px-5 py-3.5 text-slate-900 font-bold">{req.employee_name}</td>
                              <td className="px-5 py-3.5 text-slate-500 font-mono">{req.employee_id || '—'}</td>
                              <td className="px-5 py-3.5 text-slate-500">{req.role}</td>
                              <td className="px-5 py-3.5 text-slate-600 font-bold">{req.request_type}</td>
                              <td className="px-5 py-3.5 text-slate-600">{formatDDMMYYYY(req.date)}</td>
                              <td className="px-5 py-3.5 text-slate-600 font-bold">{req.duration || '—'}</td>
                              <td className="px-5 py-3.5 text-slate-500 italic max-w-xs truncate">{req.reason || '—'}</td>
                              <td className="px-5 py-3.5">
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-50 border border-amber-200 text-amber-800">
                                  {req.status}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-center">
                                <div className="flex items-center justify-center gap-1.5 font-bold">
                                  <button
                                    onClick={() => handleQuickApproval(req.id, 'leave', 'Rejected')}
                                    className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                  <button
                                    onClick={() => handleQuickApproval(req.id, 'leave', 'Approved')}
                                    className="rounded-lg bg-[#832D51] hover:bg-[#6a2240] text-white px-3 py-1 text-[11px] font-bold transition cursor-pointer"
                                  >
                                    Approve
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
              )}

              {/* 5. PRESENT STAFF ROSTER MODAL */}
              {activeModal === 'present' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200/90 rounded-xl p-3.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="size-4 text-emerald-600" />
                      <span className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                        PRESENT STAFF TODAY ({attendanceMetrics.presentToday} EMPLOYEES)
                      </span>
                    </div>
                    <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full uppercase">
                      ON DUTY
                    </span>
                  </div>

                  <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs bg-white">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="px-4 py-3">STAFF NAME</th>
                          <th className="px-4 py-3">ROLE / DESIGNATION</th>
                          <th className="px-4 py-3">CLOCK-IN TIME</th>
                          <th className="px-4 py-3 text-right">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {attendanceMetrics.presentList.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-400 font-bold">
                              No present staff records found for today.
                            </td>
                          </tr>
                        ) : (
                          attendanceMetrics.presentList.map((emp, i) => (
                            <tr key={i} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 text-slate-900 font-black">{emp.name || emp.full_name || 'Staff Member'}</td>
                              <td className="px-4 py-3 text-slate-600 font-semibold">{emp.role || emp.designation || 'Sales Executive'}</td>
                              <td className="px-4 py-3 text-slate-700 font-bold">09:15 AM</td>
                              <td className="px-4 py-3 text-right font-black text-emerald-600">
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px]">
                                  Present
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 6. ABSENT STAFF ROSTER MODAL */}
              {activeModal === 'absent' && (() => {
                const absentFiltered = attendanceMetrics.absentList.filter(emp => {
                  const roleLower = String(emp.role || emp.designation || '').toLowerCase()
                  const nameLower = String(emp.name || emp.full_name || '').toLowerCase()

                  if (absentRoleFilter === 'MANAGER' && !roleLower.includes('manager')) return false
                  if (absentRoleFilter === 'TEAM LEAD' && !roleLower.includes('lead') && !roleLower.includes('tl')) return false
                  if (absentRoleFilter === 'EXECUTIVE' && !roleLower.includes('executive') && !roleLower.includes('rep')) return false
                  if (absentRoleFilter === 'ADMIN' && !roleLower.includes('admin') && !roleLower.includes('ceo') && !roleLower.includes('founder')) return false

                  if (absentSearch.trim()) {
                    const q = absentSearch.toLowerCase().trim()
                    if (!nameLower.includes(q) && !roleLower.includes(q)) return false
                  }

                  return true
                })

                const roleGroups = [
                  { key: 'ALL', label: 'All', count: attendanceMetrics.absentList.length },
                  { key: 'MANAGER', label: 'Manager', count: attendanceMetrics.absentList.filter(e => String(e.role || '').toLowerCase().includes('manager')).length },
                  { key: 'TEAM LEAD', label: 'Team Lead', count: attendanceMetrics.absentList.filter(e => { const r = String(e.role || '').toLowerCase(); return r.includes('lead') || r.includes('tl') }).length },
                  { key: 'EXECUTIVE', label: 'Executive', count: attendanceMetrics.absentList.filter(e => { const r = String(e.role || '').toLowerCase(); return r.includes('executive') || r.includes('rep') }).length },
                  { key: 'ADMIN', label: 'Admin', count: attendanceMetrics.absentList.filter(e => { const r = String(e.role || '').toLowerCase(); return r.includes('admin') || r.includes('ceo') || r.includes('founder') }).length },
                ].filter(g => g.key === 'ALL' || g.count > 0)

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-rose-50 border border-rose-200/90 rounded-xl p-3.5">
                      <div className="flex items-center gap-2">
                        <XCircle className="size-4 text-rose-600" />
                        <span className="text-xs font-black text-rose-950 uppercase tracking-wider">
                          ABSENT STAFF TODAY ({attendanceMetrics.absentToday} EMPLOYEES)
                        </span>
                      </div>
                      <span className="text-[10px] font-extrabold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full uppercase">
                        UNMARKED / ON LEAVE
                      </span>
                    </div>

                    {/* Filters Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {roleGroups.map(g => (
                          <button
                            key={g.key}
                            onClick={() => setAbsentRoleFilter(g.key)}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition cursor-pointer border ${
                              absentRoleFilter === g.key
                                ? 'bg-rose-600 text-white border-rose-600 shadow-xs scale-[1.02]'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {g.label}
                            <span className={`ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full ${
                              absentRoleFilter === g.key ? 'bg-rose-700 text-rose-100' : 'bg-slate-100 text-slate-600'
                            }`}>{g.count}</span>
                          </button>
                        ))}
                      </div>
                      <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-3 top-2.5 size-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search by name or role..."
                          value={absentSearch}
                          onChange={e => setAbsentSearch(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-400"
                        />
                      </div>
                    </div>

                    <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs bg-white">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                            <th className="px-4 py-3 whitespace-nowrap">STAFF NAME</th>
                            <th className="px-4 py-3 whitespace-nowrap">ROLE / DESIGNATION</th>
                            <th className="px-4 py-3 whitespace-nowrap">ATTENDANCE STATUS</th>
                            <th className="px-4 py-3 text-right whitespace-nowrap">ACTION</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {absentFiltered.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-8 text-center text-slate-400 font-bold">
                                {attendanceMetrics.absentList.length === 0
                                  ? 'All staff members are present today.'
                                  : `No absent staff matching filter “${absentRoleFilter}${absentSearch ? ' · ' + absentSearch : ''}”`}
                              </td>
                            </tr>
                          ) : (
                            absentFiltered.map((emp, i) => (
                              <tr key={i} className="hover:bg-rose-50/30">
                                <td className="px-4 py-3 text-slate-900 font-black">{emp.name || emp.full_name || 'Staff Member'}</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 font-black uppercase text-[10px] tracking-wider border ${
                                    String(emp.role || '').toLowerCase().includes('manager') ? 'bg-[#832D51]/10 text-[#832D51] border-[#832D51]/30' :
                                    String(emp.role || '').toLowerCase().includes('lead') ? 'bg-violet-50 text-violet-700 border-violet-200' :
                                    String(emp.role || '').toLowerCase().includes('admin') || String(emp.role || '').toLowerCase().includes('ceo') ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                    'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  }`}>
                                    {emp.role || emp.designation || 'Staff Member'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-rose-600 font-bold">Not Clocked In</td>
                                <td className="px-4 py-3 text-right font-black">
                                  <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-md text-[10px]">
                                    Absent
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {absentFiltered.length > 0 && (
                      <p className="text-[11px] text-slate-400 font-bold text-right">
                        Showing {absentFiltered.length} of {attendanceMetrics.absentList.length} absent staff
                      </p>
                    )}
                  </div>
                )
              })()}

              {/* 7. TODAY ON FIELD VISIT MODAL */}
              {activeModal === 'field_visit' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-amber-50 border border-amber-200/90 rounded-xl p-3.5">
                    <div className="flex items-center gap-2">
                      <Briefcase className="size-4 text-amber-600" />
                      <span className="text-xs font-black text-amber-950 uppercase tracking-wider">
                        ACTIVE FIELD VISITS TODAY ({attendanceMetrics.onFieldToday} EXECUTIVES)
                      </span>
                    </div>
                    <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full uppercase">
                      LIVE FIELD TRACKING
                    </span>
                  </div>

                  <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs bg-white">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="px-4 py-3">EXECUTIVE NAME</th>
                          <th className="px-4 py-3">CLIENT / PURPOSE</th>
                          <th className="px-4 py-3">LOCATION</th>
                          <th className="px-4 py-3 text-right">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {attendanceMetrics.fieldVisitList.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-400 font-bold">
                              No active field visits or client mode check-ins logged for today.
                            </td>
                          </tr>
                        ) : (
                          attendanceMetrics.fieldVisitList.map((v, i) => (
                            <tr key={i} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 text-slate-900 font-black">{v.executive_name || v.submitted_by || v.sales_executive || 'Sales Executive'}</td>
                              <td className="px-4 py-3 text-slate-700 font-semibold">{v.client_name || v.title || v.purpose || 'Client Field Visit'}</td>
                              <td className="px-4 py-3 text-slate-600 font-medium">{v.location || v.address || 'Field Location'}</td>
                              <td className="px-4 py-3 text-right font-black text-amber-600">
                                <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md text-[10px]">
                                  {v.status || 'Checked In'}
                                </span>
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
        </div>
      )}
    </div>
  )
}

export default CeoDashboard
