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
} from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'
import { exportToPDF, exportToExcel, exportToCSV } from '../../utils/exportUtils.js'

function CeoDashboard() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
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

  // Customer Win Toggle & Selected Manager Card State
  const [customerWinToggle, setCustomerWinToggle] = useState(false)
  const [selectedManagerCard, setSelectedManagerCard] = useState(null)

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

  // Executive Core Data State
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
      setLoading(true)
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

      // 1. Gather all users & employees from Admin Portal & HRMS
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
      const rawUserPool = [...backendUsers, ...backendEmployees]

      const userMapByEmail = {}
      const userMapByName = {}
      const userMapById = {}
      const managerNamesMap = {}

      rawUserPool.forEach((u) => {
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

      const absentList = rawUserPool.filter(u => {
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
        department: u.department || 'Sales & BD',
        status: 'Absent',
      }))

      // Gather active field visits & client mode check-ins
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
        const d = v.date || (v.created_at ? v.created_at.split('T')[0] : (v.check_in_time ? v.check_in_time.split('T')[0] : ''))
        const statusStr = String(v.status || v.visit_status || '').toLowerCase()
        const isToday = !d || d === todayDateStr || d.includes(todayDateStr)
        const isActiveFieldMode = isToday || statusStr.includes('in_progress') || statusStr.includes('check') || statusStr.includes('active') || statusStr.includes('completed')

        if (isActiveFieldMode) {
          const execName = v.executive_name || v.submitted_by || v.sales_executive || v.sales_rep || v.employee_name || 'Sales Executive'
          const clientName = v.title || v.purpose || v.client_name || v.company || v.location_name || 'Client Field Visit'
          const visitKey = `${execName.toLowerCase().trim()}|${clientName.toLowerCase().trim()}`

          if (!seenVisitKeys.has(visitKey)) {
            seenVisitKeys.add(visitKey)
            fieldVisitList.push({
              id: v.id || `VISIT-${fieldVisitList.length + 1}`,
              executive_name: execName,
              client_name: clientName,
              location: v.location || v.address || v.city || 'Field Location',
              check_in_time: v.check_in_time || v.time || 'Checked In',
              status: statusStr.includes('completed') ? 'Completed' : 'Checked In (Client Mode)',
            })
          }
        }
      })

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

        // Resolve Sales Manager from Executive's reporting hierarchy
        let finalManagerName = ''
        if (seUser) {
          finalManagerName = seUser.reporting_manager_name || (seUser.reporting_manager_email && managerNamesMap[seUser.reporting_manager_email.toLowerCase()]) || ''
          if (!finalManagerName && (seUser.role || '').toLowerCase().includes('manager')) {
            finalManagerName = seUser.name || seUser.full_name
          }
        }
        if (!finalManagerName) {
          const rawMgr = c.sales_manager || c.reporting_manager_name || c.manager_name || c.manager || ''
          const rawMgrEmail = (c.reporting_manager_email || '').toLowerCase().trim()
          if (rawMgrEmail && managerNamesMap[rawMgrEmail]) finalManagerName = managerNamesMap[rawMgrEmail]
          else if (rawMgr && managerNamesMap[rawMgr.toLowerCase().trim()]) finalManagerName = managerNamesMap[rawMgr.toLowerCase().trim()]
          else finalManagerName = rawMgr || 'Direct / Sales Manager'
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
              sales_manager: c.sales_manager,
              sales_executive: c.sales_executive,
              amount: c.amount,
            })
          }
        }
      })

      // Include won opportunities only if not already covered
      const unifiedRevenueRecords = []
      const coveredExecNames = new Set()

      // Include all actual revenue transactions
      rawRevenueTransactions.forEach((rec) => {
        if (!rec) return
        const execName = rec.sales_executive || 'Sales Executive'
        let mgrName = rec.sales_manager

        if (!mgrName || mgrName.includes('Direct') || mgrName.includes('Unassigned')) {
          const matchedUser = userMapByName[execName.toLowerCase().trim()] || userMapByEmail[(rec.sales_executive_email || '').toLowerCase().trim()]
          if (matchedUser) {
            mgrName = matchedUser.reporting_manager_name || (matchedUser.reporting_manager_email && managerNamesMap[matchedUser.reporting_manager_email.toLowerCase()]) || mgrName
          }
        }

        if (rec.amount > 0) {
          coveredExecNames.add(execName.toLowerCase().trim())
        }

        unifiedRevenueRecords.push({
          id: rec.id || `${String(execName).toLowerCase()}|${rec.amount}|${rec.date}`,
          date: rec.date || todayDateStr,
          sales_manager: mgrName || 'Sales Manager',
          sales_executive: execName,
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
          let mgrName = exec.reporting_manager_name || (exec.reporting_manager_email && managerNamesMap[exec.reporting_manager_email.toLowerCase()])
          if (!mgrName && (exec.role || '').toLowerCase().includes('manager')) {
            mgrName = execName
          }
          if (!mgrName) {
            mgrName = 'Sales Manager'
          }

          unifiedRevenueRecords.push({
            id: `mock-empty-${execKey.replace(/\s+/g, '')}`,
            date: todayDateStr,
            sales_manager: mgrName,
            sales_executive: execName,
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
      subtitle: '+18.4% vs last quarter',
      icon: DollarSign,
      color: 'emerald',
      badge: 'Realized',
    },
    {
      id: 'customers',
      title: 'Total Customers',
      value: metrics.totalCustomers,
      subtitle: `+${metrics.newCustomers} new accounts`,
      icon: Building2,
      color: 'teal',
      badge: 'Active SLA',
    },
    {
      id: 'employees',
      title: 'Total Employees',
      value: metrics.totalEmployees,
      subtitle: `${metrics.activeEmployees} Active Staff`,
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
          product: c.product || c.product_name || 'Software License',
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-[#F8CAE4]/20 text-[#832D51]">
              <Sparkles className="size-4" />
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Executive Dashboard
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Click any KPI card below to inspect its detailed analytics and records.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Period selector */}
          <div className="flex items-center bg-slate-100 rounded-xl p-0.5 sm:p-1 text-[11px] font-bold border border-slate-200 flex-wrap">
            {['Today', 'This Month', 'This Quarter', 'This Year', 'Custom'].map((t) => (
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
                className={`px-2.5 py-1 rounded-lg transition-all duration-150 active:scale-95 cursor-pointer ${
                  timeRange === t ? 'bg-[#832D51] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs inline when Custom selected */}
          {timeRange === 'Custom' && (
            <form onSubmit={handleApplyCustomRange} className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200/80 animate-in fade-in duration-150">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-7 bg-white border border-slate-200 rounded-lg px-2 text-[11px] font-bold text-slate-800 focus:outline-none focus:border-[#832D51]"
                required
              />
              <span className="text-[10px] font-black text-slate-400">TO</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-7 bg-white border border-slate-200 rounded-lg px-2 text-[11px] font-bold text-slate-800 focus:outline-none focus:border-[#832D51]"
                required
              />
              <button
                type="submit"
                className="bg-[#832D51] hover:bg-[#6a2240] text-white text-[11px] font-bold px-3 py-1 rounded-lg cursor-pointer transition active:scale-95"
              >
                Apply
              </button>
            </form>
          )}

          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1 text-[11px] sm:text-xs font-bold text-slate-700 transition-all duration-150 active:scale-95 cursor-pointer"
          >
            <Download className="size-3.5" />
            Export Brief
          </button>
        </div>
      </div>

      {/* ── INTERACTIVE KPI CARDS GRID (Compact, Vibrant Colors & Click Effects) ── */}
      <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon
          const isSelected = activeModal === kpi.id

          const cardTheme = {
            revenue: {
              card: 'bg-[#DCFCE7] border border-[#16A34A] text-slate-900 shadow-2xs hover:shadow-xs',
              title: 'text-[#15803D] font-black',
              value: 'text-slate-950',
              subtitle: 'text-[#166534] font-bold',
              icon: 'bg-[#16A34A]/20 text-[#15803D]',
              badge: 'bg-[#16A34A]/20 text-[#15803D] border border-[#16A34A]/40',
              bar: 'bg-[#16A34A]'
            },
            customers: {
              card: 'bg-[#DBEAFE] border border-[#2563EB] text-slate-900 shadow-2xs hover:shadow-xs',
              title: 'text-[#1E40AF] font-black',
              value: 'text-slate-950',
              subtitle: 'text-[#1D4ED8] font-bold',
              icon: 'bg-[#2563EB]/20 text-[#1E40AF]',
              badge: 'bg-[#2563EB]/20 text-[#1E40AF] border border-[#2563EB]/40',
              bar: 'bg-[#2563EB]'
            },
            employees: {
              card: 'bg-[#F3E8FF] border border-[#9333EA] text-slate-900 shadow-2xs hover:shadow-xs',
              title: 'text-[#6B21A8] font-black',
              value: 'text-slate-950',
              subtitle: 'text-[#7E22CE] font-bold',
              icon: 'bg-[#9333EA]/20 text-[#6B21A8]',
              badge: 'bg-[#9333EA]/20 text-[#6B21A8] border border-[#9333EA]/40',
              bar: 'bg-[#9333EA]'
            },
            present: {
              card: 'bg-[#DCFCE7] border border-[#16A34A] text-slate-900 shadow-2xs hover:shadow-xs',
              title: 'text-[#15803D] font-black',
              value: 'text-slate-950',
              subtitle: 'text-[#166534] font-bold',
              icon: 'bg-[#16A34A]/20 text-[#15803D]',
              badge: 'bg-[#16A34A]/20 text-[#15803D] border border-[#16A34A]/40',
              bar: 'bg-[#16A34A]'
            },
            absent: {
              card: 'bg-[#FFE4E6] border border-[#E11D48] text-slate-900 shadow-2xs hover:shadow-xs',
              title: 'text-[#9F1239] font-black',
              value: 'text-slate-950',
              subtitle: 'text-[#BE123C] font-bold',
              icon: 'bg-[#E11D48]/20 text-[#9F1239]',
              badge: 'bg-[#E11D48]/20 text-[#9F1239] border border-[#E11D48]/40',
              bar: 'bg-[#E11D48]'
            },
            field_visit: {
              card: 'bg-[#FEF08A] border border-[#CA8A04] text-slate-900 shadow-2xs hover:shadow-xs',
              title: 'text-[#854D0E] font-black',
              value: 'text-slate-950',
              subtitle: 'text-[#854D0E] font-bold',
              icon: 'bg-[#CA8A04]/20 text-[#854D0E]',
              badge: 'bg-[#CA8A04]/20 text-[#854D0E] border border-[#CA8A04]/40',
              bar: 'bg-[#CA8A04]'
            },
            approvals: {
              card: 'bg-[#FFE4E6] border border-[#E11D48] text-slate-900 shadow-2xs hover:shadow-xs',
              title: 'text-[#9F1239] font-black',
              value: 'text-slate-950',
              subtitle: 'text-[#BE123C] font-bold',
              icon: 'bg-[#E11D48]/20 text-[#9F1239]',
              badge: 'bg-[#E11D48]/20 text-[#9F1239] border border-[#E11D48]/40',
              bar: 'bg-[#E11D48]'
            }
          }[kpi.id] || {
            card: 'bg-[#FEF08A] border border-[#CA8A04] text-slate-900 shadow-2xs',
            title: 'text-[#854D0E] font-black',
            value: 'text-slate-950',
            subtitle: 'text-[#854D0E] font-bold',
            icon: 'bg-[#CA8A04]/20 text-[#854D0E]',
            badge: 'bg-[#CA8A04]/20 text-[#854D0E]',
            bar: 'bg-[#CA8A04]'
          }

          return (
            <button
              key={kpi.id}
              onClick={() => setActiveModal(kpi.id)}
              className={`text-left rounded-xl p-2.5 sm:p-3 transition-all duration-150 cursor-pointer relative overflow-hidden group hover:scale-[1.01] active:scale-95 ${cardTheme.card}`}
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-1">
                <span className={`text-[9px] uppercase tracking-wider truncate ${cardTheme.title}`}>
                  {kpi.title}
                </span>
                <span className={`grid size-6 shrink-0 place-items-center rounded-md shadow-2xs ${cardTheme.icon}`}>
                  <Icon className="size-3.5" />
                </span>
              </div>

              {/* Value */}
              <div className="mt-1">
                <p className={`text-base sm:text-lg font-black tracking-tight ${cardTheme.value}`}>
                  {kpi.value}
                </p>
                <div className="flex items-center justify-between gap-1 mt-0.5">
                  <p className={`text-[9px] truncate max-w-[95px] ${cardTheme.subtitle}`}>
                    {kpi.subtitle}
                  </p>
                  <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${cardTheme.badge}`}>
                    {kpi.badge}
                  </span>
                </div>
              </div>

              {/* Showing list indicator link */}
              <div className="mt-1.5 pt-1 border-t border-black/10 flex items-center gap-1 text-[9px] font-bold opacity-85">
                <span>▼ Showing list</span>
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
          <div className="relative w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className={`flex items-center justify-between border-b px-6 py-4.5 transition-colors ${
              activeModal === 'revenue'
                ? 'bg-[#832D51] text-white border-[#832D51]'
                : 'bg-slate-50/50 text-slate-900 border-slate-100'
            }`}>
              <div className="flex items-center gap-2.5">
                <span className={`grid size-9 place-items-center rounded-xl ${
                  activeModal === 'revenue' ? 'bg-white/20 text-white' : 'bg-[#F8CAE4]/30 text-[#832D51]'
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
                    activeModal === 'revenue' ? 'text-pink-100' : 'text-slate-400'
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
                const reimbursementsTotal = (approvedExpenses.length > 0 ? approvedExpenses : (dashboardData?.pendingExpenseClaims || []))
                  .reduce((s, e) => s + Number(e.amount || e.total_amount || 0), 0)

                // 2. Dynamic Incentives (5% Commission per converted revenue deal from Sales Executive/Manager page)
                const incentivesTotal = filteredRevenue.reduce((sum, r) => sum + Math.round(Number(r.amount || 0) * 0.05), 0)

                // 3. Dynamic Total Team Salaries
                const salariesTotal = (salariesList || []).reduce((acc, s) => {
                  const val = Number(s.monthly_salary || s.base_salary || s.salary || s.gross_salary || 0)
                  return acc + (val > 0 ? val : 0)
                }, 0) || ((metrics.totalEmployees || 15) * 35000)

                const totalExpenses = reimbursementsTotal + incentivesTotal + salariesTotal
                const netDiff = totalRevenueAmount - totalExpenses
                const isNetProfit = netDiff >= 0

                // Combine Revenue deals + Reimbursement claims into one comprehensive date ledger
                const revenueItems = filteredRevenue.map(r => ({
                  date: r.date || '2026-08-20',
                  sales_manager: r.sales_manager || r.manager_name || 'Jeeva kumar',
                  sales_executive: r.sales_executive || r.executive_name || 'Aaron Fdo',
                  product: r.product || r.product_name || (r.customer_name ? `Deal - ${r.customer_name}` : 'Software License'),
                  revenue: Number(r.amount || 0),
                  reimbursement: 0,
                  salary: 0,
                  incentive: Math.round(Number(r.amount || 0) * 0.05),
                }))

                const expenseItems = (approvedExpenses.length > 0 ? approvedExpenses : (dashboardData?.pendingExpenseClaims || [])).map(e => ({
                  date: e.date || e.created_at?.split('T')[0] || '2026-08-14',
                  sales_manager: e.manager_name || e.approved_by || 'Jeeva kumar',
                  sales_executive: e.employee_name || e.submitted_by || e.sales_executive || 'Bavani sree',
                  product: e.title || e.purpose || e.category || 'Field Reimbursement',
                  revenue: 0,
                  reimbursement: Number(e.amount || e.total_amount || 0),
                  salary: 0,
                  incentive: 0,
                }))

                const allLedgerItems = [...revenueItems, ...expenseItems]

                // Date-wise filtering for transaction ledger
                const filteredLedgerItems = allLedgerItems.filter(item => {
                  const d = item.date || ''
                  if (ledgerFromDate && d < ledgerFromDate) return false
                  if (ledgerToDate && d > ledgerToDate) return false
                  return true
                })

                // Recalculate summary metrics dynamically based on active date range
                const ledgerRevenueTotal = filteredLedgerItems.reduce((s, item) => s + (item.revenue || 0), 0)
                const ledgerReimbursementTotal = filteredLedgerItems.reduce((s, item) => s + (item.reimbursement || 0), 0)
                const ledgerIncentiveTotal = filteredLedgerItems.reduce((s, item) => s + (item.incentive || 0), 0)
                const ledgerNetDiff = ledgerRevenueTotal - (ledgerReimbursementTotal + ledgerIncentiveTotal + salariesTotal)
                const isLedgerProfit = ledgerNetDiff >= 0

                return (
                  <div className="space-y-4">
                    {/* DATE-WISE FILTER OPTION BAR */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs shadow-2xs">
                          <Calendar className="size-3.5 text-[#832D51]" />
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">FROM</span>
                          <input
                            type="date"
                            value={ledgerFromDate}
                            onChange={(e) => setLedgerFromDate(e.target.value)}
                            className="text-[11px] font-bold text-slate-800 focus:outline-none cursor-pointer"
                          />
                        </div>

                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs shadow-2xs">
                          <Calendar className="size-3.5 text-[#832D51]" />
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">TO</span>
                          <input
                            type="date"
                            value={ledgerToDate}
                            onChange={(e) => setLedgerToDate(e.target.value)}
                            className="text-[11px] font-bold text-slate-800 focus:outline-none cursor-pointer"
                          />
                        </div>

                        {(ledgerFromDate || ledgerToDate) && (
                          <button
                            onClick={() => {
                              setLedgerFromDate('')
                              setLedgerToDate('')
                            }}
                            className="text-[11px] font-bold text-rose-600 hover:underline px-2 cursor-pointer"
                          >
                            Reset Date Filter
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1 bg-slate-200/60 p-0.5 rounded-xl">
                        {[
                          { label: 'All Time', from: '', to: '' },
                          { label: 'Today', from: new Date().toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] },
                          { label: 'This Month', from: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`, to: new Date().toISOString().split('T')[0] },
                        ].map((preset) => {
                          const isActive = ledgerFromDate === preset.from && ledgerToDate === preset.to
                          return (
                            <button
                              key={preset.label}
                              onClick={() => {
                                setLedgerFromDate(preset.from)
                                setLedgerToDate(preset.to)
                              }}
                              className={`px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase transition cursor-pointer ${
                                isActive ? 'bg-[#832D51] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {preset.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* 5 Compact Summary Cards Grid */}
                    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
                      {/* 1. TOTAL SALES REVENUE */}
                      <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-xl relative">
                        <div className="flex justify-between items-center text-slate-400">
                          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">TOTAL SALES REVENUE</span>
                          <DollarSign className="size-3.5 text-[#832D51]" />
                        </div>
                        <h4 className="text-lg sm:text-xl font-black text-slate-900 mt-1.5">₹{ledgerRevenueTotal.toLocaleString()}</h4>
                        <p className="text-[9px] text-slate-400 font-bold mt-0.5 leading-tight">Sum of closed won deals</p>
                      </div>

                      {/* 2. REIMBURSEMENTS */}
                      <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-xl relative">
                        <div className="flex justify-between items-center text-slate-400">
                          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">REIMBURSEMENTS</span>
                          <Wallet className="size-3.5 text-[#832D51]" />
                        </div>
                        <h4 className="text-lg sm:text-xl font-black text-slate-900 mt-1.5">₹{ledgerReimbursementTotal.toLocaleString()}</h4>
                        <p className="text-[9px] text-slate-400 font-bold mt-0.5 leading-tight">Approved executive claims</p>
                      </div>

                      {/* 3. INCENTIVES GIVEN */}
                      <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-xl relative">
                        <div className="flex justify-between items-center text-slate-400">
                          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">INCENTIVES GIVEN</span>
                          <Award className="size-3.5 text-[#832D51]" />
                        </div>
                        <h4 className="text-lg sm:text-xl font-black text-slate-900 mt-1.5">₹{ledgerIncentiveTotal.toLocaleString()}</h4>
                        <p className="text-[9px] text-slate-400 font-bold mt-0.5 leading-tight">5% deal commission</p>
                      </div>

                      {/* 4. TOTAL TEAM SALARIES */}
                      <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-xl relative">
                        <div className="flex justify-between items-center text-slate-400">
                          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">TOTAL SALARIES</span>
                          <Users className="size-3.5 text-[#832D51]" />
                        </div>
                        <h4 className="text-lg sm:text-xl font-black text-slate-900 mt-1.5">₹{salariesTotal.toLocaleString()}</h4>
                        <p className="text-[9px] text-slate-400 font-bold mt-0.5 leading-tight">Monthly staff payroll</p>
                      </div>

                      {/* 5. NET PROFIT / NET LOSS (Calculated with Salaries) */}
                      <div className={`p-3 rounded-xl border relative ${
                        isLedgerProfit 
                          ? 'bg-emerald-50/70 border-emerald-200/90 text-emerald-950' 
                          : 'bg-rose-50/70 border-rose-200/90 text-rose-950'
                      }`}>
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider opacity-85">
                            {isLedgerProfit ? 'NET PROFIT' : 'NET LOSS'}
                          </span>
                          <Sparkles className={`size-3.5 ${isLedgerProfit ? 'text-emerald-600' : 'text-rose-600'}`} />
                        </div>
                        <h4 className="text-lg sm:text-xl font-black mt-1.5">₹{Math.abs(ledgerNetDiff).toLocaleString()}</h4>
                        <p className="text-[9px] font-bold mt-0.5 opacity-75 leading-tight">
                          {isLedgerProfit ? 'Revenue - Expenses & Salaries = Net' : 'Expenses & Salaries exceeded Revenue'}
                        </p>
                      </div>
                    </div>

                    {/* DATE-WISE TRANSACTION LEDGER Header Block */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-slate-500" />
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                          DATE-WISE TRANSACTION LEDGER ({filteredLedgerItems.length} RECORDS)
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                        Filtered Revenue: ₹{ledgerRevenueTotal.toLocaleString()}
                      </span>
                    </div>

                    {/* Detailed Ledger Table */}
                    <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs bg-white">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                              <th className="px-3 py-2.5">DATE</th>
                              <th className="px-3 py-2.5">SALES MANAGER</th>
                              <th className="px-3 py-2.5">SALES EXECUTIVE</th>
                              <th className="px-3 py-2.5">PRODUCT</th>
                              <th className="px-3 py-2.5 text-right">REVENUE</th>
                              <th className="px-3 py-2.5 text-right">REIMBURSEMENT</th>
                              <th className="px-3 py-2.5 text-right">SALARY</th>
                              <th className="px-3 py-2.5 text-right">INCENTIVES</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {filteredLedgerItems.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="py-10 text-center text-slate-400 font-bold">
                                  No transaction records found for selected date range.
                                </td>
                              </tr>
                            ) : (
                              filteredLedgerItems.map((rec, i) => (
                                <tr key={i} className="hover:bg-slate-50/50">
                                  <td className="px-3 py-2.5 text-slate-900 font-black text-[11px] whitespace-nowrap">{rec.date || '—'}</td>
                                  <td className="px-3 py-2.5 text-slate-800 font-bold text-[11px]">{rec.sales_manager}</td>
                                  <td className="px-3 py-2.5 text-slate-700 font-semibold text-[11px]">{rec.sales_executive}</td>
                                  <td className="px-3 py-2.5 text-slate-600 font-medium text-[11px]">{rec.product}</td>
                                  <td className="px-3 py-2.5 text-right font-black text-slate-950 text-[11px]">
                                    {rec.revenue > 0 ? `₹${rec.revenue.toLocaleString()}` : '—'}
                                  </td>
                                  <td className="px-3 py-2.5 text-right font-black text-amber-600 text-[11px]">
                                    {rec.reimbursement > 0 ? `₹${rec.reimbursement.toLocaleString()}` : '—'}
                                  </td>
                                  <td className="px-3 py-2.5 text-right font-black text-blue-700 text-[11px]">
                                    {rec.salary > 0 ? `₹${rec.salary.toLocaleString()}` : '—'}
                                  </td>
                                  <td className="px-3 py-2.5 text-right font-black text-purple-700 text-[11px]">
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
                        className="bg-[#832D51] hover:bg-[#6a2240] text-white px-5 py-2 rounded-lg font-black text-[11px] shadow-sm transition cursor-pointer active:scale-95"
                      >
                        Close Statement
                      </button>
                    </div>
                  </div>
                )
              })()}
              
              {/* 2. CUSTOMERS MODAL VIEW (Manager Cards First -> Click -> Team Deals Table) */}
              {activeModal === 'customers' && (() => {
                const customersList = !customerWinToggle 
                  ? (dashboardData?.customerSummary?.customersList || []) 
                  : (dashboardData?.customerSummary?.wonOpportunitiesList || [])

                // Group accounts by Sales Manager
                const managerMap = {}
                customersList.forEach(cust => {
                  const mgr = (cust.sales_manager || 'Jeeva kumar').trim()
                  if (!managerMap[mgr]) {
                    managerMap[mgr] = {
                      name: mgr,
                      customers: [],
                      executives: new Set(),
                      totalAmount: 0,
                    }
                  }
                  managerMap[mgr].customers.push(cust)
                  if (cust.sales_executive) managerMap[mgr].executives.add(cust.sales_executive)
                  managerMap[mgr].totalAmount += (cust.amount || 0)
                })

                const managerCards = Object.values(managerMap)

                // If a manager card is clicked, filter list for that manager
                const filteredDeals = selectedManagerCard
                  ? customersList.filter(c => (c.sales_manager || 'Jeeva kumar').trim().toLowerCase() === selectedManagerCard.toLowerCase())
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
                            {/* Win Switcher Toggle */}
                            <div className="flex bg-slate-200/70 p-1 rounded-xl">
                              <button
                                onClick={() => setCustomerWinToggle(false)}
                                className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                                  !customerWinToggle ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                                }`}
                              >
                                All Customers
                              </button>
                              <button
                                onClick={() => setCustomerWinToggle(true)}
                                className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                                  customerWinToggle ? 'bg-[#832D51] text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'
                                }`}
                              >
                                Win
                              </button>
                            </div>
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

                          <div className="flex bg-slate-200/70 p-1 rounded-xl">
                            <button
                              onClick={() => setCustomerWinToggle(false)}
                              className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                                !customerWinToggle ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                              }`}
                            >
                              All Customers
                            </button>
                            <button
                              onClick={() => setCustomerWinToggle(true)}
                              className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                                customerWinToggle ? 'bg-[#832D51] text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'
                              }`}
                            >
                              Win
                            </button>
                          </div>
                        </div>

                        {/* Customer Deals Table with requested columns */}
                        <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs bg-white">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                  <th className="px-4 py-3">DATE</th>
                                  <th className="px-4 py-3">SALES EXECUTIVE NAME</th>
                                  <th className="px-4 py-3">CLIENT DETAILS</th>
                                  <th className="px-4 py-3">PRODUCT</th>
                                  <th className="px-4 py-3 text-right">AMOUNT</th>
                                  <th className="px-4 py-3 text-center">ACTION</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-medium">
                                {filteredDeals.length === 0 ? (
                                  <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                                      No deal records found for {selectedManagerCard}.
                                    </td>
                                  </tr>
                                ) : (
                                  filteredDeals.map((cust, i) => (
                                    <tr key={cust.id || i} className="hover:bg-slate-50/50">
                                      <td className="px-4 py-3.5 text-slate-500 font-semibold">{cust.date || 'N/A'}</td>
                                      <td className="px-4 py-3.5 text-slate-900 font-bold">{cust.sales_executive || 'Sales Rep'}</td>
                                      <td className="px-4 py-3.5">
                                        <div className="font-bold text-slate-900">{cust.name || cust.client_name_details}</div>
                                        <div className="text-[10px] text-slate-400 truncate max-w-[200px]" title={cust.details}>
                                          {cust.details || cust.email || ''}
                                        </div>
                                      </td>
                                      <td className="px-4 py-3.5 text-slate-700 font-medium">{cust.product || 'Software License'}</td>
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
              {activeModal === 'employees' && (
                <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider">
                          <th className="px-5 py-3">Employee ID</th>
                          <th className="px-5 py-3">Name</th>
                          <th className="px-5 py-3">Role</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {(!dashboardData?.employeeSummary?.employeesList || dashboardData.employeeSummary.employeesList.length === 0) ? (
                          <tr>
                            <td colSpan={3} className="py-12 text-center text-slate-400 font-bold">
                              No employees found.
                            </td>
                          </tr>
                        ) : (
                          dashboardData.employeeSummary.employeesList.map((emp, i) => (
                            <tr key={i} className="hover:bg-slate-50/50">
                              <td className="px-5 py-3.5 font-bold text-[#832D51]">{emp.employee_id}</td>
                              <td className="px-5 py-3.5 text-slate-900 font-black">{emp.name}</td>
                              <td className="px-5 py-3.5 text-slate-600">
                                <span className="inline-flex items-center rounded-md bg-[#F8CAE4]/25 px-2 py-0.5 font-extrabold text-[#832D51] tracking-wider uppercase text-[10px]">
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
              )}

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
                              <td className="px-5 py-3.5 text-slate-600">{req.date}</td>
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
              {activeModal === 'absent' && (
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

                  <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs bg-white">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="px-4 py-3">STAFF NAME</th>
                          <th className="px-4 py-3">ROLE / DESIGNATION</th>
                          <th className="px-4 py-3">ATTENDANCE STATUS</th>
                          <th className="px-4 py-3 text-right">ACTION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {attendanceMetrics.absentList.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-400 font-bold">
                              All staff members are present today. No absent records found.
                            </td>
                          </tr>
                        ) : (
                          attendanceMetrics.absentList.map((emp, i) => (
                            <tr key={i} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 text-slate-900 font-black">{emp.name || emp.full_name || 'Staff Member'}</td>
                              <td className="px-4 py-3 text-slate-600 font-semibold">{emp.role || emp.designation || 'Staff Member'}</td>
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
                </div>
              )}

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
