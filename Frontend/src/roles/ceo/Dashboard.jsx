import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  Users,
  Target,
  DollarSign,
  ArrowUpRight,
  ChevronRight,
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
} from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'
import { exportToPDF, exportToExcel, exportToCSV } from '../../utils/exportUtils.js'

function CeoDashboard() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [timeRange, setTimeRange] = useState('This Month')
  
  // Selected Modal overlay ('revenue' | 'customers' | 'employees' | 'approvals' | null)
  const [activeModal, setActiveModal] = useState(null)

  // Revenue Filter States
  const [revenueFilter, setRevenueFilter] = useState('This Month')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [appliedCustomRange, setAppliedCustomRange] = useState(null)

  // Customer Win Toggle State
  const [customerWinToggle, setCustomerWinToggle] = useState(false)

  // Full dynamic dashboard response from backend
  const [dashboardData, setDashboardData] = useState(null)

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
      const [res, custRes, usersRes, empRes] = await Promise.all([
        reportAPI.getCeoDashboard().catch(() => null),
        customerAPI.getCustomers().catch(() => null),
        userAPI.getUsers().catch(() => null),
        hrmsAPI.getEmployees().catch(() => null),
      ])

      // 1. Gather all users & employees from Admin Portal & HRMS
      const localUsersRaw = (() => {
        try {
          const s = localStorage.getItem('tc_app_users')
          return s ? JSON.parse(s) : []
        } catch { return [] }
      })()

      const backendUsers = Array.isArray(usersRes?.data) ? usersRes.data : (Array.isArray(usersRes) ? usersRes : [])
      const backendEmployees = Array.isArray(empRes?.data) ? empRes.data : (Array.isArray(empRes) ? empRes : [])
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
      wonOpps.forEach((w) => {
        if (w.amount > 0) {
          const transId = w.id || w.opportunity_id
          if (transId && !seenTransIds.has(transId)) {
            seenTransIds.add(transId)
            rawRevenueTransactions.push({
              id: transId,
              date: w.date,
              sales_manager: w.sales_manager,
              sales_executive: w.sales_executive,
              amount: w.amount,
            })
          }
        }
      })

      const todayDateStr = new Date().toISOString().split('T')[0]
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
    return null
  }

  const getFilteredRevenue = () => {
    const records = dashboardData?.revenueSummary?.revenueRecords || []
    let startLimit = null
    let endLimit = null
    
    if (revenueFilter === 'Custom') {
      if (appliedCustomRange) {
        startLimit = appliedCustomRange.start
        endLimit = appliedCustomRange.end
      } else {
        return records.filter(r => (r.amount || 0) > 0)
      }
    } else {
      const limits = getFilterDates(revenueFilter)
      if (limits) {
        startLimit = limits.start
        endLimit = limits.end
      }
    }
    
    if (!startLimit || !endLimit) return records.filter(r => (r.amount || 0) > 0)
    
    // Transactions with real revenue in date range
    return records.filter(r => {
      const d = r.date || ''
      return (r.amount || 0) > 0 && d >= startLimit && d <= endLimit
    })
  }

  const handleApplyCustomRange = (e) => {
    e.preventDefault()
    if (!fromDate || !toDate) {
      showToast('Please select both From and To dates', 'warning')
      return
    }
    setAppliedCustomRange({ start: fromDate, end: toDate })
  }

  const filteredRevenue = getFilteredRevenue()
  const totalRevenueAmount = filteredRevenue.reduce((sum, r) => sum + (r.amount || 0), 0)

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-12">
      {/* Minimal Header */}
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

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 text-xs font-bold border border-slate-200">
            {['This Month', 'This Quarter', 'This Year'].map((t) => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  timeRange === t ? 'bg-[#832D51] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition cursor-pointer"
          >
            <Download className="size-3.5" />
            Export Brief
          </button>
        </div>
      </div>

      {/* ── INTERACTIVE KPI CARDS GRID (Balanced 4-Column Layout) ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon
          const isSelected = activeModal === kpi.id

          return (
            <button
              key={kpi.id}
              onClick={() => setActiveModal(kpi.id)}
              className="text-left rounded-2xl p-5 bg-white border border-slate-200/90 hover:border-[#832D51] hover:shadow-lg transition-all duration-250 cursor-pointer relative overflow-hidden group hover:-translate-y-0.5 active:translate-y-0 animate-in fade-in duration-200"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  {kpi.title}
                </span>
                <span className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-[#F8CAE4]/30 group-hover:text-[#832D51] transition">
                  <Icon className="size-4.5" />
                </span>
              </div>

              {/* Value */}
              <div className="mt-3">
                <p className="text-2xl font-black tracking-tight text-slate-900">
                  {kpi.value}
                </p>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[11px] font-bold text-slate-500">
                    {kpi.subtitle}
                  </p>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider bg-slate-100 text-slate-600 group-hover:bg-[#EA6993]/10 group-hover:text-[#EA6993] transition">
                    {kpi.badge}
                  </span>
                </div>
              </div>

              {/* Hover highlight line */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#832D51] scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-250" />
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
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4.5 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-[#F8CAE4]/30 text-[#832D51]">
                  {activeModal === 'revenue' && <DollarSign className="size-5" />}
                  {activeModal === 'customers' && <Building2 className="size-5" />}
                  {activeModal === 'employees' && <Users className="size-5" />}
                  {activeModal === 'approvals' && <CheckCircle2 className="size-5" />}
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {activeModal === 'revenue' && 'Revenue Ledger & Logs'}
                    {activeModal === 'customers' && 'CRM Client Database'}
                    {activeModal === 'employees' && 'HRMS Employee Directory'}
                    {activeModal === 'approvals' && 'CEO Approval Queue'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-bold tracking-wide uppercase mt-0.5">
                    {activeModal === 'revenue' && 'Direct financial transactions audit'}
                    {activeModal === 'customers' && 'Active SLAs & Won Deals'}
                    {activeModal === 'employees' && 'Corporate Workforce List'}
                    {activeModal === 'approvals' && 'Pending Leave approvals'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-950 transition cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Content Scrollable Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              
              {/* 1. REVENUE MODAL FILTER BLOCK */}
              {activeModal === 'revenue' && (
                <div className="space-y-4">
                  {/* Date range switcher */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
                    <div className="flex items-center gap-1">
                      {['Today', 'This Week', 'This Month', 'Custom'].map((range) => (
                        <button
                          key={range}
                          onClick={() => {
                            setRevenueFilter(range)
                            if (range !== 'Custom') {
                              setAppliedCustomRange(null)
                            }
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                            revenueFilter === range
                              ? 'bg-[#832D51] text-white shadow-sm'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          {range}
                        </button>
                      ))}
                    </div>

                    {revenueFilter === 'Custom' && (
                      <form onSubmit={handleApplyCustomRange} className="flex items-center gap-2 flex-wrap">
                        <input
                          type="date"
                          value={fromDate}
                          onChange={(e) => setFromDate(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#832D51]"
                          required
                        />
                        <span className="text-slate-400 text-xs font-bold">to</span>
                        <input
                          type="date"
                          value={toDate}
                          onChange={(e) => setToDate(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#832D51]"
                          required
                        />
                        <button
                          type="submit"
                          className="bg-[#832D51] hover:bg-[#6a2240] text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer transition"
                        >
                          Apply
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Revenue Table */}
                  <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider">
                            <th className="px-5 py-3">Date</th>
                            <th className="px-5 py-3">Sales Manager</th>
                            <th className="px-5 py-3">Sales Executive</th>
                            <th className="px-5 py-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {filteredRevenue.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-12 text-center text-slate-400 font-bold">
                                No sales managers or executives found.
                              </td>
                            </tr>
                          ) : (
                            filteredRevenue.map((rec, i) => (
                              <tr key={rec.id || i} className="hover:bg-slate-50/50">
                                <td className="px-5 py-3.5 text-slate-900 font-bold">{rec.date || '—'}</td>
                                <td className="px-5 py-3.5 text-slate-700 font-medium">{rec.sales_manager || 'Sales Manager'}</td>
                                <td className="px-5 py-3.5 text-slate-700 font-medium">{rec.sales_executive || 'Sales Executive'}</td>
                                <td className="px-5 py-3.5 text-right font-black">
                                  {rec.amount && rec.amount > 0 ? (
                                    <span className="text-[#832D51]">₹{rec.amount.toLocaleString()}</span>
                                  ) : (
                                    <span className="text-slate-400 font-bold">—</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Bottom Amount Summary */}
                  <div className="flex justify-end p-2">
                    <div className="bg-[#F8CAE4]/20 border border-[#EA6993]/20 rounded-2xl px-5 py-3 text-right">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Total Realized Revenue</span>
                      <span className="text-xl font-black text-[#832D51] mt-0.5 block">
                        ₹{totalRevenueAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. CUSTOMERS MODAL VIEW */}
              {activeModal === 'customers' && (
                <div className="space-y-4">
                  {/* Win Switcher Toggle */}
                  <div className="flex items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/60">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-wider px-2">Filter accounts type</span>
                    <div className="flex bg-slate-200/70 p-1 rounded-xl">
                      <button
                        onClick={() => setCustomerWinToggle(false)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                          !customerWinToggle ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                        }`}
                      >
                        All Customers
                      </button>
                      <button
                        onClick={() => setCustomerWinToggle(true)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                          customerWinToggle ? 'bg-[#832D51] text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'
                        }`}
                      >
                        Win
                      </button>
                    </div>
                  </div>

                  {/* Customer Table */}
                  <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      {!customerWinToggle ? (
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider">
                              <th className="px-4 py-3">Date</th>
                              <th className="px-4 py-3">Sales Manager</th>
                              <th className="px-4 py-3">Sales Executive</th>
                              <th className="px-4 py-3">Customer Name</th>
                              <th className="px-4 py-3">Company Details</th>
                              <th className="px-4 py-3">Product</th>
                              <th className="px-4 py-3 text-right">Amount</th>
                              <th className="px-4 py-3 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {(!dashboardData?.customerSummary?.customersList || dashboardData.customerSummary.customersList.length === 0) ? (
                              <tr>
                                <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                                  No customer records found.
                                </td>
                              </tr>
                            ) : (
                              dashboardData.customerSummary.customersList.map((cust, i) => (
                                <tr key={cust.id || i} className="hover:bg-slate-50/50">
                                  <td className="px-4 py-3.5 text-slate-500 font-semibold">{cust.date || 'N/A'}</td>
                                  <td className="px-4 py-3.5 text-slate-700 font-medium">{cust.sales_manager}</td>
                                  <td className="px-4 py-3.5 text-slate-700 font-medium">{cust.sales_executive}</td>
                                  <td className="px-4 py-3.5 font-bold text-slate-900">{cust.name}</td>
                                  <td className="px-4 py-3.5 text-slate-500 max-w-[180px] truncate" title={cust.details}>{cust.details}</td>
                                  <td className="px-4 py-3.5 text-slate-600">{cust.product}</td>
                                  <td className="px-4 py-3.5 text-right font-black text-slate-900">₹{cust.amount.toLocaleString()}</td>
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
                      ) : (
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider">
                              <th className="px-4 py-3">Date</th>
                              <th className="px-4 py-3">Sales Manager</th>
                              <th className="px-4 py-3">Sales Executive</th>
                              <th className="px-4 py-3">Client Name & Details</th>
                              <th className="px-4 py-3">Product</th>
                              <th className="px-4 py-3 text-right">Amount</th>
                              <th className="px-4 py-3 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {(!dashboardData?.customerSummary?.wonOpportunitiesList || dashboardData.customerSummary.wonOpportunitiesList.length === 0) ? (
                              <tr>
                                <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                                  No won opportunities found.
                                </td>
                              </tr>
                            ) : (
                              dashboardData.customerSummary.wonOpportunitiesList.map((opp, i) => (
                                <tr key={i} className="hover:bg-slate-50/50">
                                  <td className="px-4 py-3.5 text-slate-500 font-semibold">{opp.date}</td>
                                  <td className="px-4 py-3.5 text-slate-700 font-medium">{opp.sales_manager}</td>
                                  <td className="px-4 py-3.5 text-slate-700 font-medium">{opp.sales_executive}</td>
                                  <td className="px-4 py-3.5 font-bold text-slate-900">{opp.client_name_details}</td>
                                  <td className="px-4 py-3.5 text-slate-600">{opp.product}</td>
                                  <td className="px-4 py-3.5 text-right font-black text-emerald-700">₹{opp.amount.toLocaleString()}</td>
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
                      )}
                    </div>
                  </div>
                </div>
              )}

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

            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CeoDashboard
