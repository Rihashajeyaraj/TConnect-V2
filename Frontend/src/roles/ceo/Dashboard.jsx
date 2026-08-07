import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  Users,
  Target,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Sparkles,
  Award,
  Globe,
  Smartphone,
  PhoneCall,
  Activity,
  Briefcase,
  FileText,
  RefreshCw,
  Download,
  Calendar,
  UserCheck,
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { crmAPI, customerAPI, hrmsAPI, attendanceAPI, visitAPI, pipelineAPI, expenseAPI, reportAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'
import { formatDate } from '../../utils/dateUtils.js'
import { exportToPDF, exportToExcel, exportToCSV, getFormattedTodayDate } from '../../utils/exportUtils.js'

function CeoDashboard() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState('This Month')
  const [showExportMenu, setShowExportMenu] = useState(false)

  const [metrics, setMetrics] = useState({
    totalRevenue: 2482000,
    activeLeads: 28,
    convertedCustomers: 12,
    teamProductivity: 94.2,
    hotLeads: 8,
    todayVisits: 6,
    pendingExpenses: 45200,
    attendancePresent: 14,
    revenueData: [
      { month: 'Jan', revenue: 320000, target: 300000 },
      { month: 'Feb', revenue: 280000, target: 300000 },
      { month: 'Mar', revenue: 410000, target: 350000 },
      { month: 'Apr', revenue: 380000, target: 350000 },
      { month: 'May', revenue: 520000, target: 400000 },
      { month: 'Jun', revenue: 490000, target: 400000 },
      { month: 'Jul', revenue: 572000, target: 450000 },
    ],
    leadSources: [
      { name: 'Website', value: 12, color: '#004749' },
      { name: 'Referral', value: 8, color: '#b09b72' },
      { name: 'Cold Call', value: 5, color: '#540000' },
      { name: 'Walk-In', value: 3, color: '#111111' },
    ],
    recentActivities: [],
    employeeSummary: {
      totalEmployees: 12,
      activeEmployees: 10,
      inactiveEmployees: 2,
      presentToday: 8,
      absentToday: 2,
      onLeave: 1,
      lateCheckIns: 1,
      newEmployeesThisMonth: 2,
    },
    customerSummary: {
      totalCustomers: 18,
      activeCustomers: 16,
      newCustomers: 2,
      lostCustomers: 1,
      customersBySalesManager: { "Vikram Singh": 8, "Suresh V": 6 },
      customersBySalesExecutive: { "Ananya Roy": 6, "Karthik Raja": 5 },
    },
    leadSummary: {
      totalLeads: 42,
      newLeads: 12,
      qualifiedLeads: 18,
      opportunities: 14,
      wonDeals: 8,
      lostDeals: 3,
      conversionRate: 57.1,
    },
    revenueSummary: {
      totalRevenue: 2482000,
      monthlyRevenue: 450000,
      quarterlyRevenue: 1250000,
      annualRevenue: 2482000,
      breakdown: {
        manager: { "Vikram Singh": 1450000, "Suresh V": 1032000 },
        executive: { "Ananya Roy": 850000, "Karthik Raja": 602000 },
        customer: { "Apex Tech": 450000, "Global Corp": 250000 },
        company: { "Apex Tech": 450000, "Global Corp": 250000 },
        product: { "Enterprise License": 1800000, "SaaS Subscription": 682000 }
      },
      monthlyRevenueTrend: [
        { month: 'Jan', revenue: 320000, target: 300000 },
        { month: 'Feb', revenue: 280000, target: 300000 },
        { month: 'Mar', revenue: 410000, target: 350000 },
        { month: 'Apr', revenue: 380000, target: 350000 },
        { month: 'May', revenue: 520000, target: 400000 },
        { month: 'Jun', revenue: 490000, target: 400000 },
        { month: 'Jul', revenue: 572000, target: 450000 },
      ],
    },
    teamPerformance: {
      topSalesManagers: [
        { name: "Vikram Singh", revenue: 1450000, sales: 8, teamSize: 5, conversionRate: 72.4 },
        { name: "Suresh V", revenue: 1032000, sales: 6, teamSize: 4, conversionRate: 65.0 }
      ],
      topSalesExecutives: [
        { name: "Ananya Roy", leads: 28, visits: 21, customers: 8, revenue: 850000, rating: 4.9 },
        { name: "Karthik Raja", leads: 22, visits: 16, customers: 5, revenue: 602000, rating: 4.6 }
      ],
    },
    companyDetails: {
      company_name: "TwiteConnect Technologies Pvt. Ltd.",
      registration_no: "U72200TN2026PTC123456",
      gst_no: "33AAAAA0000A1Z5",
      pan_no: "AAAAA1111A",
      email: "contact@tconnect.com",
      phone: "+91 98765 43210",
      address: "Plot 45, OMR IT Expressway, Perungudi, Chennai - 600096, Tamil Nadu",
      website: "https://twiteconnect.com",
      logo_url: "",
      branches: [],
      departments: []
    },
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Try real-time API call first
      const res = await reportAPI.getCeoDashboard()
      if (res && res.data && res.data.employeeSummary) {
        setMetrics({
          ...res.data,
          totalRevenue: res.data.revenueSummary?.totalRevenue || 2482000,
          activeLeads: res.data.leadSummary?.totalLeads || 28,
          convertedCustomers: res.data.customerSummary?.totalCustomers || 12,
          teamProductivity: 94.2,
          attendancePresent: res.data.employeeSummary?.presentToday || 14,
          revenueData: res.data.revenueSummary?.monthlyRevenueTrend || res.data.revenueData,
          leadSources: res.data.leadSources || [
            { name: 'Website', value: 12, color: '#004749' },
            { name: 'Referral', value: 8, color: '#b09b72' },
            { name: 'Cold Call', value: 5, color: '#540000' },
            { name: 'Walk-In', value: 3, color: '#111111' },
          ],
          recentActivities: res.data.recentActivities || [
            { id: 1, type: 'deal', user: 'Mary Jane', action: 'qualified opportunity', target: 'Next Gen Tech (₹45,000)', time: '12m ago', avatar: 'MJ' },
            { id: 2, type: 'visit', user: 'Karthik R', action: 'completed client visit at', target: 'ABC Pvt Ltd (GPS verified)', time: '45m ago', avatar: 'KR' },
            { id: 3, type: 'deal', user: 'Robert Smith', action: 'won high priority deal', target: 'Global Corp (₹2,50,000)', time: '2h ago', avatar: 'RS' },
            { id: 4, type: 'lead', user: 'David Brown', action: 'converted lead to customer', target: 'Vertex Systems', time: '3h ago', avatar: 'DB' },
          ]
        })
        return
      }

      // 2. Fallback to Local Storage
      const leads = JSON.parse(localStorage.getItem('tc_sm_leads') || '[]')
      const customers = JSON.parse(localStorage.getItem('tc_customer_accounts') || '[]')
      const visits = JSON.parse(localStorage.getItem('tc_sales_visits') || '[]')
      const expenses = JSON.parse(localStorage.getItem('tc_sales_expenses') || '[]')

      const custRev = customers.reduce((acc, c) => acc + (parseInt(String(c.contractValue || c.value || c.annual_revenue || 0).replace(/[^0-9]/g, '')) || 0), 0)
      const leadRev = leads
        .filter((l) => l.status === 'Converted to Customer' || l.status === 'Converted' || l.status === 'Closed Won')
        .reduce((acc, l) => acc + (parseInt(String(l.value || l.budget || 0).replace(/[^0-9]/g, '')) || 0), 0)

      const totalRev = custRev + leadRev || 2482000
      const convertedCount = customers.length + leads.filter((l) => l.status === 'Converted to Customer').length || 12

      setMetrics((prev) => ({
        ...prev,
        totalRevenue: totalRev,
        activeLeads: leads.length || 28,
        convertedCustomers: convertedCount,
      }))
    } catch (e) {
      console.error('Error fetching CEO dashboard data:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData, selectedMonth])

  const kpiCards = [
    {
      label: 'Total Revenue',
      value: `₹${metrics.totalRevenue.toLocaleString('en-IN')}`,
      change: '+12.5%',
      up: true,
      icon: DollarSign,
      bgClass: 'bg-white border-[#540000]/40 hover:border-[#540000] hover:shadow-sm',
      iconColor: 'text-[#540000] bg-[#540000]/10 border-[#540000]/20',
      sparkline: 'M 4 30 Q 24 10, 44 20 T 84 6',
      sparklineColor: '#540000',
    },
    {
      label: 'Active Leads',
      value: metrics.activeLeads,
      change: '+8.2%',
      up: true,
      icon: Target,
      bgClass: 'bg-white border-[#b09b72]/40 hover:border-[#b09b72] hover:shadow-sm',
      iconColor: 'text-[#b09b72] bg-[#b09b72]/10 border-[#b09b72]/20',
      sparkline: 'M 4 25 Q 24 25, 44 10 T 84 4',
      sparklineColor: '#b09b72',
    },
    {
      label: 'Converted Customers',
      value: metrics.convertedCustomers,
      change: '+15.3%',
      up: true,
      icon: Users,
      bgClass: 'bg-white border-[#004749]/40 hover:border-[#004749] hover:shadow-sm',
      iconColor: 'text-[#004749] bg-[#004749]/10 border-[#004749]/20',
      sparkline: 'M 4 32 Q 24 16, 44 24 T 84 8',
      sparklineColor: '#004749',
    },
    {
      label: 'Team Productivity',
      value: `${metrics.teamProductivity}%`,
      change: '+3.4%',
      up: true,
      icon: TrendingUp,
      bgClass: 'bg-white border-[#111111]/40 hover:border-[#111111] hover:shadow-sm',
      iconColor: 'text-[#111111] bg-[#111111]/10 border-[#111111]/20',
    },
  ]

  return (
    <div className="mx-auto max-w-[1400px] space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Welcome back, John</h2>
            <Sparkles className="size-5 text-amber-500 fill-amber-500" />
          </div>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            Here is the high-level performance metrics of your sales and field teams today.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-9 text-xs border border-[#b09b72]/50 rounded-xl px-3 bg-[#b09b72]/10 font-black text-[#938160] focus:outline-none focus:ring-2 focus:ring-[#b09b72]/20 cursor-pointer shadow-2xs"
          >
            <option value="Today">📍 Today</option>
            <option value="Yesterday">Yesterday</option>
            <option value="This Week">This Week</option>
            <option value="This Month">This Month</option>
          </select>

          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="h-9 px-3.5 rounded-xl bg-[#540000] hover:bg-[#3a0101] text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download size={14} />
              <span>Export Report</span>
              <span className="text-[10px]">▼</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1 flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    const exportRows = [
                      { Metric: 'Total Revenue', Value: `₹${metrics.totalRevenue}` },
                      { Metric: 'Active Leads', Value: metrics.activeLeads },
                      { Metric: 'Converted Customers', Value: metrics.convertedCustomers },
                      { Metric: 'Team Productivity', Value: `${metrics.teamProductivity}%` },
                      { Metric: 'Date', Value: getFormattedTodayDate() },
                    ]
                    exportToPDF(`TConnect_CEO_Executive_Report_${new Date().toISOString().slice(0, 10)}`, 'TConnect Executive Performance Report', exportRows)
                    setShowExportMenu(false)
                  }}
                  className="px-3 py-2 rounded-lg text-left text-xs font-bold text-slate-700 hover:bg-[#004749]/10 hover:text-[#004749] flex items-center gap-2 transition"
                >
                  <span>📄</span> Export as PDF
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const exportRows = [
                      { Metric: 'Total Revenue', Value: metrics.totalRevenue },
                      { Metric: 'Active Leads', Value: metrics.activeLeads },
                      { Metric: 'Converted Customers', Value: metrics.convertedCustomers },
                      { Metric: 'Team Productivity', Value: `${metrics.teamProductivity}%` },
                      { Metric: 'Date', Value: getFormattedTodayDate() },
                    ]
                    exportToExcel(`TConnect_CEO_Executive_Report_${new Date().toISOString().slice(0, 10)}.xls`, exportRows)
                    setShowExportMenu(false)
                  }}
                  className="px-3 py-2 rounded-lg text-left text-xs font-bold text-slate-700 hover:bg-[#004749]/10 hover:text-[#004749] flex items-center gap-2 transition"
                >
                  <span>📊</span> Export as Excel (.xls)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const exportRows = [
                      { Metric: 'Total Revenue', Value: metrics.totalRevenue },
                      { Metric: 'Active Leads', Value: metrics.activeLeads },
                      { Metric: 'Converted Customers', Value: metrics.convertedCustomers },
                      { Metric: 'Team Productivity', Value: `${metrics.teamProductivity}%` },
                      { Metric: 'Date', Value: getFormattedTodayDate() },
                    ]
                    exportToCSV(`TConnect_CEO_Executive_Report_${new Date().toISOString().slice(0, 10)}.csv`, exportRows)
                    setShowExportMenu(false)
                  }}
                  className="px-3 py-2 rounded-lg text-left text-xs font-bold text-slate-700 hover:bg-[#004749]/10 hover:text-[#004749] flex items-center gap-2 transition"
                >
                  <span>📝</span> Export as CSV
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setRefreshing(true)
              loadData()
            }}
            disabled={refreshing}
            className="p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin text-[#004749]' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div
              key={kpi.label}
              className={`group relative overflow-hidden rounded-2xl border p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-slate-100/85 active:scale-[0.98] ${kpi.bgClass}`}
            >
              {/* Card Header Info */}
              <div className="flex items-start justify-between relative z-10">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</p>
                  <p className="text-2xl font-black text-slate-900 tracking-tight leading-none pt-1">{kpi.value}</p>
                </div>
                <span className={`grid size-10 place-items-center rounded-xl border ${kpi.iconColor} shadow-sm shrink-0`}>
                  <Icon className="size-4.5" />
                </span>
              </div>

              {/* Sparkline & Trend Section */}
              <div className="mt-6 flex items-center justify-between gap-4 relative z-10">
                {/* Dynamic Trend Pill */}
                <span
                  className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-extrabold border ${
                    kpi.up
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100/60'
                      : 'bg-red-50 text-red-700 border-red-100/60'
                  }`}
                >
                  {kpi.up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                  {kpi.change}
                </span>

                {/* Micro Sparkline Chart */}
                <div className="h-8 w-20 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                  <svg className="h-full w-full" viewBox="0 0 88 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d={kpi.sparkline}
                      stroke={kpi.sparklineColor}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Charts & Analytics Block */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Trends Chart */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-2 space-y-6 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Revenue vs Target Trends</h3>
              <p className="text-[11px] font-bold text-slate-400">Monthly business projection metrics for 2026</p>
            </div>
            <div className="flex items-center gap-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span className="flex items-center gap-1.5 bg-blue-50/50 border border-blue-100 rounded-lg px-2 py-1">
                <span className="size-2 rounded-full bg-blue-600" /> Revenue
              </span>
              <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                <span className="size-2 rounded-full bg-slate-350" /> Target
              </span>
            </div>
          </div>
          
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#004749" stopOpacity={0.16} />
                    <stop offset="100%" stopColor="#004749" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#94a3b8"
                  tick={{ fontSize: 10, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fontSize: 10, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-xl border border-slate-800 bg-slate-950/95 p-3 shadow-xl backdrop-blur-md text-white font-sans text-[11px] animate-in fade-in zoom-in-95 duration-100">
                          <p className="font-extrabold text-slate-400 mb-1.5 uppercase tracking-wider">{label} 2026</p>
                          {payload.map((p, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-6 mt-1">
                              <span className="flex items-center gap-1.5">
                                <span className="size-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                                <span className="font-semibold text-slate-350">{p.name}:</span>
                              </span>
                              <span className="font-black text-white">₹{p.value.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#004749"
                  strokeWidth={3}
                  fill="url(#revenueGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="target"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fill="none"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Sources Distribution */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="border-b border-slate-50 pb-4">
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Lead Ingestion Channels</h3>
            <p className="text-[11px] font-bold text-slate-400">Total pipeline split by origin sources</p>
          </div>
          <div className="h-56 relative flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.leadSources}
                  cx="50%"
                  cy="50%"
                  innerRadius={68}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {metrics.leadSources.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="rounded-xl border border-slate-800 bg-slate-950/95 px-3 py-2 shadow-xl backdrop-blur-md text-white font-sans text-[11px]">
                          <span className="font-extrabold">{data.name}</span>: <span className="font-black text-blue-400">{data.value} Leads</span>
                        </div>
                      )
                    }
                    return null
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-slate-900 tracking-tight leading-none">{metrics.activeLeads}</span>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mt-1">Total Leads</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] font-bold text-slate-500 border-t border-slate-50 pt-4">
            {metrics.leadSources.slice(0, 4).map((source) => (
              <div key={source.name} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg p-1.5">
                <span className="flex items-center gap-1.5 truncate">
                  <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: source.color }} />
                  <span className="truncate">{source.name}</span>
                </span>
                <span className="text-slate-950 font-extrabold pl-1">{source.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3. EXECUTIVE DETAILED SUMMARIES (Employee, Customer, Leads) ── */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Employee Summary Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-50 pb-3 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wide">👥 Employee Summary</h3>
            <span className="text-[10px] font-extrabold text-[#004749] bg-[#004749]/10 px-2 py-0.5 rounded-lg">Real-time</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-600">
            <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
              <p className="text-[10px] text-slate-400 font-extrabold uppercase">Total Employees</p>
              <p className="text-lg font-black text-slate-900 mt-1">{metrics.employeeSummary?.totalEmployees || 0}</p>
            </div>
            <div className="bg-emerald-50/50 border border-emerald-100/50 p-3 rounded-xl">
              <p className="text-[10px] text-emerald-700 font-extrabold uppercase">Active</p>
              <p className="text-lg font-black text-emerald-900 mt-1">{metrics.employeeSummary?.activeEmployees || 0}</p>
            </div>
            <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
              <p className="text-[10px] text-slate-400 font-extrabold uppercase">Inactive</p>
              <p className="text-lg font-black text-slate-950 mt-1">{metrics.employeeSummary?.inactiveEmployees || 0}</p>
            </div>
            <div className="bg-blue-50/50 border border-blue-100/50 p-3 rounded-xl">
              <p className="text-[10px] text-blue-700 font-extrabold uppercase">Present Today</p>
              <p className="text-lg font-black text-blue-900 mt-1">{metrics.employeeSummary?.presentToday || 0}</p>
            </div>
            <div className="bg-rose-50/50 border border-rose-100/50 p-3 rounded-xl">
              <p className="text-[10px] text-rose-700 font-extrabold uppercase">Absent Today</p>
              <p className="text-lg font-black text-rose-900 mt-1">{metrics.employeeSummary?.absentToday || 0}</p>
            </div>
            <div className="bg-amber-50/50 border border-amber-100/50 p-3 rounded-xl">
              <p className="text-[10px] text-amber-700 font-extrabold uppercase">On Leave</p>
              <p className="text-lg font-black text-amber-900 mt-1">{metrics.employeeSummary?.onLeave || 0}</p>
            </div>
            <div className="bg-purple-50/50 border border-purple-100/50 p-3 rounded-xl">
              <p className="text-[10px] text-purple-700 font-extrabold uppercase">Late Check-ins</p>
              <p className="text-lg font-black text-purple-900 mt-1">{metrics.employeeSummary?.lateCheckIns || 0}</p>
            </div>
            <div className="bg-indigo-50/50 border border-indigo-100/50 p-3 rounded-xl">
              <p className="text-[10px] text-indigo-700 font-extrabold uppercase">New This Month</p>
              <p className="text-lg font-black text-indigo-900 mt-1">{metrics.employeeSummary?.newEmployeesThisMonth || 0}</p>
            </div>
          </div>
        </div>

        {/* Customer Summary Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-50 pb-3 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wide">🤝 Customer Summary</h3>
            <span className="text-[10px] font-extrabold text-[#b09b72] bg-[#b09b72]/15 px-2 py-0.5 rounded-lg">Sales Growth</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-600">
            <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl col-span-2 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase">Total / Active Customers</p>
                <p className="text-lg font-black text-slate-900 mt-1">
                  {metrics.customerSummary?.totalCustomers || 0} <span className="text-xs text-slate-450 font-semibold">({metrics.customerSummary?.activeCustomers || 0} Active)</span>
                </p>
              </div>
              <span className="text-xs font-black text-[#b09b72] bg-[#b09b72]/10 px-2 py-1 rounded-lg">
                +{metrics.customerSummary?.newCustomers || 0} New
              </span>
            </div>
            <div className="bg-rose-50/50 border border-rose-100/50 p-3 rounded-xl col-span-2">
              <p className="text-[10px] text-rose-700 font-extrabold uppercase">Churned/Lost Customers</p>
              <p className="text-lg font-black text-rose-900 mt-1">{metrics.customerSummary?.lostCustomers || 0}</p>
            </div>

            {/* Attribution by Manager */}
            <div className="col-span-2 border-t border-slate-50 pt-2 space-y-2">
              <p className="text-[10px] text-slate-400 font-extrabold uppercase">Clients by Sales Manager</p>
              <div className="space-y-1.5">
                {Object.entries(metrics.customerSummary?.customersBySalesManager || {}).map(([mgr, count]) => (
                  <div key={mgr} className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-semibold">{mgr}</span>
                    <span className="text-slate-900 font-bold bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">{count} Clients</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Lead & Sales Conversion Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-50 pb-3 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wide">🎯 Lead & Sales Summary</h3>
            <span className="text-[10px] font-extrabold text-[#540000] bg-[#540000]/10 px-2 py-0.5 rounded-lg">Win Rate</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-600">
            <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
              <p className="text-[10px] text-slate-400 font-extrabold uppercase">Total Leads</p>
              <p className="text-lg font-black text-slate-900 mt-1">{metrics.leadSummary?.totalLeads || 0}</p>
            </div>
            <div className="bg-[#b09b72]/10 border border-[#b09b72]/20 p-3 rounded-xl">
              <p className="text-[10px] text-[#938160] font-extrabold uppercase">Conversion Rate</p>
              <p className="text-lg font-black text-[#938160] mt-1">{metrics.leadSummary?.conversionRate || 0.0}%</p>
            </div>
            <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
              <p className="text-[10px] text-slate-400 font-extrabold uppercase">Qualified Leads</p>
              <p className="text-lg font-black text-slate-900 mt-1">{metrics.leadSummary?.qualifiedLeads || 0}</p>
            </div>
            <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
              <p className="text-[10px] text-slate-400 font-extrabold uppercase">Opportunities</p>
              <p className="text-lg font-black text-slate-900 mt-1">{metrics.leadSummary?.opportunities || 0}</p>
            </div>
            <div className="bg-emerald-50/50 border border-emerald-100/50 p-3 rounded-xl">
              <p className="text-[10px] text-emerald-700 font-extrabold uppercase">Won Deals</p>
              <p className="text-lg font-black text-emerald-900 mt-1">{metrics.leadSummary?.wonDeals || 0}</p>
            </div>
            <div className="bg-rose-50/50 border border-rose-100/50 p-3 rounded-xl">
              <p className="text-[10px] text-rose-700 font-extrabold uppercase">Lost Deals</p>
              <p className="text-lg font-black text-rose-900 mt-1">{metrics.leadSummary?.lostDeals || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. REVENUE BREAKDOWN & TARGETS TABLE ── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="border-b border-slate-50 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">💰 Revenue Dashboard Breakdown</h3>
            <p className="text-[11px] font-bold text-slate-400">Quarterly, Monthly, and Annual aggregates with cross-entity attribution</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className="bg-slate-100 text-slate-800 font-black px-3 py-1.5 rounded-xl text-[10px] border border-slate-200 shadow-2xs">
              📅 Annual: ₹{(metrics.revenueSummary?.annualRevenue || 0).toLocaleString()}
            </span>
            <span className="bg-slate-100 text-slate-800 font-black px-3 py-1.5 rounded-xl text-[10px] border border-slate-200 shadow-2xs">
              📊 Quarterly: ₹{(metrics.revenueSummary?.quarterlyRevenue || 0).toLocaleString()}
            </span>
            <span className="bg-slate-100 text-slate-800 font-black px-3 py-1.5 rounded-xl text-[10px] border border-slate-200 shadow-2xs">
              📉 Monthly: ₹{(metrics.revenueSummary?.monthlyRevenue || 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Revenue by Manager */}
          <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <p className="text-xs font-black uppercase text-slate-900 tracking-wider">Revenue by Manager</p>
            <div className="space-y-2">
              {Object.entries(metrics.revenueSummary?.breakdown?.manager || {}).map(([name, val]) => (
                <div key={name} className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-500">{name}</span>
                  <span className="text-slate-900 font-bold">₹{val.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue by Executive */}
          <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <p className="text-xs font-black uppercase text-slate-900 tracking-wider">Revenue by Executive</p>
            <div className="space-y-2">
              {Object.entries(metrics.revenueSummary?.breakdown?.executive || {}).map(([name, val]) => (
                <div key={name} className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-500">{name}</span>
                  <span className="text-slate-900 font-bold">₹{val.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue by Product/Service */}
          <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <p className="text-xs font-black uppercase text-slate-900 tracking-wider">Top Performing Products</p>
            <div className="space-y-2">
              {Object.entries(metrics.revenueSummary?.breakdown?.product || {}).map(([name, val]) => (
                <div key={name} className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-500 truncate max-w-[150px]">{name}</span>
                  <span className="text-slate-900 font-bold">₹{val.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Activities & Quick Actions Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Operations & Activities - Vertical Timeline */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Real-time Operations Stream</h3>
              <p className="text-[11px] font-bold text-slate-400">Live operational activity feed from regional offices</p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-1 text-[9px] font-extrabold text-blue-700 tracking-wider">
              <span className="size-1.5 animate-pulse rounded-full bg-blue-600" /> LIVE
            </span>
          </div>

          <div className="relative pl-6 space-y-6">
            {/* Timeline Vertical Connector track */}
            <div className="absolute left-[11px] top-1.5 bottom-1.5 w-0.5 bg-slate-100" />

            {metrics.recentActivities.map((act) => (
              <div key={act.id} className="relative flex items-start gap-4 text-xs font-semibold text-slate-500">
                {/* Timeline Node Icon/Avatar */}
                <span className="absolute -left-[23px] top-0 grid size-6 place-items-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border border-white text-[9px] font-extrabold text-slate-700 shadow-sm ring-4 ring-white">
                  {act.avatar}
                </span>

                <div className="flex-1 space-y-1">
                  <p className="m-0 leading-relaxed text-slate-600">
                    <span className="font-extrabold text-slate-900">{act.user}</span> {act.action}{' '}
                    <span className="font-extrabold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-1.5 py-0.2 ml-0.5">{act.target}</span>
                  </p>
                  <span className="text-[9px] font-bold text-slate-400 block">{act.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enterprise Quick Navigation Actions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="border-b border-slate-50 pb-4">
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">CEO Hub Shortcuts</h3>
            <p className="text-[11px] font-bold text-slate-400">Direct workspace actions to access performance modules</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                title: 'Sales Pipeline',
                desc: 'Access opportunity stages and deals',
                path: '/ceo/opportunities',
                icon: Briefcase,
                color: 'hover:border-blue-300 hover:bg-blue-50/15 text-blue-600 border-blue-100/50 bg-blue-50/30',
              },
              {
                title: 'Team Performance',
                desc: 'Analyze rep targets and progress logs',
                path: '/ceo/employee',
                icon: Users,
                color: 'hover:border-indigo-300 hover:bg-indigo-50/15 text-indigo-600 border-indigo-100/50 bg-indigo-50/30',
              },
              {
                title: 'Leads Directory',
                desc: 'Review pipeline ingestion and status',
                path: '/ceo/leads',
                icon: Target,
                color: 'hover:border-emerald-300 hover:bg-emerald-50/15 text-emerald-600 border-emerald-100/50 bg-emerald-50/30',
              },
              {
                title: 'Reports Hub',
                desc: 'Generate business performance logs',
                path: '/ceo/reports',
                icon: FileText,
                color: 'hover:border-amber-300 hover:bg-amber-50/15 text-amber-600 border-amber-100/50 bg-amber-50/30',
              },
            ].map((act) => {
              const Icon = act.icon
              return (
                <Link
                  key={act.title}
                  to={act.path}
                  className={`group flex flex-col justify-between rounded-xl border p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md active:scale-[0.98] ${act.color}`}
                >
                  <Icon className="size-5 mb-4 opacity-80 group-hover:scale-110 transition-transform" />
                  <div>
                    <h4 className="text-xs font-black text-slate-900 flex items-center gap-1">
                      {act.title}
                      <ChevronRight className="size-3 text-slate-400 transition group-hover:translate-x-0.5" />
                    </h4>
                    <p className="mt-1 text-[9px] font-bold text-slate-400 leading-normal">{act.desc}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CeoDashboard
