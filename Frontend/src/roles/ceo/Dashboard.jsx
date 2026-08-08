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
} from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'
import { exportToPDF, exportToExcel, exportToCSV } from '../../utils/exportUtils.js'

function CeoDashboard() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [timeRange, setTimeRange] = useState('This Month')
  
  // Selected KPI card for dynamic minimal display ('revenue' | 'customers' | 'leads' | 'pipeline' | 'target' | 'employees' | 'approvals' | 'activities')
  const [activeKpi, setActiveKpi] = useState('revenue')

  // Executive Core Data State
  const [metrics, setMetrics] = useState({
    totalRevenue: 2840000,
    monthlyRevenue: 580000,
    annualTarget: 35000000,
    targetAchieved: 28400000,
    totalCustomers: 48,
    newCustomers: 6,
    activeLeads: 86,
    wonDeals: 24,
    lostDeals: 5,
    pipelineValue: 4250000,
    conversionRate: 68.5,
    totalEmployees: 18,
    activeEmployees: 16,
  })

  const [revenueTrends, setRevenueTrends] = useState([
    { month: 'Jan', revenue: 380000, target: 350000, expenses: 95000 },
    { month: 'Feb', revenue: 420000, target: 380000, expenses: 110000 },
    { month: 'Mar', revenue: 490000, target: 450000, expenses: 125000 },
    { month: 'Apr', revenue: 510000, target: 480000, expenses: 130000 },
    { month: 'May', revenue: 560000, target: 500000, expenses: 140000 },
    { month: 'Jun', revenue: 530000, target: 520000, expenses: 135000 },
    { month: 'Jul', revenue: 620000, target: 550000, expenses: 155000 },
    { month: 'Aug', revenue: 580000, target: 550000, expenses: 142000 },
  ])

  const [salesFunnelData, setSalesFunnelData] = useState([
    { stage: 'Total Ingested Leads', count: 142, value: '₹1.25 Cr', percentage: '100%', color: '#004749' },
    { stage: 'Qualified Prospects', count: 86, value: '₹78.0 Lakhs', percentage: '60.5%', color: '#013b3f' },
    { stage: 'Active Opportunities', count: 45, value: '₹42.5 Lakhs', percentage: '31.6%', color: '#b09b72' },
    { stage: 'Won Closed Deals', count: 24, value: '₹28.4 Lakhs', percentage: '16.9%', color: '#540000' },
  ])

  const [managerPerformance, setManagerPerformance] = useState([
    {
      name: 'Vikram Singh',
      region: 'South Region',
      revenue: 1650000,
      target: 2000000,
      wonDeals: 14,
      teamSize: 6,
      conversionRate: 74.2,
      achievement: 82.5,
    },
    {
      name: 'Suresh V',
      region: 'Bangalore & West Region',
      revenue: 1190000,
      target: 1500000,
      wonDeals: 10,
      teamSize: 5,
      conversionRate: 63.8,
      achievement: 79.3,
    },
  ])

  const [executivePerformance, setExecutivePerformance] = useState([
    { name: 'Ananya Roy', manager: 'Vikram Singh', leads: 32, visits: 24, wonDeals: 8, revenue: 940000, rating: 4.9 },
    { name: 'Karthik Raja', manager: 'Suresh V', leads: 28, visits: 19, wonDeals: 6, revenue: 710000, rating: 4.7 },
    { name: 'Robert Smith', manager: 'Vikram Singh', leads: 24, visits: 16, wonDeals: 5, revenue: 620000, rating: 4.6 },
    { name: 'Mary Jane', manager: 'Suresh V', leads: 20, visits: 15, wonDeals: 5, revenue: 570000, rating: 4.6 },
  ])

  const [recentActivities, setRecentActivities] = useState([
    { id: 1, type: 'deal', title: 'Enterprise CRM Contract Signed', company: 'Apex Technologies Pvt Ltd', amount: '₹4,50,000', rep: 'Ananya Roy', time: '15 mins ago', icon: Award, color: 'text-amber-600 bg-amber-50' },
    { id: 2, type: 'visit', title: 'Strategic On-site Demo Completed', company: 'Global Corp Solutions', amount: 'Pipeline: ₹2.5L', rep: 'Karthik Raja', time: '45 mins ago', icon: Target, color: 'text-teal-600 bg-teal-50' },
    { id: 3, type: 'lead', title: 'New Enterprise Inbound Lead Registered', company: 'Zenith Logistics Hub', amount: 'Warm Category', rep: 'Marketing Portal', time: '2 hours ago', icon: Users, color: 'text-blue-600 bg-blue-50' },
    { id: 4, type: 'payment', title: 'Quarterly Renewal Retainer Received', company: 'Vertex Systems', amount: '₹3,00,000', rep: 'Finance Desk', time: '3 hours ago', icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
  ])

  const [pendingApprovals, setPendingApprovals] = useState([
    { id: 'LV-101', category: 'Leave Request', name: 'Vikram Singh', role: 'Sales Manager', details: 'Sick Leave · 1 Day (Tomorrow) · Medical Migraine', time: 'Today, 08:30 AM', type: 'leave' },
    { id: 'PM-202', category: 'Permission Request', name: 'Ananya Roy', role: 'Sales Executive', details: 'Early Departure for Keynote Client Demo at OMR', time: 'Today, 09:15 AM', type: 'permission' },
    { id: 'EXP-303', category: 'Expense Claim', name: 'Karthik Raja', role: 'Sales Executive', details: 'Client Lunch & Travel Reimbursement · ₹3,450', time: 'Yesterday', type: 'expense' },
  ])

  // Fetch backend data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await reportAPI.getCeoDashboard().catch(() => null)
      if (res && res.data) {
        const d = res.data
        if (d.metrics) setMetrics((prev) => ({ ...prev, ...d.metrics }))
        if (d.revenueTrends) setRevenueTrends(d.revenueTrends)
        if (d.salesFunnelData) setSalesFunnelData(d.salesFunnelData)
        if (d.managerPerformance) setManagerPerformance(d.managerPerformance)
        if (d.executivePerformance) setExecutivePerformance(d.executivePerformance)
      }

      const leavesRes = await attendanceAPI.getLeaveRequests().catch(() => null)
      if (leavesRes && leavesRes.data) {
        const pending = leavesRes.data.filter((l) => l.status === 'Pending')
        if (pending.length > 0) {
          setPendingApprovals(
            pending.slice(0, 4).map((l) => ({
              id: l.id || l.request_id || 'LV',
              category: 'Leave Request',
              name: l.employee_name || l.name || 'Team Member',
              role: l.role || 'Staff',
              details: `${l.leave_type || 'Leave'} · ${l.duration || '1 Day'} · ${l.reason || 'Personal'}`,
              time: l.created_at ? new Date(l.created_at).toLocaleDateString() : 'Recent',
              type: 'leave',
            }))
          )
        }
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
      if (type === 'leave') {
        await attendanceAPI.updateLeaveStatus(id, decision, 'Approved from CEO Cockpit').catch(() => null)
      } else if (type === 'expense') {
        if (decision === 'Approved') await expenseAPI.approveExpense(id).catch(() => null)
        else await expenseAPI.rejectExpense(id).catch(() => null)
      }
      setPendingApprovals((prev) => prev.filter((item) => item.id !== id))
      showToast(`${type.toUpperCase()} ${decision} successfully!`, 'success')
    } catch {
      setPendingApprovals((prev) => prev.filter((item) => item.id !== id))
      showToast(`Approval marked as ${decision}`, 'info')
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
      value: `₹${(metrics.totalRevenue / 100000).toFixed(2)}L`,
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
      id: 'leads',
      title: 'Active Leads & Won',
      value: `${metrics.activeLeads} / ${metrics.wonDeals}`,
      subtitle: 'Active Leads / Won Deals',
      icon: Target,
      color: 'blue',
      badge: 'Funnel',
    },
    {
      id: 'pipeline',
      title: 'Pipeline & Win Rate',
      value: `₹${(metrics.pipelineValue / 100000).toFixed(1)}L`,
      subtitle: `${metrics.conversionRate}% Win Rate`,
      icon: TrendingUp,
      color: 'amber',
      badge: 'Velocity',
    },
    {
      id: 'target',
      title: 'Target vs Achievement',
      value: `${targetPercentage}%`,
      subtitle: '₹2.84 Cr / ₹3.50 Cr Target',
      icon: Award,
      color: 'teal',
      badge: 'Annual Goal',
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
      subtitle: 'Leaves, Permissions, Expenses',
      icon: CheckCircle2,
      color: 'rose',
      badge: pendingApprovals.length > 0 ? 'Action Req' : 'Cleared',
    },
    {
      id: 'activities',
      title: 'Recent Activities',
      value: `${recentActivities.length} Events`,
      subtitle: 'Signed deals, visits & logs',
      icon: Activity,
      color: 'slate',
      badge: 'Live Log',
    },
  ]

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-12">
      {/* Minimal Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-teal-50 text-[#004749]">
              <Sparkles className="size-4" />
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Executive Dashboard
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Click any KPI card below to inspect its detailed analytics and manager/executive performance.
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
                  timeRange === t ? 'bg-[#004749] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition"
          >
            <Download className="size-3.5" />
            Export Brief
          </button>
        </div>
      </div>

      {/* ── INTERACTIVE KPI CARDS GRID (All 8 Core Metrics) ── */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon
          const isSelected = activeKpi === kpi.id

          return (
            <button
              key={kpi.id}
              onClick={() => setActiveKpi(kpi.id)}
              className={`text-left rounded-2xl p-4 transition-all duration-200 relative overflow-hidden group cursor-pointer border ${
                isSelected
                  ? 'bg-[#004749] text-white border-[#004749] shadow-lg shadow-[#004749]/20 ring-2 ring-[#b09b72]'
                  : 'bg-white text-slate-900 border-slate-200/90 hover:border-[#004749]/50 hover:shadow-md'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider ${
                    isSelected ? 'text-teal-200' : 'text-slate-400'
                  }`}
                >
                  {kpi.title}
                </span>
                <span
                  className={`grid size-8 place-items-center rounded-xl transition ${
                    isSelected
                      ? 'bg-white/15 text-white'
                      : 'bg-slate-100 text-slate-600 group-hover:bg-teal-50 group-hover:text-[#004749]'
                  }`}
                >
                  <Icon className="size-4" />
                </span>
              </div>

              {/* Value */}
              <div className="mt-2">
                <p className={`text-2xl font-black tracking-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                  {kpi.value}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <p className={`text-[11px] font-medium ${isSelected ? 'text-teal-100/90' : 'text-slate-500'}`}>
                    {kpi.subtitle}
                  </p>
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      isSelected
                        ? 'bg-[#b09b72] text-[#004749]'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {kpi.badge}
                  </span>
                </div>
              </div>

              {/* Bottom active indicator bar */}
              {isSelected && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#b09b72]" />
              )}
            </button>
          )
        })}
      </div>

      {/* ── DYNAMIC DEEP-DIVE INSPECTION DISPLAY (Appears on KPI Click) ── */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-6 animate-in fade-in duration-200">
        
        {/* Dynamic Display Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-teal-50 text-[#004749]">
              <Eye className="size-4.5" />
            </span>
            <div>
              <h2 className="text-base font-black text-slate-900 capitalize">
                {activeKpi === 'revenue' && 'Revenue Growth & Realization Trends'}
                {activeKpi === 'customers' && 'Customer Intelligence & Accounts Breakdown'}
                {activeKpi === 'leads' && 'Sales Funnel Velocity & Lead Conversion'}
                {activeKpi === 'pipeline' && 'Opportunities Pipeline & Stage Probability'}
                {activeKpi === 'target' && 'Sales Target vs Achievement Benchmark'}
                {activeKpi === 'employees' && 'Workforce Strength & Individual Performance'}
                {activeKpi === 'approvals' && 'Pending CEO Approvals & Action Queue'}
                {activeKpi === 'activities' && 'Recent Executive Activity Log'}
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Detailed view for selected KPI ({activeKpi.toUpperCase()})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeKpi === 'revenue' && (
              <Link to="/ceo/revenue-finance" className="text-xs font-bold text-[#004749] hover:underline flex items-center gap-1">
                Full Finance Statement <ChevronRight className="size-3.5" />
              </Link>
            )}
            {activeKpi === 'customers' && (
              <Link to="/ceo/customers" className="text-xs font-bold text-[#004749] hover:underline flex items-center gap-1">
                Customer Database <ChevronRight className="size-3.5" />
              </Link>
            )}
            {activeKpi === 'leads' && (
              <Link to="/ceo/sales-overview" className="text-xs font-bold text-[#004749] hover:underline flex items-center gap-1">
                Sales Pipeline <ChevronRight className="size-3.5" />
              </Link>
            )}
            {activeKpi === 'approvals' && (
              <Link to="/ceo/hrms" className="text-xs font-bold text-[#004749] hover:underline flex items-center gap-1">
                Full HRMS Hub <ChevronRight className="size-3.5" />
              </Link>
            )}
          </div>
        </div>

        {/* 1. REVENUE DETAIL VIEW */}
        {activeKpi === 'revenue' && (
          <div className="space-y-6">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradMinimal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#004749" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#004749" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                  <Tooltip formatter={(val) => [`₹${Number(val).toLocaleString()}`, 'Revenue']} />
                  <Area type="monotone" dataKey="revenue" stroke="#004749" strokeWidth={3} fill="url(#revenueGradMinimal)" />
                  <Area type="monotone" dataKey="target" stroke="#b09b72" strokeWidth={2} strokeDasharray="4 4" fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Manager-wise Revenue Breakdown Cards */}
            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              {managerPerformance.map((mgr, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-black text-slate-900">{mgr.name}</h4>
                      <p className="text-xs text-slate-500">{mgr.region}</p>
                    </div>
                    <span className="rounded bg-teal-50 px-2 py-0.5 text-xs font-black text-[#004749]">
                      {mgr.achievement}% Quota
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-bold pt-2 border-t border-slate-200/70">
                    <span className="text-slate-500">Realized: ₹{mgr.revenue.toLocaleString()}</span>
                    <span className="text-emerald-700">{mgr.wonDeals} Closed Accounts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. CUSTOMERS DETAIL VIEW */}
        {activeKpi === 'customers' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Top Account Contracts</h3>
              <div className="space-y-2.5">
                {[
                  { company: 'Apex Technologies Pvt Ltd', value: '₹4,50,000', rep: 'Ananya Roy', location: 'Chennai' },
                  { company: 'Star Tech Enterprises', value: '₹3,80,000', rep: 'Ananya Roy', location: 'Hyderabad' },
                  { company: 'Vertex Systems Group', value: '₹3,00,000', rep: 'Robert Smith', location: 'Mumbai' },
                  { company: 'Global Corp Solutions', value: '₹2,50,000', rep: 'Karthik Raja', location: 'Bangalore' },
                ].map((c, i) => (
                  <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200/70 text-xs">
                    <div>
                      <p className="font-extrabold text-slate-900">{c.company}</p>
                      <p className="text-[10px] text-slate-400">{c.location} · Rep: {c.rep}</p>
                    </div>
                    <span className="font-black text-[#004749]">{c.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Acquisition Summary</h3>
                <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                  <div className="bg-white p-4 rounded-xl border border-slate-200/70">
                    <span className="text-2xl font-black text-slate-900">{metrics.totalCustomers}</span>
                    <p className="text-[11px] font-bold text-slate-500 mt-1">Total Active Clients</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200/70">
                    <span className="text-2xl font-black text-teal-700">+{metrics.newCustomers}</span>
                    <p className="text-[11px] font-bold text-slate-500 mt-1">New This Quarter</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-4 text-center">
                98.2% Client SLA retention rate across South & Western operating zones.
              </p>
            </div>
          </div>
        )}

        {/* 3. LEADS & FUNNEL DETAIL VIEW */}
        {activeKpi === 'leads' && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              {salesFunnelData.map((f, i) => (
                <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">{f.stage}</span>
                  <p className="text-xl font-black text-slate-900">{f.count}</p>
                  <p className="text-xs font-bold text-[#004749]">{f.value}</p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl bg-teal-50/60 p-4 border border-teal-200 flex items-center justify-between text-xs">
              <span className="font-bold text-[#004749]">Cumulative Funnel Win Rate: {metrics.conversionRate}%</span>
              <Link to="/ceo/sales-overview" className="font-black text-[#004749] hover:underline">Open Pipeline Kanban →</Link>
            </div>
          </div>
        )}

        {/* 4. PIPELINE DETAIL VIEW */}
        {activeKpi === 'pipeline' && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Total Weighted Pipeline</span>
                <p className="text-2xl font-black text-[#004749] mt-1">₹42.50 Lakhs</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Active Proposal Stage</span>
                <p className="text-2xl font-black text-amber-600 mt-1">18 Deals</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Negotiation Stage</span>
                <p className="text-2xl font-black text-purple-600 mt-1">12 Deals</p>
              </div>
            </div>
          </div>
        )}

        {/* 5. TARGET DETAIL VIEW */}
        {activeKpi === 'target' && (
          <div className="space-y-4">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-600">Annual Target Benchmark</span>
              <span className="text-[#004749] font-black">{targetPercentage}% (₹2.84 Cr / ₹3.50 Cr)</span>
            </div>
            <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#004749] via-[#013b3f] to-[#b09b72]"
                style={{ width: `${targetPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-semibold text-slate-400">
              <span>Realized: ₹2.84 Cr</span>
              <span>Remaining Gap: ₹66.0 Lakhs</span>
            </div>
          </div>
        )}

        {/* 6. EMPLOYEES DETAIL VIEW */}
        {activeKpi === 'employees' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase">
                  <th className="pb-2">Executive</th>
                  <th className="pb-2">Manager</th>
                  <th className="pb-2">Visits / Leads</th>
                  <th className="pb-2">Deals Won</th>
                  <th className="pb-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {executivePerformance.map((exec, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-2.5 font-bold text-slate-900">{exec.name}</td>
                    <td className="py-2.5 text-slate-500">{exec.manager}</td>
                    <td className="py-2.5 text-slate-700">{exec.visits} visits / {exec.leads} leads</td>
                    <td className="py-2.5 font-bold text-emerald-700">{exec.wonDeals} Won</td>
                    <td className="py-2.5 text-right font-black text-slate-900">₹{exec.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 7. APPROVALS DETAIL VIEW */}
        {activeKpi === 'approvals' && (
          <div className="space-y-3">
            {pendingApprovals.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <CheckCircle2 className="size-8 mx-auto text-emerald-500 mb-1" />
                <p className="text-xs font-bold text-slate-700">All pending approvals are cleared!</p>
              </div>
            ) : (
              pendingApprovals.map((req) => (
                <div key={req.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-teal-50 px-1.5 py-0.2 text-[9px] font-black text-[#004749] uppercase">
                        {req.category}
                      </span>
                      <span className="font-extrabold text-slate-900">{req.name} ({req.role})</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">{req.details}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleQuickApproval(req.id, req.type, 'Rejected')}
                      className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleQuickApproval(req.id, req.type, 'Approved')}
                      className="rounded-lg bg-[#004749] text-white px-3 py-1 text-[11px] font-bold hover:bg-[#013b3f]"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 8. ACTIVITIES DETAIL VIEW */}
        {activeKpi === 'activities' && (
          <div className="space-y-2.5">
            {recentActivities.map((act) => {
              const Icon = act.icon
              return (
                <div key={act.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className={`grid size-7 place-items-center rounded-lg ${act.color}`}>
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <p className="font-extrabold text-slate-900">{act.title}</p>
                      <p className="text-[10px] text-slate-400">{act.company} · Handler: {act.rep}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-[#004749]">{act.amount}</span>
                    <p className="text-[9px] text-slate-400">{act.time}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default CeoDashboard
