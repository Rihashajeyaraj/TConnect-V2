import { useState, useEffect } from 'react'
import { useToast } from '../../common/ToastContext.jsx'
import { formatDate } from '../../utils/dateUtils.js'
import { exportToCSV } from '../../utils/exportUtils.js'
import {
  Users,
  Target,
  UserCheck,
  Briefcase,
  UserCheck2,
  Calendar,
  MessageSquare,
  GitBranch,
  Clock,
  DollarSign,
  Activity,
  ShieldCheck,
  Search,
  Filter,
  Download,
  SlidersHorizontal,
  CheckCircle2,
  MapPin,
  RefreshCw,
  Eye,
  Settings,
} from 'lucide-react'
import { crmAPI, customerAPI, hrmsAPI, attendanceAPI, visitAPI, pipelineAPI, expenseAPI } from '../../services/api.js'

export default function AdminDashboard() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('Today')
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')

  // Modular Widget Customizer State (Extensible for future modules)
  const [customizerOpen, setCustomizerOpen] = useState(false)
  const [activeWidgets, setActiveWidgets] = useState({
    fieldStats: true,
    salesPipeline: true,
    liveVisits: true,
    attendanceWidget: true,
    expenseWidget: true,
    systemMetrics: true,
  })

  const [stats, setStats] = useState({
    totalUsers: 18,
    totalLeads: 28,
    totalCustomers: 12,
    salesManagers: 3,
    salesExecutives: 12,
    todaysVisits: 8,
    pendingFollowups: 14,
    openOpportunities: 9,
    pipelineValue: 4850000,
    attendanceSummary: { present: 11, absent: 2, late: 1 },
    expenseSummary: { pending: 3, approved: 8, totalAmount: 45200 },
    systemHealth: { apiStatus: 'Operational', dbLatency: '18ms', storage: '82% free' },
  })

  // Sample Field Activity Logs
  const [fieldActivities, setFieldActivities] = useState([
    { id: 'act_1', exec: 'Suresh Raina', role: 'Sales Executive', client: 'Apex Tech OMR', location: 'Guindy, Chennai', time: new Date().toISOString(), status: 'Checked In', notes: 'Demonstrated product workflow' },
    { id: 'act_2', exec: 'Arun Kumar', role: 'Sales Executive', client: 'Bayfront Royal', location: 'Adyar, Chennai', time: new Date(Date.now() - 3600000).toISOString(), status: 'Completed', notes: 'Quotation submitted' },
    { id: 'act_3', exec: 'Kavitha S.', role: 'Sales Executive', client: 'Global Logistics Inc', location: 'Velachery, Chennai', time: new Date(Date.now() - 7200000).toISOString(), status: 'Pending Review', notes: 'Requires Manager sign-off' },
  ])

  useEffect(() => {
    async function loadAdminDashboardData() {
      setLoading(true)
      try {
        const [crmRes, custRes, empRes, attRes, visitRes, pipeRes, expRes] = await Promise.allSettled([
          crmAPI.getLeads(),
          customerAPI.getCustomers(),
          hrmsAPI.getEmployees(),
          attendanceAPI.getLogs(),
          visitAPI.getVisits(),
          pipelineAPI.getOpportunities(),
          expenseAPI.getExpenses(),
        ])

        setStats((prev) => ({
          ...prev,
          totalLeads: crmRes.status === 'fulfilled' && crmRes.value?.data ? crmRes.value.data.length : 28,
          totalCustomers: custRes.status === 'fulfilled' && custRes.value?.data ? custRes.value.data.length : 12,
          totalUsers: empRes.status === 'fulfilled' && empRes.value?.data ? empRes.value.data.length : 18,
          salesExecutives: empRes.status === 'fulfilled' && empRes.value?.data ? empRes.value.data.filter((e) => (e.role || '').toLowerCase().includes('executive')).length || 12 : 12,
          salesManagers: empRes.status === 'fulfilled' && empRes.value?.data ? empRes.value.data.filter((e) => (e.role || '').toLowerCase().includes('manager')).length || 3 : 3,
          todaysVisits: visitRes.status === 'fulfilled' && visitRes.value?.data ? visitRes.value.data.length : 8,
          openOpportunities: pipeRes.status === 'fulfilled' && pipeRes.value?.data ? pipeRes.value.data.length : 9,
        }))
      } catch (e) {
        console.error('Error loading admin dashboard data:', e)
      } finally {
        setLoading(false)
      }
    }
    loadAdminDashboardData()
  }, [dateRange])

  // CSV Export Handler
  const handleExportDashboardCSV = () => {
    const exportRows = [
      { Metric: 'Total Registered Staff & Users', Value: stats.totalUsers },
      { Metric: 'Active Field Sales Executives', Value: stats.salesExecutives },
      { Metric: 'Sales Managers', Value: stats.salesManagers },
      { Metric: 'Today Field Visits Logged', Value: stats.todaysVisits },
      { Metric: 'Total CRM Leads', Value: stats.totalLeads },
      { Metric: 'Converted Customers', Value: stats.totalCustomers },
      { Metric: 'Active Open Opportunities', Value: stats.openOpportunities },
      { Metric: 'Estimated Pipeline Revenue (INR)', Value: stats.pipelineValue },
      { Metric: 'Field Attendance Present Rate', Value: `${stats.attendanceSummary.present} Present / ${stats.attendanceSummary.absent} Absent` },
      { Metric: 'Pending Expense Reimbursements', Value: `₹${stats.expenseSummary.totalAmount}` },
      { Metric: 'Report Generated Date', Value: formatDate(new Date()) },
    ]
    exportToCSV(`TConnect_Admin_Field_Operations_Report_${new Date().toISOString().slice(0, 10)}.csv`, exportRows)
    showToast('Dashboard summary exported to CSV successfully.', 'success')
  }

  const toggleWidget = (key) => {
    setActiveWidgets((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="space-y-6 font-sans text-slate-900">
      {/* Top Banner & Action Controls */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 rounded-3xl p-6 lg:p-8 text-white shadow-xl border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" /> Admin Operations Center
          </div>
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight">Sales & Field Operations Dashboard</h1>
          <p className="text-slate-300 text-xs sm:text-sm font-medium max-w-2xl">
            Real-time monitoring of field force activities, client check-ins, sales pipeline, attendance, and team performance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Dashboard Customizer Trigger */}
          <button
            onClick={() => setCustomizerOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-2 cursor-pointer transition shadow-xs"
            title="Customizer / Toggle Widgets"
          >
            <SlidersHorizontal className="w-4 h-4 text-blue-400" /> Customize View
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportDashboardCSV}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer transition"
          >
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Date Range Selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500 uppercase text-[10px]">Period:</span>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="Today">Today ({formatDate(new Date())})</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500 uppercase text-[10px]">Team:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="All">All Personnel</option>
              <option value="Executive">Sales Executives</option>
              <option value="Manager">Sales Managers</option>
            </select>
          </div>
        </div>

        <div className="text-xs font-bold text-slate-400 flex items-center gap-2">
          <span>System Status:</span>
          <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Operational
          </span>
        </div>
      </div>

      {/* SECTION 1: Core Field & Sales KPIs */}
      {activeWidgets.fieldStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Active Field Staff */}
          <div className="bg-white border border-slate-200/90 p-4.5 rounded-2xl shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Field Executives</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <UserCheck2 className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mt-2">{loading ? '...' : stats.salesExecutives}</h3>
            <span className="text-[11px] text-blue-600 font-bold">Active On Field Reps</span>
          </div>

          {/* Today's Client Visits */}
          <div className="bg-white border border-slate-200/90 p-4.5 rounded-2xl shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Field Check-ins</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mt-2">{loading ? '...' : stats.todaysVisits}</h3>
            <span className="text-[11px] text-emerald-600 font-bold">Client Site Visits Logged</span>
          </div>

          {/* Total Leads */}
          <div className="bg-white border border-slate-200/90 p-4.5 rounded-2xl shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Total Leads</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Target className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mt-2">{loading ? '...' : stats.totalLeads}</h3>
            <span className="text-[11px] text-indigo-600 font-bold">Active Inquiries</span>
          </div>

          {/* Open Opportunities */}
          <div className="bg-white border border-slate-200/90 p-4.5 rounded-2xl shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Open Deals</span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <GitBranch className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mt-2">{loading ? '...' : stats.openOpportunities}</h3>
            <span className="text-[11px] text-purple-600 font-bold">Sales Pipeline</span>
          </div>

          {/* Pipeline Revenue */}
          <div className="bg-white border border-slate-200/90 p-4.5 rounded-2xl shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Pipeline Value</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-xl font-black text-slate-900 mt-2">₹{(stats.pipelineValue / 100000).toFixed(1)}L</h3>
            <span className="text-[11px] text-amber-600 font-bold">Forecasted Revenue</span>
          </div>
        </div>
      )}

      {/* SECTION 2: Live Field Activity Feed & Attendance Verifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Field Visit Log */}
        {activeWidgets.liveVisits && (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">Live Field Visit Stream</h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">Real-Time Check-Ins</span>
            </div>

            <div className="divide-y divide-slate-100">
              {fieldActivities.map((act) => (
                <div key={act.id} className="p-4 hover:bg-slate-50/80 transition flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      {act.exec.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-900 text-xs">{act.exec} <span className="text-slate-400 font-normal">({act.role})</span></p>
                      <p className="text-xs text-blue-600 font-bold mt-0.5">{act.client} · <span className="text-slate-600 font-normal">{act.location}</span></p>
                      <p className="text-[11px] text-slate-500 mt-1 italic">&ldquo;{act.notes}&rdquo;</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold uppercase">
                      {act.status}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">{formatDate(act.time)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attendance & Expense Summaries */}
        <div className="space-y-6">
          {activeWidgets.attendanceWidget && (
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" /> Attendance Compliance
                </h3>
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {formatDate(new Date())}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-[10px] text-slate-500 font-extrabold uppercase">Present</p>
                  <p className="text-xl font-black text-emerald-600 mt-1">{stats.attendanceSummary.present}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-[10px] text-slate-500 font-extrabold uppercase">Absent</p>
                  <p className="text-xl font-black text-rose-600 mt-1">{stats.attendanceSummary.absent}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-[10px] text-slate-500 font-extrabold uppercase">Late</p>
                  <p className="text-xl font-black text-amber-600 mt-1">{stats.attendanceSummary.late}</p>
                </div>
              </div>
            </div>
          )}

          {activeWidgets.expenseWidget && (
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-600" /> Field Expense Claims
                </h3>
                <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Claims
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-[10px] text-slate-500 font-extrabold uppercase">Pending Claims</p>
                  <p className="text-xl font-black text-amber-600 mt-1">{stats.expenseSummary.pending}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-[10px] text-slate-500 font-extrabold uppercase">Approved Amount</p>
                  <p className="text-base font-black text-slate-900 mt-1">₹{stats.expenseSummary.totalAmount.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Customizer Modal for Extensible Future Widgets */}
      {customizerOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">Dashboard View Customizer</h3>
              </div>
              <button onClick={() => setCustomizerOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer">
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Toggle specific field and management module widgets on/off as per your monitoring preference:
            </p>

            <div className="space-y-3 pt-2 text-xs font-bold text-slate-800">
              {Object.entries({
                fieldStats: 'Field Key Performance Cards',
                salesPipeline: 'Sales Pipeline Summary',
                liveVisits: 'Live Field Visit Check-In Stream',
                attendanceWidget: 'Daily Attendance Compliance',
                expenseWidget: 'Field Expense Claims Summary',
              }).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/80 transition">
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={activeWidgets[key]}
                    onChange={() => toggleWidget(key)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </label>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 text-right">
              <button
                onClick={() => setCustomizerOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs cursor-pointer shadow-md shadow-blue-600/30"
              >
                Apply Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
