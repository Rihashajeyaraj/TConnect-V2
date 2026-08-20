import React, { useState, useEffect, useMemo } from 'react'
import { useToast } from '../../common/ToastContext.jsx'
import {
  TrendingUp,
  Target,
  Users,
  Search,
  Filter,
  DollarSign,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ChevronRight,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Building2,
  Calendar,
  X,
  Sparkles,
  Info,
  Wallet,
  Download,
  FileSpreadsheet,
  Receipt,
  PieChart as PieChartIcon,
  Layers,
  Check
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import { reportAPI, expenseAPI } from '../../services/api.js'
import { exportToPDF, exportToExcel, exportToCSV } from '../../utils/exportUtils.js'

const ANNUAL_TARGET = 35000000 // ₹3.50 Cr organization target

function SalesOverview({ initialSection }) {
  const { showToast } = useToast()

  // Data State
  const [data, setData] = useState(null)
  const [dashboardData, setDashboardData] = useState(null)
  const [rawExpenses, setRawExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters State
  const [dateFilter, setDateFilter] = useState('This Month')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [customRangeApplied, setCustomRangeApplied] = useState(null)

  // Financial report popup state
  const [showFinancialReportModal, setShowFinancialReportModal] = useState(false)
  const [modalTimeFilter, setModalTimeFilter] = useState('Monthly') // 'Monthly' | 'Yearly' | 'Custom'
  const [modalFromDate, setModalFromDate] = useState('')
  const [modalToDate, setModalToDate] = useState('')

  // Targets popup state
  const [showTargetsModal, setShowTargetsModal] = useState(false)
  const [targetsYearFilter, setTargetsYearFilter] = useState(new Date().getFullYear())

  // Interactive Active View State
  const [activeKpi, setActiveKpi] = useState('revenue') // 'revenue' | 'customers' | 'won' | 'pipeline'
  const [wonToggle, setWonToggle] = useState(false) // false: All Customers, true: Won Deals only

  // Table filters
  const [searchQuery, setSearchQuery] = useState('')
  const [managerFilter, setManagerFilter] = useState('All')
  const [executiveFilter, setExecutiveFilter] = useState('All')

  // Product detail panel
  const [selectedProduct, setSelectedProduct] = useState(null)

  // Date range resolver helper
  const getFilterDates = (range) => {
    const pad = (n) => String(n).padStart(2, '0')
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`

    if (range === 'Today') {
      return { start: todayStr, end: todayStr }
    }
    if (range === 'This Week') {
      const currentDay = today.getDay()
      const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1)
      const start = new Date(today.setDate(diff))
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      const startStr = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`
      const endStr = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`
      return {
        start: startStr,
        end: endStr,
      }
    }
    if (range === 'This Month') {
      const startStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
      const endStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(lastDay)}`
      return {
        start: startStr,
        end: endStr,
      }
    }
    return null
  }

  const fetchUnifiedData = async () => {
    try {
      setLoading(true)
      setError(null)

      let startLimit = null
      let endLimit = null

      if (dateFilter === 'Custom Date') {
        if (customRangeApplied) {
          startLimit = customRangeApplied.start
          endLimit = customRangeApplied.end
        }
      } else {
        const limits = getFilterDates(dateFilter)
        if (limits) {
          startLimit = limits.start
          endLimit = limits.end
        }
      }

      const params = {}
      if (startLimit) params.from_date = startLimit
      if (endLimit) params.to_date = endLimit

      const [salesRes, dashRes, expRes] = await Promise.allSettled([
        reportAPI.getCeoSalesOverview(params),
        reportAPI.getCeoDashboard(),
        expenseAPI.getManagerExpenses({ status: '' }),  // fetch all, filter by status in UI
      ])

      if (salesRes.status === 'fulfilled' && salesRes.value?.data) {
        setData(salesRes.value.data)
      } else if (salesRes.status === 'rejected') {
        throw salesRes.reason
      }

      if (dashRes.status === 'fulfilled' && dashRes.value?.data) {
        setDashboardData(dashRes.value.data)
      }

      if (expRes.status === 'fulfilled') {
        const raw = expRes.value
        const list = Array.isArray(raw) ? raw
          : Array.isArray(raw?.data?.expenses) ? raw.data.expenses
          : Array.isArray(raw?.data) ? raw.data
          : []
        setRawExpenses(list)
      }
    } catch (err) {
      console.error('Failed to load Sales & Revenue data:', err)
      setError(err?.message || 'Server error loading sales & revenue summary')
      showToast('Error loading Sales & Revenue data', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUnifiedData()
  }, [dateFilter, customRangeApplied])

  const handleApplyCustomRange = (e) => {
    e.preventDefault()
    if (!fromDate || !toDate) {
      showToast('Please select both From and To dates', 'warning')
      return
    }
    setCustomRangeApplied({ start: fromDate, end: toDate })
  }

  // Only count APPROVED expense claims from executives (manager-approved)
  const APPROVED_STATUSES = ['approved', 'APPROVED', 'Approved']
  const totalOperationalExpenses = useMemo(() => {
    let startLimit = null
    let endLimit = null

    if (dateFilter === 'Custom Date') {
      if (customRangeApplied) {
        startLimit = customRangeApplied.start
        endLimit = customRangeApplied.end
      }
    } else {
      const limits = getFilterDates(dateFilter)
      if (limits) {
        startLimit = limits.start
        endLimit = limits.end
      }
    }

    // Base: only approved claims
    let filtered = rawExpenses.filter((e) =>
      APPROVED_STATUSES.includes(e.status || e.approval_status || '')
    )

    // Date filter
    if (startLimit && endLimit) {
      filtered = filtered.filter((e) => {
        const expDate = e.claim_date || e.created_at || e.submitted_at || e.date
        if (!expDate) return true
        const dStr = String(expDate).substring(0, 10)
        return dStr >= startLimit && dStr <= endLimit
      })
    }

    if (filtered.length === 0 && rawExpenses.length === 0) {
      return Number(dashboardData?.metrics?.totalExpenses || 0)
    }

    return filtered.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
  }, [rawExpenses, dateFilter, customRangeApplied, dashboardData])

  // Approved expense claim count (for card label)
  const approvedExpenseCount = useMemo(() => {
    return rawExpenses.filter((e) =>
      APPROVED_STATUSES.includes(e.status || e.approval_status || '')
    ).length
  }, [rawExpenses])

  // Detailed Modal Financial Calculations
  const modalRange = useMemo(() => {
    const pad = (n) => String(n).padStart(2, '0')
    const today = new Date()
    if (modalTimeFilter === 'Monthly') {
      const start = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
      const end = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(lastDay)}`
      return { start, end }
    }
    if (modalTimeFilter === 'Yearly') {
      const start = `${today.getFullYear()}-01-01`
      const end = `${today.getFullYear()}-12-31`
      return { start, end }
    }
    if (modalTimeFilter === 'Custom' && modalFromDate && modalToDate) {
      return { start: modalFromDate, end: modalToDate }
    }
    // Fallback to monthly
    const start = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    const end = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(lastDay)}`
    return { start, end }
  }, [modalTimeFilter, modalFromDate, modalToDate])

  const modalRevenueRecords = useMemo(() => {
    const recs = data?.revenue_details || []
    const { start, end } = modalRange
    return recs.filter(r => {
      const d = r.date || ''
      return (r.amount || 0) > 0 && d >= start && d <= end
    })
  }, [data?.revenue_details, modalRange])

  const modalTotalRevenue = useMemo(() => {
    return modalRevenueRecords.reduce((sum, r) => sum + (r.amount || 0), 0)
  }, [modalRevenueRecords])

  const modalTotalReimbursements = useMemo(() => {
    const { start, end } = modalRange
    const approved = rawExpenses.filter((e) =>
      APPROVED_STATUSES.includes(e.status || e.approval_status || '')
    )
    const inRange = approved.filter((e) => {
      const expDate = e.claim_date || e.created_at || e.submitted_at || e.date
      if (!expDate) return false
      const dStr = String(expDate).substring(0, 10)
      return dStr >= start && dStr <= end
    })
    return inRange.reduce((sum, e) => sum + Number(e.amount || 0), 0)
  }, [rawExpenses, modalRange])

  const modalReimbursementRecords = useMemo(() => {
    const { start, end } = modalRange
    const approved = rawExpenses.filter((e) =>
      APPROVED_STATUSES.includes(e.status || e.approval_status || '')
    )
    return approved.filter((e) => {
      const expDate = e.claim_date || e.created_at || e.submitted_at || e.date
      if (!expDate) return false
      const dStr = String(expDate).substring(0, 10)
      return dStr >= start && dStr <= end
    }).map(e => {
      const expDate = e.claim_date || e.created_at || e.submitted_at || e.date
      const dStr = String(expDate).substring(0, 10)
      return {
        id: e.id || `EXP-${e.claim_id || Math.random()}`,
        date: dStr,
        sales_manager: 'N/A',
        sales_executive: e.employee_name || e.employee || e.submitted_by || 'Employee',
        reimbursement: Number(e.amount || 0),
        amount: 0,
        incentive: 0,
        type: 'Expense',
        details: e.remarks || e.description || e.category || 'Reimbursement Claim'
      }
    })
  }, [rawExpenses, modalRange])

  const modalTotalIncentives = useMemo(() => {
    return modalRevenueRecords.reduce((sum, r) => sum + (r.incentive || 0), 0)
  }, [modalRevenueRecords])

  const netProfitLoss = modalTotalRevenue - (modalTotalReimbursements + modalTotalIncentives)
  const isProfit = netProfitLoss >= 0

  const unifiedModalLedger = useMemo(() => {
    const revenueItems = modalRevenueRecords.map(r => ({
      ...r,
      type: 'Revenue',
      reimbursement: 0,
      details: 'Won Deal / Customer SLA'
    }))
    const allItems = [...revenueItems, ...modalReimbursementRecords]
    const grouped = {}
    allItems.forEach(item => {
      const d = item.date || 'N/A'
      if (!grouped[d]) {
        grouped[d] = {
          date: d,
          totalRevenue: 0,
          totalReimbursements: 0,
          totalIncentives: 0,
          transactions: []
        }
      }
      grouped[d].totalRevenue += (item.amount || 0)
      grouped[d].totalReimbursements += (item.reimbursement || 0)
      grouped[d].totalIncentives += (item.incentive || 0)
      grouped[d].transactions.push(item)
    })
    return Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date))
  }, [modalRevenueRecords, modalReimbursementRecords])

  // Key Financial & Sales Metrics (Realized, Pipeline, Target, Net Margin)
  // Safe numeric helpers
  const safeNum = (v) => Number(v) || 0
  const safeFmt = (v) => safeNum(v).toLocaleString()

  const totalRevenue = safeNum(data?.metrics?.total_revenue)
  const totalPipeline = safeNum(data?.metrics?.total_pipeline_value)
  const totalCustomersCount = safeNum(data?.metrics?.total_customers)
  const totalWonDealsCount = safeNum(data?.metrics?.total_won_deals)

  const resolvedAnnualTarget = safeNum(data?.metrics?.annual_sales_target || data?.metrics?.sales_target || ANNUAL_TARGET)
  const targetAchievementRate =
    resolvedAnnualTarget > 0 ? ((totalRevenue / resolvedAnnualTarget) * 100).toFixed(1) : '0.0'
  const netProfit = totalRevenue - totalOperationalExpenses
  const netProfitMargin =
    totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0'

  // Filter ledger lists in memory
  const filteredRevenue = useMemo(() => {
    if (!data?.revenue_details) return []
    return data.revenue_details.filter((row) => {
      const matchesSearch =
        (row.customer || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (row.sales_executive || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (row.sales_manager || '').toLowerCase().includes(searchQuery.toLowerCase())
      const matchesManager = managerFilter === 'All' || row.sales_manager === managerFilter
      const matchesExecutive = executiveFilter === 'All' || row.sales_executive === executiveFilter
      return matchesSearch && matchesManager && matchesExecutive
    })
  }, [data?.revenue_details, searchQuery, managerFilter, executiveFilter])

  const filteredCustomers = useMemo(() => {
    if (!data?.customers_details) return []
    return data.customers_details.filter((row) => {
      const matchesSearch =
        (row.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (row.company || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (row.sales_executive || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (row.sales_manager || '').toLowerCase().includes(searchQuery.toLowerCase())
      const matchesManager = managerFilter === 'All' || row.sales_manager === managerFilter
      const matchesExecutive = executiveFilter === 'All' || row.sales_executive === executiveFilter
      return matchesSearch && matchesManager && matchesExecutive
    })
  }, [data?.customers_details, searchQuery, managerFilter, executiveFilter])

  // Calculate live reconciled totals based on displayed rows
  const liveReconciledRevenue = filteredRevenue.reduce((sum, r) => sum + (r.amount || 0), 0)
  const liveReconciledCustomersCount = new Set(
    filteredCustomers.map((c) => c.customer_name || c.company)
  ).size

  // Extract unique filters from raw response lists
  const uniqueManagers = Array.from(
    new Set([
      ...(data?.revenue_details || []).map((r) => r.sales_manager),
      ...(data?.customers_details || []).map((c) => c.sales_manager),
    ])
  ).filter(Boolean)

  const uniqueExecutives = Array.from(
    new Set([
      ...(data?.revenue_details || []).map((r) => r.sales_executive),
      ...(data?.customers_details || []).map((c) => c.sales_executive),
    ])
  ).filter(Boolean)

  // Manager Revenue Share Data for Financial Section
  const managerRevenueShares = useMemo(() => {
    if (!data?.manager_performance || data.manager_performance.length === 0) return []
    return data.manager_performance.map((mgr) => {
      const wonRev = safeNum(mgr.won_revenue)
      const sharePct =
        totalRevenue > 0 ? ((wonRev / totalRevenue) * 100).toFixed(1) : '0.0'
      return {
        manager: mgr.sales_manager,
        won_revenue: wonRev,
        won_deals: safeNum(mgr.won_deals),
        pipeline: safeNum(mgr.pipeline),
        share: `${sharePct}%`,
        shareNum: Number(sharePct),
      }
    })
  }, [data?.manager_performance, totalRevenue])

  // Top Revenue Closer Executives for Financial Section
  const executiveLeaderboard = useMemo(() => {
    if (!data?.executive_performance || data.executive_performance.length === 0) return []
    return data.executive_performance.map((exec) => {
      const wonRev = safeNum(exec.won_revenue)
      const sharePct =
        totalRevenue > 0 ? ((wonRev / totalRevenue) * 100).toFixed(1) : '0.0'
      return {
        executive: exec.sales_executive,
        manager: exec.sales_manager,
        won_revenue: wonRev,
        won_deals: safeNum(exec.won_deals),
        pipeline: safeNum(exec.pipeline),
        share: `${sharePct}%`,
      }
    })
  }, [data?.executive_performance, totalRevenue])

  // Product Analytics — aggregated from customers_details + revenue_details
  const productAnalytics = useMemo(() => {
    const map = {}

    // Pull from customers_details (has product field)
    const custList = data?.customers_details || []
    for (const c of custList) {
      const prod = (c.product || 'Unlisted Product').trim()
      if (!map[prod]) map[prod] = { product: prod, revenue: 0, deals: 0, customers: [], executives: new Set(), managers: new Set(), amounts: [] }
      const amt = safeNum(c.amount)
      map[prod].revenue += amt
      map[prod].deals += 1
      map[prod].amounts.push(amt)
      if (c.customer_name) map[prod].customers.push({ name: c.customer_name, company: c.company || '', amount: amt, executive: c.sales_executive || '—', manager: c.sales_manager || '—' })
      if (c.sales_executive) map[prod].executives.add(c.sales_executive)
      if (c.sales_manager) map[prod].managers.add(c.sales_manager)
    }

    // Also pull from revenue_details if product is available
    const revList = data?.revenue_details || []
    for (const r of revList) {
      const prod = (r.product || r.customer || 'Won Deal').trim()
      // Only add if not already counted via customers_details (prevent dup)
      // We skip this to avoid double counting — customers_details is primary
    }

    const maxRev = Math.max(...Object.values(map).map(p => p.revenue), 1)
    return Object.values(map)
      .map(p => ({
        ...p,
        executives: Array.from(p.executives),
        managers: Array.from(p.managers),
        avg_deal: p.deals > 0 ? Math.round(p.revenue / p.deals) : 0,
        share: totalRevenue > 0 ? ((p.revenue / totalRevenue) * 100).toFixed(1) : '0.0',
        bar_pct: Math.round((p.revenue / maxRev) * 100),
      }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [data?.customers_details, totalRevenue])

  // Monthly Target vs Achieved — derived from revenue_details grouped by month
  const MONTHLY_TARGET = Math.round(resolvedAnnualTarget / 12)
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthlyTargetData = useMemo(() => {
    const achieved = {}
    const revList = data?.revenue_details || []
    for (const r of revList) {
      // date format: "dd/mm/yyyy" or "yyyy-mm-dd"
      const dateStr = r.date || ''
      let monthIdx = -1
      if (dateStr.includes('/')) {
        // dd/mm/yyyy
        const parts = dateStr.split('/')
        monthIdx = parseInt(parts[1], 10) - 1
      } else if (dateStr.includes('-')) {
        // yyyy-mm-dd
        monthIdx = parseInt(dateStr.split('-')[1], 10) - 1
      }
      if (monthIdx >= 0 && monthIdx <= 11) {
        achieved[monthIdx] = (achieved[monthIdx] || 0) + safeNum(r.amount)
      }
    }
    const currentMonth = new Date().getMonth()
    return MONTH_NAMES.map((m, i) => {
      const act = achieved[i] || 0
      const pct = MONTHLY_TARGET > 0 ? Math.min(100, Math.round((act / MONTHLY_TARGET) * 100)) : 0
      return {
        month: m,
        target: MONTHLY_TARGET,
        achieved: act,
        pct,
        isCurrent: i === currentMonth,
        isPast: i < currentMonth,
        isFuture: i > currentMonth,
      }
    })
  }, [data?.revenue_details])

  const modalTargetsData = useMemo(() => {
    const achieved = {}
    const revList = data?.revenue_details || []
    for (const r of revList) {
      const dateStr = r.date || ''
      let year = -1
      let monthIdx = -1
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/')
        monthIdx = parseInt(parts[1], 10) - 1
        year = parseInt(parts[2], 10)
      } else if (dateStr.includes('-')) {
        const parts = dateStr.split('-')
        monthIdx = parseInt(parts[1], 10) - 1
        year = parseInt(parts[0], 10)
      }
      if (year === Number(targetsYearFilter)) {
        if (monthIdx >= 0 && monthIdx <= 11) {
          achieved[monthIdx] = (achieved[monthIdx] || 0) + Number(r.amount || 0)
        }
      }
    }
    return MONTH_NAMES.map((m, i) => {
      const act = achieved[i] || 0
      return {
        month: m,
        target: MONTHLY_TARGET,
        achieved: act,
        pct: MONTHLY_TARGET > 0 ? Math.round((act / MONTHLY_TARGET) * 100) : 0
      }
    })
  }, [data?.revenue_details, targetsYearFilter])

  const availableYears = useMemo(() => {
    const years = new Set([new Date().getFullYear(), 2025, 2024])
    const revList = data?.revenue_details || []
    for (const r of revList) {
      const dateStr = r.date || ''
      let year = -1
      if (dateStr.includes('/')) {
        year = parseInt(dateStr.split('/')[2], 10)
      } else if (dateStr.includes('-')) {
        year = parseInt(dateStr.split('-')[0], 10)
      }
      if (year > 2000) years.add(year)
    }
    return Array.from(years).sort((a, b) => b - a)
  }, [data?.revenue_details])

  const handleExportStatement = (format) => {
    const statementRows = [
      { Metric: 'Total Realized Revenue (Won Deals)', Amount: `₹${totalRevenue.toLocaleString()}` },
      { Metric: 'Active Open Pipeline', Amount: `₹${totalPipeline.toLocaleString()}` },
      { Metric: 'Annual Sales Target', Amount: `₹${ANNUAL_TARGET.toLocaleString()} (₹${(ANNUAL_TARGET / 10000000).toFixed(2)} Cr)` },
      { Metric: 'Target Achievement %', Amount: `${targetAchievementRate}%` },
      { Metric: 'Total Operational Expenses', Amount: `₹${totalOperationalExpenses.toLocaleString()}` },
      { Metric: 'Net Profit', Amount: `₹${netProfit.toLocaleString()}` },
      { Metric: 'Net Margin %', Amount: `${netProfitMargin}%` },
      { Metric: 'Won Deals Count', Amount: `${totalWonDealsCount} Deals` },
      { Metric: 'Unique Client Accounts', Amount: `${totalCustomersCount} Accounts` },
    ]

    if (format === 'csv') {
      exportToCSV('CEO_Sales_Revenue_Statement', statementRows)
    } else if (format === 'excel') {
      exportToExcel('CEO_Sales_Revenue_Statement', statementRows)
    } else if (format === 'pdf') {
      exportToPDF(
        'CEO_Sales_Revenue_Statement',
        'Twite Connect - CEO Executive Sales & Revenue Statement',
        statementRows
      )
    }
    showToast(`Financial statement exported as ${format.toUpperCase()}`, 'success')
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-[#F8CAE4]/25 text-[#832D51]">
              <TrendingUp className="size-4.5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Sales & Revenue
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Unified executive command center: Sales pipeline, won revenue, targets, operational expenses, and net margin
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Date range switcher */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 text-xs font-bold border border-slate-200">
            {['Today', 'This Week', 'This Month', 'Custom Date'].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setDateFilter(t)
                  if (t !== 'Custom Date') setCustomRangeApplied(null)
                }}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  dateFilter === t
                    ? 'bg-[#832D51] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={fetchUnifiedData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-700 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Custom Date Form Block */}
      {dateFilter === 'Custom Date' && (
        <form
          onSubmit={handleApplyCustomRange}
          className="flex items-center gap-3 bg-white p-4 border border-slate-200 rounded-2xl shadow-2xs flex-wrap"
        >
          <div className="flex items-center gap-2">
            <label className="text-xs font-black text-slate-500 uppercase">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#832D51]"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-black text-slate-500 uppercase">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#832D51]"
              required
            />
          </div>
          <button
            type="submit"
            className="bg-[#832D51] hover:bg-[#6a2240] text-white text-xs font-bold px-4 py-1.5 rounded-xl transition cursor-pointer"
          >
            Apply Range
          </button>
        </form>
      )}

      {/* ── 1. Top Summary Cards (8 Key Executive KPIs) ────────────────────── */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Revenue */}
        <button
          onClick={() => {
            setShowFinancialReportModal(true)
          }}
          className={`text-left rounded-2xl p-4.5 border transition-all duration-200 relative overflow-hidden group cursor-pointer ${
            activeKpi === 'revenue' && wonToggle
              ? 'bg-[#832D51] text-white border-[#832D51] shadow-md shadow-[#832D51]/15 ring-2 ring-[#832D51]'
              : 'bg-white text-slate-900 border-slate-200/90 hover:border-[#832D51]'
          }`}
        >
          <div className="flex justify-between items-start">
            <span
              className={`text-[10px] font-black uppercase tracking-wider ${
                activeKpi === 'revenue' && wonToggle ? 'text-pink-200' : 'text-slate-400'
              }`}
            >
              Total Revenue
            </span>
            <span
              className={`grid size-7 place-items-center rounded-lg ${
                activeKpi === 'revenue' && wonToggle
                  ? 'bg-white/20 text-white'
                  : 'bg-pink-50 text-[#832D51]'
              }`}
            >
              <DollarSign className="size-4" />
            </span>
          </div>
          <p className="text-2xl font-black tracking-tight mt-2.5">
            ₹{totalRevenue.toLocaleString()}
          </p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100/60">
            <span
              className={`text-[10px] font-bold ${
                activeKpi === 'revenue' && wonToggle ? 'text-pink-100' : 'text-slate-500'
              }`}
            >
              Realized won deals
            </span>
            <span className="inline-flex items-center rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-black text-emerald-700">
              Won
            </span>
          </div>
        </button>

        {/* Card 2: Total Customers */}
        <button
          onClick={() => {
            setActiveKpi('customers')
            setWonToggle(false)
          }}
          className={`text-left rounded-2xl p-4.5 border transition-all duration-200 relative overflow-hidden group cursor-pointer ${
            activeKpi === 'customers' && !wonToggle
              ? 'bg-[#832D51] text-white border-[#832D51] shadow-md shadow-[#832D51]/15 ring-2 ring-[#832D51]'
              : 'bg-white text-slate-900 border-slate-200/90 hover:border-[#832D51]'
          }`}
        >
          <div className="flex justify-between items-start">
            <span
              className={`text-[10px] font-black uppercase tracking-wider ${
                activeKpi === 'customers' && !wonToggle ? 'text-pink-200' : 'text-slate-400'
              }`}
            >
              Total Customers
            </span>
            <span
              className={`grid size-7 place-items-center rounded-lg ${
                activeKpi === 'customers' && !wonToggle
                  ? 'bg-white/20 text-white'
                  : 'bg-blue-50 text-blue-600'
              }`}
            >
              <Building2 className="size-4" />
            </span>
          </div>
          <p className="text-2xl font-black tracking-tight mt-2.5">
            {totalCustomersCount}
          </p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100/60">
            <span
              className={`text-[10px] font-bold ${
                activeKpi === 'customers' && !wonToggle ? 'text-pink-100' : 'text-slate-500'
              }`}
            >
              Accounts in period
            </span>
            <span className="text-[9px] font-black text-slate-400">Directory</span>
          </div>
        </button>

        {/* Card 3: Won Deals */}
        <div className="bg-white text-slate-900 border border-slate-200/90 rounded-2xl p-4.5 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Won Deals
            </span>
            <span className="grid size-7 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="size-4" />
            </span>
          </div>
          <p className="text-2xl font-black tracking-tight mt-2.5 text-slate-900">
            {totalWonDealsCount}
          </p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-500">Converted orders</span>
            <span className="text-[9px] font-bold text-emerald-600">Closed</span>
          </div>
        </div>

        {/* Card 4: Net Margin (replaced Open Pipeline) */}
        <div className="bg-white text-slate-900 border border-slate-200/90 rounded-2xl p-4.5 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Net Margin</span>
            <span className="grid size-7 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="size-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-2.5">
            <p className="text-2xl font-black tracking-tight text-slate-900">{netProfitMargin}%</p>
            <span className="text-xs font-bold text-slate-400">margin</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-500">₹{netProfit.toLocaleString()} net</span>
            <span className="text-[9px] font-bold text-emerald-600">After Expenses</span>
          </div>
        </div>

        {/* Card: Target Achieved */}
        <button
          onClick={() => setShowTargetsModal(true)}
          className="text-left bg-white text-slate-900 border border-slate-200/90 hover:border-[#832D51] rounded-2xl p-4.5 shadow-xs transition-all duration-200 cursor-pointer focus:outline-none"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Target Achieved
            </span>
            <span className="grid size-7 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
              <Target className="size-4" />
            </span>
          </div>
          <p className="text-2xl font-black tracking-tight mt-2.5 text-slate-900">
            {targetAchievementRate}%
          </p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-500">YTD Target Progress</span>
            <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-black ${
              Number(targetAchievementRate) >= 100 
                ? 'bg-emerald-500/15 text-emerald-700' 
                : 'bg-indigo-500/15 text-indigo-700'
            }`}>
              Target
            </span>
          </div>
        </button>

        <div className="bg-white text-slate-900 border border-slate-200/90 rounded-2xl p-4.5 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Approved Expense Claims
            </span>
            <span className="grid size-7 place-items-center rounded-lg bg-rose-50 text-rose-600">
              <Wallet className="size-4" />
            </span>
          </div>
          <p className="text-2xl font-black tracking-tight mt-2.5 text-slate-900">
            ₹{totalOperationalExpenses.toLocaleString()}
          </p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-500">
              {approvedExpenseCount > 0
                ? `${approvedExpenseCount} manager-approved claim${approvedExpenseCount !== 1 ? 's' : ''}`
                : 'Executive field claims'}
            </span>
            <span className="text-[9px] font-bold text-rose-600">Approved</span>
          </div>
        </div>

        {/* Old Net Margin card removed from row 2 — now shown in row 1 */}
      </div>

      {/* ── Product Performance Cards Row ────────────────────────────────────── */}
      {productAnalytics.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {productAnalytics.map((p, idx) => {
            const isTop = idx === 0
            const isLow = idx === productAnalytics.length - 1 && productAnalytics.length > 1
            return (
              <button
                key={p.product}
                onClick={() => setSelectedProduct(selectedProduct?.product === p.product ? null : p)}
                className={`text-left rounded-2xl p-4 border transition-all duration-200 cursor-pointer ${
                  selectedProduct?.product === p.product
                    ? 'bg-[#832D51] text-white border-[#832D51] shadow-md ring-2 ring-[#832D51]/25'
                    : 'bg-white border-slate-200/90 hover:border-[#832D51] hover:shadow-sm'
                }`}
              >
                {/* Rank + share row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    {isTop && <span className="text-[10px]">🏆</span>}
                    {isLow && <span className="text-[10px]">📉</span>}
                    <span className={`text-[9px] font-black rounded-full px-2 py-0.5 ${
                      selectedProduct?.product === p.product
                        ? 'bg-white/20 text-white'
                        : isTop ? 'bg-emerald-50 text-emerald-700'
                        : isLow ? 'bg-rose-50 text-rose-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}>#{idx + 1}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${
                      selectedProduct?.product === p.product ? 'text-pink-200' : 'text-slate-400'
                    }`}>Product</span>
                  </div>
                  <span className={`text-[9px] font-black ${
                    selectedProduct?.product === p.product ? 'text-pink-200' : 'text-slate-400'
                  }`}>{p.share}% share</span>
                </div>

                {/* Product name */}
                <p className={`text-xs font-black leading-tight mb-2.5 ${
                  selectedProduct?.product === p.product ? 'text-white' : 'text-slate-900'
                }`}>{p.product}</p>

                {/* Revenue bar */}
                <div className={`w-full rounded-full h-1.5 mb-2 overflow-hidden ${
                  selectedProduct?.product === p.product ? 'bg-white/25' : 'bg-slate-100'
                }`}>
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      selectedProduct?.product === p.product ? 'bg-white'
                      : isTop ? 'bg-emerald-500'
                      : isLow ? 'bg-rose-400'
                      : 'bg-[#832D51]'
                    }`}
                    style={{ width: `${p.bar_pct}%` }}
                  />
                </div>

                <p className={`text-xl font-black ${
                  selectedProduct?.product === p.product ? 'text-white' : 'text-slate-950'
                }`}>₹{p.revenue.toLocaleString()}</p>

                <div className={`flex items-center justify-between mt-1.5 pt-2 border-t text-[9px] font-bold ${
                  selectedProduct?.product === p.product
                    ? 'text-pink-100 border-white/20'
                    : 'text-slate-400 border-slate-100'
                }`}>
                  <span>{p.deals} client{p.deals !== 1 ? 's' : ''}</span>
                  <span>Avg ₹{p.avg_deal.toLocaleString()}</span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Product Detail Panel ─────────────────────────────────────────────── */}
      {selectedProduct && (
        <div className="rounded-2xl border border-[#832D51]/20 overflow-hidden bg-white shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-[#832D51] text-white">
            <div className="flex items-center gap-2.5">
              <Layers className="size-4" />
              <div>
                <p className="text-sm font-black">{selectedProduct.product}</p>
                <p className="text-[10px] text-pink-200 font-semibold">
                  ₹{selectedProduct.revenue.toLocaleString()} · {selectedProduct.deals} clients · {selectedProduct.share}% revenue share
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedProduct(null)}
              className="grid size-7 place-items-center rounded-lg bg-white/15 hover:bg-white/25 transition cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {/* KPI tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 border-b border-slate-100">
            {[
              { label: 'Total Revenue', value: `₹${selectedProduct.revenue.toLocaleString()}`, color: 'text-[#832D51]' },
              { label: 'Total Clients', value: selectedProduct.deals, color: 'text-slate-900' },
              { label: 'Avg Deal Size', value: `₹${selectedProduct.avg_deal.toLocaleString()}`, color: 'text-indigo-700' },
              { label: 'Revenue Share', value: `${selectedProduct.share}%`, color: 'text-emerald-700' },
            ].map(m => (
              <div key={m.label} className="bg-slate-50 rounded-xl border border-slate-200/80 p-3.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{m.label}</span>
                <p className={`text-lg font-black mt-1 ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Clients + Team */}
          <div className="grid gap-5 lg:grid-cols-3 p-5">
            {/* Client table */}
            <div className="lg:col-span-2 space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500">Clients using this product</h4>
              <div className="rounded-xl border border-slate-200/80 overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/60 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                      <th className="px-4 py-2.5">Client</th>
                      <th className="px-4 py-2.5">Company</th>
                      <th className="px-4 py-2.5">Executive</th>
                      <th className="px-4 py-2.5 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {selectedProduct.customers.length === 0 ? (
                      <tr><td colSpan={4} className="py-6 text-center text-slate-400 font-bold text-[10px]">No client data</td></tr>
                    ) : selectedProduct.customers.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-2.5 font-bold text-slate-900 text-[11px]">{c.name}</td>
                        <td className="px-4 py-2.5 text-slate-500 text-[10px]">{c.company || '—'}</td>
                        <td className="px-4 py-2.5 text-slate-600 text-[10px]">{c.executive}</td>
                        <td className="px-4 py-2.5 text-right font-black text-[#832D51] text-[11px]">₹{c.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Executives & Managers */}
            <div className="space-y-4">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Executives Selling</h4>
                {selectedProduct.executives.length === 0 ? (
                  <p className="text-[10px] text-slate-400 font-semibold">—</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedProduct.executives.map(e => (
                      <div key={e} className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2">
                        <span className="size-5 rounded-full bg-[#F8CAE4]/40 text-[#832D51] text-[9px] font-black grid place-items-center">
                          {(e || '?')[0].toUpperCase()}
                        </span>
                        <span className="text-[11px] font-bold text-slate-800 truncate">{e}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Under Managers</h4>
                {selectedProduct.managers.length === 0 ? (
                  <p className="text-[10px] text-slate-400 font-semibold">—</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedProduct.managers.map(m => (
                      <div key={m} className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2">
                        <span className="size-5 rounded-full bg-indigo-50 text-indigo-700 text-[9px] font-black grid place-items-center">
                          {(m || '?')[0].toUpperCase()}
                        </span>
                        <span className="text-[11px] font-bold text-slate-800 truncate">{m}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Sales Performance Section ───────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-lg bg-[#F8CAE4]/25 text-[#832D51]">
                <SlidersHorizontal className="size-3.5" />
              </span>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Sales Performance & Ledger Database
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Live customer accounts, deal closures, and sales breakdown
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
              <button
                onClick={() => setWonToggle(false)}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  !wonToggle ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Customers ({totalCustomersCount})
              </button>
              <button
                onClick={() => setWonToggle(true)}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  wonToggle ? 'bg-[#832D51] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Won Deals ({totalWonDealsCount})
              </button>
            </div>
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer, company, executive..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#832D51] transition"
            />
          </div>

          <select
            value={managerFilter}
            onChange={(e) => setManagerFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#832D51] cursor-pointer"
          >
            <option value="All">All Sales Managers</option>
            {uniqueManagers.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={executiveFilter}
            onChange={(e) => setExecutiveFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#832D51] cursor-pointer"
          >
            <option value="All">All Sales Executives</option>
            {uniqueExecutives.map((ex) => (
              <option key={ex} value={ex}>
                {ex}
              </option>
            ))}
          </select>
        </div>

        {/* Detailed Table */}
        <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            {wonToggle ? (
              // Won Ledger Table
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="px-5 py-3">Closure Date</th>
                    <th className="px-5 py-3">Sales Manager</th>
                    <th className="px-5 py-3">Sales Executive</th>
                    <th className="px-5 py-3">Client / Company</th>
                    <th className="px-5 py-3 text-right">Realized Won Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredRevenue.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">
                        No won transaction records found for the applied filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRevenue.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3.5 text-slate-900 font-bold">{row.date}</td>
                        <td className="px-5 py-3.5 text-slate-600">{row.sales_manager}</td>
                        <td className="px-5 py-3.5 text-slate-600">{row.sales_executive}</td>
                        <td className="px-5 py-3.5 text-slate-900 font-bold">{row.customer}</td>
                        <td className="px-5 py-3.5 text-right font-black text-[#832D51]">
                          ₹{(row.amount || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              // Customers Directory Table
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="px-5 py-3">Sales Manager</th>
                    <th className="px-5 py-3">Sales Executive</th>
                    <th className="px-5 py-3">Customer Name</th>
                    <th className="px-5 py-3">Company</th>
                    <th className="px-5 py-3">Product / Service</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Contract Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                        No customer accounts found for the applied filter.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3.5 text-slate-600">{row.sales_manager}</td>
                        <td className="px-5 py-3.5 text-slate-600">{row.sales_executive}</td>
                        <td className="px-5 py-3.5 font-bold text-slate-900">{row.customer_name}</td>
                        <td className="px-5 py-3.5 text-slate-500">{row.company}</td>
                        <td className="px-5 py-3.5 text-slate-600">{row.product}</td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center rounded-md bg-[#CFDD9D]/20 px-2 py-0.5 font-extrabold text-[#3a7d63] text-[10px]">
                            {row.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-black text-slate-950">
                          ₹{(row.amount || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Reconciled Summary Totals */}
        <div className="flex justify-end pt-1">
          <div className="bg-[#F8CAE4]/20 border border-[#EA6993]/20 rounded-2xl px-5 py-2.5 text-right">
            {wonToggle ? (
              <>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                  Filtered Won Revenue
                </span>
                <span className="text-lg font-black text-[#832D51] mt-0.5 block">
                  ₹{liveReconciledRevenue.toLocaleString()}
                </span>
              </>
            ) : (
              <>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                  Filtered Customers Count
                </span>
                <span className="text-lg font-black text-[#832D51] mt-0.5 block">
                  {liveReconciledCustomersCount} Clients
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Performance Tables (Manager & Executive) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Manager-wise Performance */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
              Sales Manager Performance
            </h3>
            <span className="text-[10px] font-bold text-slate-400">Click row to filter</span>
          </div>
          <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="px-4 py-2.5">Sales Manager</th>
                    <th className="px-4 py-2.5 text-center">Execs</th>
                    <th className="px-4 py-2.5 text-center">Clients</th>
                    <th className="px-4 py-2.5 text-center">Won</th>
                    <th className="px-4 py-2.5">Won Revenue</th>
                    <th className="px-4 py-2.5 text-center">Share %</th>
                    <th className="px-4 py-2.5 text-right">Pipeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {!data?.manager_performance || data.manager_performance.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400 font-bold">
                        No manager records found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    data.manager_performance.map((mgr, i) => {
                      const wonRev = safeNum(mgr.won_revenue)
                      const pip = safeNum(mgr.pipeline)
                      const sharePct = totalRevenue > 0 ? ((wonRev / totalRevenue) * 100).toFixed(1) : '0.0'
                      return (
                        <tr
                          key={i}
                          onClick={() => setManagerFilter(mgr.sales_manager)}
                          className={`hover:bg-slate-50/60 cursor-pointer transition ${
                            managerFilter === mgr.sales_manager ? 'bg-[#F8CAE4]/15' : ''
                          }`}
                        >
                          <td className="px-4 py-3 font-bold text-[#832D51]">{mgr.sales_manager || '—'}</td>
                          <td className="px-4 py-3 text-slate-600 text-center">{safeNum(mgr.executives)}</td>
                          <td className="px-4 py-3 text-slate-600 text-center">{safeNum(mgr.customers)}</td>
                          <td className="px-4 py-3 text-emerald-700 font-bold text-center">{safeNum(mgr.won_deals)}</td>
                          <td className="px-4 py-3 font-black text-slate-900">₹{wonRev.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-black text-indigo-700">
                              {sharePct}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500">₹{pip.toLocaleString()}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Executive-wise Performance */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
              Sales Executive Performance
            </h3>
            <span className="text-[10px] font-bold text-slate-400">Click row to filter</span>
          </div>
          <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="px-4 py-2.5">Sales Executive</th>
                    <th className="px-4 py-2.5">Manager</th>
                    <th className="px-4 py-2.5 text-center">Clients</th>
                    <th className="px-4 py-2.5 text-center">Won</th>
                    <th className="px-4 py-2.5">Won Revenue</th>
                    <th className="px-4 py-2.5 text-center">Share %</th>
                    <th className="px-4 py-2.5 text-right">Pipeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {!data?.executive_performance || data.executive_performance.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400 font-bold">
                        No executive records found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    data.executive_performance.map((exec, i) => {
                      const wonRev = safeNum(exec.won_revenue)
                      const pip = safeNum(exec.pipeline)
                      const sharePct = totalRevenue > 0 ? ((wonRev / totalRevenue) * 100).toFixed(1) : '0.0'
                      return (
                        <tr
                          key={i}
                          onClick={() => {
                            setExecutiveFilter(exec.sales_executive)
                            setManagerFilter(exec.sales_manager)
                          }}
                          className={`hover:bg-slate-50/60 cursor-pointer transition ${
                            executiveFilter === exec.sales_executive ? 'bg-[#F8CAE4]/15' : ''
                          }`}
                        >
                          <td className="px-4 py-3 font-bold text-slate-900">{exec.sales_executive || '—'}</td>
                          <td className="px-4 py-3 text-slate-500">{exec.sales_manager || '—'}</td>
                          <td className="px-4 py-3 text-slate-600 text-center">{safeNum(exec.customers)}</td>
                          <td className="px-4 py-3 text-emerald-700 font-bold text-center">{safeNum(exec.won_deals)}</td>
                          <td className="px-4 py-3 font-black text-[#832D51]">₹{wonRev.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                              {sharePct}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500">₹{pip.toLocaleString()}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── DETAIL FINANCIAL PROFIT & LOSS BREAKDOWN MODAL ── */}
      {showFinancialReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-[#832D51] text-white">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-white/20 text-white">
                  <TrendingUp className="size-5" />
                </span>
                <div>
                  <h3 className="text-base font-black tracking-tight">Financial Profit & Loss Statement</h3>
                  <p className="text-[10px] font-bold text-pink-100 uppercase tracking-widest mt-0.5">Real-time Revenue, Reimbursements & Incentives analysis</p>
                </div>
              </div>
              <button
                onClick={() => setShowFinancialReportModal(false)}
                className="rounded-xl p-1.5 text-pink-100 hover:bg-white/10 hover:text-white transition cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Time period switcher & Custom range inputs */}
            <div className="p-6 pb-2 border-b border-slate-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/60">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider px-2">Select statement period</span>
                <div className="flex bg-slate-200/60 p-1 rounded-xl">
                  {['Monthly', 'Yearly', 'Custom'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setModalTimeFilter(filter)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                        modalTimeFilter === filter ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {modalTimeFilter === 'Custom' && (
                <div className="flex items-center gap-3 bg-slate-50/50 p-3.5 border border-slate-200/50 rounded-2xl flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">From</label>
                    <input
                      type="date"
                      value={modalFromDate}
                      onChange={(e) => setModalFromDate(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#832D51]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">To</label>
                    <input
                      type="date"
                      value={modalToDate}
                      onChange={(e) => setModalToDate(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#832D51]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Scrollable breakdown content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Financial Calculation Formula block */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* 1. Revenue */}
                <div className="bg-slate-50 border border-slate-200/70 p-4.5 rounded-2xl relative">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-[10px] font-black uppercase tracking-wider">Total Sales Revenue</span>
                    <DollarSign className="size-4 text-[#832D51]" />
                  </div>
                  <h4 className="text-xl font-black text-slate-900 mt-2">₹{modalTotalRevenue.toLocaleString()}</h4>
                  <p className="text-[9px] text-slate-400 font-bold mt-1">Sum of closed won deals</p>
                </div>

                {/* 2. Reimbursements */}
                <div className="bg-slate-50 border border-slate-200/70 p-4.5 rounded-2xl relative">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-[10px] font-black uppercase tracking-wider">Reimbursements</span>
                    <Wallet className="size-4 text-[#832D51]" />
                  </div>
                  <h4 className="text-xl font-black text-slate-900 mt-2">₹{modalTotalReimbursements.toLocaleString()}</h4>
                  <p className="text-[9px] text-slate-400 font-bold mt-1">Approved executive expense claims</p>
                </div>

                {/* 3. Incentives Given */}
                <div className="bg-slate-50 border border-slate-200/70 p-4.5 rounded-2xl relative">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-[10px] font-black uppercase tracking-wider">Incentives Given</span>
                    <Award className="size-4 text-[#832D51]" />
                  </div>
                  <h4 className="text-xl font-black text-slate-900 mt-2">₹{modalTotalIncentives.toLocaleString()}</h4>
                  <p className="text-[9px] text-slate-400 font-bold mt-1">Commission earned by executives</p>
                </div>

                {/* 4. Net Profit / Loss */}
                <div className={`p-4.5 rounded-2xl border relative ${
                  isProfit 
                    ? 'bg-emerald-50/60 border-emerald-200/80 text-emerald-950' 
                    : 'bg-red-50/60 border-red-200/80 text-red-950'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-wider opacity-85">
                      {isProfit ? 'Net Profit' : 'Net Loss'}
                    </span>
                    <Sparkles className={`size-4 ${isProfit ? 'text-emerald-600' : 'text-red-600'}`} />
                  </div>
                  <h4 className="text-xl font-black mt-2">₹{Math.abs(netProfitLoss).toLocaleString()}</h4>
                  <p className="text-[9px] font-bold mt-1 opacity-70">
                    {isProfit ? 'Revenue - Expenses = Profit' : 'Expenses exceeded Revenue'}
                  </p>
                </div>
              </div>

              {/* Date-wise Sales Ledger List */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="size-4 text-slate-400" />
                    Date-wise Transaction Ledger ({modalRevenueRecords.length + modalReimbursementRecords.length} records)
                  </h4>
                  <span className="text-[10px] font-black text-[#832D51] bg-[#F8CAE4]/25 px-2.5 py-1 rounded-md">
                    Total Revenue: ₹{modalTotalRevenue.toLocaleString()}
                  </span>
                </div>

                <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto max-h-[300px]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider">
                          <th className="px-4 py-2.5">Date</th>
                          <th className="px-4 py-2.5">Transaction Details</th>
                          <th className="px-4 py-2.5">Employee / Executive</th>
                          <th className="px-4 py-2.5 text-right">Revenue Amount</th>
                          <th className="px-4 py-2.5 text-right">Reimbursement</th>
                          <th className="px-4 py-2.5 text-right">Incentive</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                        {unifiedModalLedger.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-10 text-center text-slate-400 font-bold">
                              No transactions recorded for this period.
                            </td>
                          </tr>
                        ) : (
                          unifiedModalLedger.map((group) => (
                            <React.Fragment key={group.date}>
                              {/* Daily Summary Row */}
                              <tr className="bg-slate-50/70 border-b border-slate-200">
                                <td className="px-4 py-2 font-black text-slate-900">{group.date}</td>
                                <td colSpan={2} className="px-4 py-2 text-slate-400 font-bold text-[10px] uppercase">Daily Subtotal</td>
                                <td className="px-4 py-2 text-right font-black text-slate-950">
                                  {group.totalRevenue > 0 ? `₹${group.totalRevenue.toLocaleString()}` : '—'}
                                </td>
                                <td className="px-4 py-2 text-right font-black text-amber-700">
                                  {group.totalReimbursements > 0 ? `₹${group.totalReimbursements.toLocaleString()}` : '—'}
                                </td>
                                <td className="px-4 py-2 text-right font-black text-emerald-700">
                                  {group.totalIncentives > 0 ? `₹${group.totalIncentives.toLocaleString()}` : '—'}
                                </td>
                              </tr>
                              {/* Daily Transactions */}
                              {group.transactions.map((tx, idx) => (
                                <tr key={`${group.date}-${tx.id || idx}`} className="hover:bg-slate-50/30">
                                  <td className="px-4 py-2.5 pl-6 text-slate-400 font-mono text-[10px]">↳ {tx.type}</td>
                                  <td className="px-4 py-2.5 text-slate-600 font-semibold">{tx.details || '—'}</td>
                                  <td className="px-4 py-2.5 text-slate-600">{tx.sales_executive}</td>
                                  <td className="px-4 py-2.5 text-right font-bold text-slate-700">
                                    {tx.amount > 0 ? `₹${tx.amount.toLocaleString()}` : '—'}
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-bold text-amber-700">
                                    {tx.reimbursement > 0 ? `₹${tx.reimbursement.toLocaleString()}` : '—'}
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">
                                    {tx.incentive > 0 ? `₹${tx.incentive.toLocaleString()}` : '—'}
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4.5 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowFinancialReportModal(false)}
                className="bg-[#832D51] hover:bg-[#6c2442] text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DETAIL TARGETS BREAKDOWN MODAL ── */}
      {showTargetsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-[#832D51] text-white">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-white/20 text-white">
                  <Target className="size-5" />
                </span>
                <div>
                  <h3 className="text-base font-black tracking-tight">Monthly Sales Target vs Achieved</h3>
                  <p className="text-[10px] font-bold text-pink-100 uppercase tracking-widest mt-0.5">Yearly Performance Analysis Statement</p>
                </div>
              </div>
              <button
                onClick={() => setShowTargetsModal(false)}
                className="rounded-xl p-1.5 text-pink-100 hover:bg-white/10 hover:text-white transition cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Year Selector */}
            <div className="p-6 pb-2 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50 border-slate-200/60">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider px-2">Select Target Year</span>
              <select
                value={targetsYearFilter}
                onChange={(e) => setTargetsYearFilter(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#832D51] cursor-pointer shadow-xs"
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y} Target Year</option>
                ))}
              </select>
            </div>

            {/* Scrollable table content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="px-5 py-3">Month</th>
                      <th className="px-5 py-3 text-right">Target Value</th>
                      <th className="px-5 py-3 text-right">Achieved Value</th>
                      <th className="px-5 py-3 text-center">Achievement %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {modalTargetsData.map((m) => (
                      <tr key={m.month} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3.5 font-bold text-slate-900">{m.month}</td>
                        <td className="px-5 py-3.5 text-right text-slate-500">₹{m.target.toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-right font-black text-slate-900">
                          ₹{m.achieved.toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-black border ${
                            m.achieved >= m.target
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : m.pct >= 60
                              ? 'bg-amber-50 text-amber-700 border-amber-100'
                              : 'bg-rose-50 text-rose-700 border-rose-100'
                          }`}>
                            {m.pct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4.5 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowTargetsModal(false)}
                className="bg-[#832D51] hover:bg-[#6c2442] text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SalesOverview
