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

  // Interactive Active View State
  const [activeKpi, setActiveKpi] = useState('revenue') // 'revenue' | 'customers' | 'won' | 'pipeline'
  const [wonToggle, setWonToggle] = useState(false) // false: All Customers, true: Won Deals only

  // Table filters
  const [searchQuery, setSearchQuery] = useState('')
  const [managerFilter, setManagerFilter] = useState('All')
  const [executiveFilter, setExecutiveFilter] = useState('All')

  // Date range resolver helper
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
        end: end.toISOString().split('T')[0],
      }
    }
    if (range === 'This Month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
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
        expenseAPI.getExpenses(),
      ])

      if (salesRes.status === 'fulfilled' && salesRes.value?.data) {
        setData(salesRes.value.data)
      } else if (salesRes.status === 'rejected') {
        throw salesRes.reason
      }

      if (dashRes.status === 'fulfilled' && dashRes.value?.data) {
        setDashboardData(dashRes.value.data)
      }

      if (expRes.status === 'fulfilled' && expRes.value?.data) {
        const list = Array.isArray(expRes.value.data) ? expRes.value.data : []
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

  // Filtered operational expenses based on active date boundaries
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

    if (!rawExpenses || rawExpenses.length === 0) {
      return Number(dashboardData?.metrics?.totalExpenses || 0)
    }

    let filtered = rawExpenses
    if (startLimit && endLimit) {
      filtered = rawExpenses.filter((e) => {
        const expDate = e.claim_date || e.date || e.created_at
        if (!expDate) return true
        const dStr = String(expDate).substring(0, 10)
        return dStr >= startLimit && dStr <= endLimit
      })
    }

    const sum = filtered.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
    return sum > 0 ? sum : Number(dashboardData?.metrics?.totalExpenses || 0)
  }, [rawExpenses, dateFilter, customRangeApplied, dashboardData])

  // Key Financial & Sales Metrics (Realized, Pipeline, Target, Net Margin)
  const totalRevenue = Number(data?.metrics?.total_revenue || 0)
  const totalPipeline = Number(data?.metrics?.total_pipeline_value || 0)
  const totalCustomersCount = Number(data?.metrics?.total_customers || 0)
  const totalWonDealsCount = Number(data?.metrics?.total_won_deals || 0)

  const targetAchievementRate =
    ANNUAL_TARGET > 0 ? ((totalRevenue / ANNUAL_TARGET) * 100).toFixed(1) : '0.0'
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
      const wonRev = Number(mgr.won_revenue || 0)
      const sharePct =
        totalRevenue > 0 ? ((wonRev / totalRevenue) * 100).toFixed(1) : '0.0'
      return {
        manager: mgr.sales_manager,
        won_revenue: wonRev,
        won_deals: mgr.won_deals || 0,
        pipeline: mgr.pipeline || 0,
        share: `${sharePct}%`,
        shareNum: Number(sharePct),
      }
    })
  }, [data?.manager_performance, totalRevenue])

  // Top Revenue Closer Executives for Financial Section
  const executiveLeaderboard = useMemo(() => {
    if (!data?.executive_performance || data.executive_performance.length === 0) return []
    return data.executive_performance.map((exec) => {
      const wonRev = Number(exec.won_revenue || 0)
      const sharePct =
        totalRevenue > 0 ? ((wonRev / totalRevenue) * 100).toFixed(1) : '0.0'
      return {
        executive: exec.sales_executive,
        manager: exec.sales_manager,
        won_revenue: wonRev,
        won_deals: exec.won_deals || 0,
        pipeline: exec.pipeline || 0,
        share: `${sharePct}%`,
      }
    })
  }, [data?.executive_performance, totalRevenue])

  // Financial Statement Export Handler
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
            setActiveKpi('revenue')
            setWonToggle(true)
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

        {/* Card 4: Open Pipeline */}
        <div className="bg-white text-slate-900 border border-slate-200/90 rounded-2xl p-4.5 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Open Pipeline
            </span>
            <span className="grid size-7 place-items-center rounded-lg bg-amber-50 text-amber-600">
              <Clock className="size-4" />
            </span>
          </div>
          <p className="text-2xl font-black tracking-tight mt-2.5 text-slate-900">
            ₹{totalPipeline.toLocaleString()}
          </p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-500">In negotiation / proposal</span>
            <span className="text-[9px] font-bold text-amber-600">Unclosed</span>
          </div>
        </div>

        {/* Card 5: Annual Target */}
        <div className="bg-white text-slate-900 border border-slate-200/90 rounded-2xl p-4.5 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Annual Target
            </span>
            <span className="grid size-7 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
              <Target className="size-4" />
            </span>
          </div>
          <p className="text-2xl font-black tracking-tight mt-2.5 text-slate-900">
            ₹{(ANNUAL_TARGET / 10000000).toFixed(2)} Cr
          </p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-500">Org sales benchmark</span>
            <span className="text-[9px] font-bold text-indigo-600">₹3.50 Cr Goal</span>
          </div>
        </div>

        {/* Card 6: Target Achievement % */}
        <div className="bg-white text-slate-900 border border-slate-200/90 rounded-2xl p-4.5 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Target Achievement
            </span>
            <span className="grid size-7 place-items-center rounded-lg bg-purple-50 text-purple-600">
              <Award className="size-4" />
            </span>
          </div>
          <p className="text-2xl font-black tracking-tight mt-2.5 text-slate-900">
            {targetAchievementRate}%
          </p>
          <div className="mt-2 pt-2 border-t border-slate-100">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-1.5 rounded-full bg-[#832D51] transition-all duration-500"
                style={{ width: `${Math.min(100, Number(targetAchievementRate))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 7: Operational Expenses */}
        <div className="bg-white text-slate-900 border border-slate-200/90 rounded-2xl p-4.5 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Operational Expenses
            </span>
            <span className="grid size-7 place-items-center rounded-lg bg-rose-50 text-rose-600">
              <Wallet className="size-4" />
            </span>
          </div>
          <p className="text-2xl font-black tracking-tight mt-2.5 text-slate-900">
            ₹{totalOperationalExpenses.toLocaleString()}
          </p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-500">Field claims & operations</span>
            <span className="text-[9px] font-bold text-rose-600">Cost Outlay</span>
          </div>
        </div>

        {/* Card 8: Net Margin */}
        <div className="bg-white text-slate-900 border border-slate-200/90 rounded-2xl p-4.5 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Net Margin
            </span>
            <span className="grid size-7 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="size-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2.5">
            <p className="text-2xl font-black tracking-tight text-slate-900">
              {netProfitMargin}%
            </p>
            <span className="text-xs font-bold text-slate-500">
              (₹{netProfit.toLocaleString()})
            </span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-500">Realized Rev - Expenses</span>
            <span className="text-[9px] font-bold text-emerald-600">Net Margin</span>
          </div>
        </div>
      </div>

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
                    <th className="px-4 py-2.5 text-right">Pipeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {!data?.manager_performance || data.manager_performance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400 font-bold">
                        No manager records found.
                      </td>
                    </tr>
                  ) : (
                    data.manager_performance.map((mgr, i) => (
                      <tr
                        key={i}
                        onClick={() => setManagerFilter(mgr.sales_manager)}
                        className={`hover:bg-slate-50/60 cursor-pointer transition ${
                          managerFilter === mgr.sales_manager ? 'bg-[#F8CAE4]/15' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-bold text-[#832D51]">{mgr.sales_manager}</td>
                        <td className="px-4 py-3 text-slate-600 text-center">{mgr.executives}</td>
                        <td className="px-4 py-3 text-slate-600 text-center">{mgr.customers}</td>
                        <td className="px-4 py-3 text-emerald-700 font-bold text-center">
                          {mgr.won_deals}
                        </td>
                        <td className="px-4 py-3 font-black text-slate-900">
                          ₹{mgr.won_revenue.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500">
                          ₹{mgr.pipeline.toLocaleString()}
                        </td>
                      </tr>
                    ))
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
                    <th className="px-4 py-2.5 text-right">Pipeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {!data?.executive_performance || data.executive_performance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400 font-bold">
                        No executive records found.
                      </td>
                    </tr>
                  ) : (
                    data.executive_performance.map((exec, i) => (
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
                        <td className="px-4 py-3 font-bold text-slate-900">{exec.sales_executive}</td>
                        <td className="px-4 py-3 text-slate-500">{exec.sales_manager}</td>
                        <td className="px-4 py-3 text-slate-600 text-center">{exec.customers}</td>
                        <td className="px-4 py-3 text-emerald-700 font-bold text-center">
                          {exec.won_deals}
                        </td>
                        <td className="px-4 py-3 font-black text-[#832D51]">
                          ₹{exec.won_revenue.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500">
                          ₹{exec.pipeline.toLocaleString()}
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

      {/* Visual Section & Summaries (Revenue Trend & Win/Loss) */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Trend Area Chart */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
              Revenue Trend
            </h3>
            <span className="text-[10px] font-bold text-slate-400">Actual Won Sales</span>
          </div>
          <div className="h-60 w-full">
            {!data?.revenue_trend || data.revenue_trend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 font-bold text-xs">
                No trend data available for the period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.revenue_trend}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="trendGradColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#832D51" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#832D51" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString()}`, 'Won Revenue']} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#832D51"
                    strokeWidth={2.5}
                    fill="url(#trendGradColor)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Win/Loss Summary */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3 flex flex-col justify-between">
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
            Won / Lost Summary
          </h3>
          <div className="space-y-3 flex-1 flex flex-col justify-center">
            {/* Won summary */}
            <div className="flex items-center justify-between bg-emerald-50/60 border border-emerald-100 p-3 rounded-2xl">
              <div>
                <span className="text-[10px] font-black text-emerald-800 uppercase">
                  Won Portfolio
                </span>
                <p className="text-xs font-bold text-slate-500 mt-0.5">
                  {data?.win_loss_summary?.won?.count || 0} deals
                </p>
              </div>
              <p className="text-sm font-black text-emerald-700">
                ₹{(data?.win_loss_summary?.won?.revenue || 0).toLocaleString()}
              </p>
            </div>

            {/* Lost summary */}
            <div className="flex items-center justify-between bg-rose-50/60 border border-rose-100 p-3 rounded-2xl">
              <div>
                <span className="text-[10px] font-black text-rose-800 uppercase">
                  Lost Portfolio
                </span>
                <p className="text-xs font-bold text-slate-500 mt-0.5">
                  {data?.win_loss_summary?.lost?.count || 0} deals
                </p>
              </div>
              <p className="text-sm font-black text-rose-700">
                ₹{(data?.win_loss_summary?.lost?.value || 0).toLocaleString()}
              </p>
            </div>

            {/* Open summary */}
            <div className="flex items-center justify-between bg-amber-50/60 border border-amber-100 p-3 rounded-2xl">
              <div>
                <span className="text-[10px] font-black text-amber-800 uppercase">
                  Open Pipeline
                </span>
                <p className="text-xs font-bold text-slate-500 mt-0.5">
                  {data?.win_loss_summary?.open?.count || 0} deals
                </p>
              </div>
              <p className="text-sm font-black text-amber-700">
                ₹{(data?.win_loss_summary?.open?.pipeline || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Financial Performance Section ───────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-[#F8CAE4]/25 text-[#832D51]">
                <DollarSign className="size-4" />
              </span>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Financial Performance & Revenue Share
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Live executive financial statements, manager revenue share, and realized closer matrices
            </p>
          </div>

          {/* Export Financial Statement Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 mr-1">Export Statement:</span>
            <button
              onClick={() => handleExportStatement('pdf')}
              className="flex items-center gap-1 rounded-xl bg-[#832D51] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#6a2240] transition cursor-pointer"
            >
              <Download className="size-3.5" />
              PDF
            </button>
            <button
              onClick={() => handleExportStatement('excel')}
              className="flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition cursor-pointer"
            >
              <FileSpreadsheet className="size-3.5" />
              Excel
            </button>
            <button
              onClick={() => handleExportStatement('csv')}
              className="flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition cursor-pointer"
            >
              <Receipt className="size-3.5" />
              CSV
            </button>
          </div>
        </div>

        {/* Manager Contribution & Executive Realized Revenue */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Sales Manager Revenue Share */}
          <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
              <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                Sales Manager Revenue Share
              </h3>
              <span className="text-[10px] font-bold text-slate-400">Won Revenue Portfolio</span>
            </div>

            {managerRevenueShares.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 font-bold">
                No closed revenue records for sales managers in this period.
              </div>
            ) : (
              <div className="space-y-3">
                {managerRevenueShares.map((m) => (
                  <div
                    key={m.manager}
                    className="p-3.5 bg-white border border-slate-200/80 rounded-xl space-y-2 shadow-2xs"
                  >
                    <div className="flex justify-between items-center text-xs font-black text-slate-900">
                      <span className="text-[#832D51]">{m.manager}</span>
                      <span>
                        ₹{m.won_revenue.toLocaleString()}{' '}
                        <span className="text-slate-400 font-bold text-[11px]">({m.share})</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-[#832D51] transition-all duration-500"
                        style={{ width: `${Math.min(100, m.shareNum)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                      <span>{m.won_deals} won deals closed</span>
                      <span>Pipeline: ₹{m.pipeline.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Executive Realized Revenue Leaderboard */}
          <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
              <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                Executive Realized Revenue
              </h3>
              <span className="text-[10px] font-bold text-slate-400">Top Closers</span>
            </div>

            {executiveLeaderboard.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 font-bold">
                No closed revenue records for sales executives in this period.
              </div>
            ) : (
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {executiveLeaderboard.map((e, idx) => (
                  <div
                    key={e.executive}
                    className="flex items-center justify-between p-3 bg-white border border-slate-200/80 rounded-xl hover:bg-slate-50 transition shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-6 place-items-center rounded-lg bg-slate-100 text-slate-700 text-[10px] font-black">
                        #{idx + 1}
                      </span>
                      <div>
                        <p className="text-xs font-black text-slate-900">{e.executive}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">
                          {e.manager} · {e.won_deals} Won Deals
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-slate-950 block">
                        ₹{e.won_revenue.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-bold text-[#832D51]">{e.share} share</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SalesOverview
