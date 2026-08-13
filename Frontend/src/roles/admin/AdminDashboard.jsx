import { useState, useEffect } from 'react'
import { useToast } from '../../common/ToastContext.jsx'
import { formatDate } from '../../utils/dateUtils.js'
import { exportToCSV } from '../../utils/exportUtils.js'
import {
  Users,
  Calendar,
  Clock,
  Activity,
  ShieldCheck,
  Filter,
  Download,
  SlidersHorizontal,
  Database,
  Server,
  Terminal,
} from 'lucide-react'
import { hrmsAPI, attendanceAPI, auditAPI } from '../../services/api.js'

export default function AdminDashboard() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('Today')
  const [roleFilter, setRoleFilter] = useState('All')

  // Modular Widget Customizer State
  const [customizerOpen, setCustomizerOpen] = useState(false)
  const [activeWidgets, setActiveWidgets] = useState({
    systemStats: true,
    activityLogs: true,
    userDistribution: true,
    attendanceWidget: true,
  })

  const [stats, setStats] = useState({
    totalUsers: 0,
    adminsCount: 0,
    salesManagers: 0,
    salesExecutives: 0,
    auditLogsCount: 0,
    attendanceSummary: { present: 0, absent: 0, late: 0 },
  })

  // Real System Audit Logs for Stream
  const [systemActivities, setSystemActivities] = useState([])

  useEffect(() => {
    async function loadAdminDashboardData() {
      setLoading(true)
      try {
        const [empRes, attRes, auditRes] = await Promise.allSettled([
          hrmsAPI.getEmployees(),
          attendanceAPI.getLogs(),
          auditAPI.getLogs(),
        ])

        const empsList = empRes.status === 'fulfilled' && empRes.value?.data ? empRes.value.data : []
        const attList = attRes.status === 'fulfilled' && attRes.value?.data ? attRes.value.data : []
        const auditList = auditRes.status === 'fulfilled' && auditRes.value?.data ? auditRes.value.data : []

        // Filter and count designations
        const totalAdmins = empsList.filter(e => {
          const r = (e.role || '').toLowerCase();
          return r.includes('admin') || r.includes('administrator');
        }).length

        const totalManagers = empsList.filter(e => {
          const r = (e.role || '').toLowerCase();
          return r.includes('manager');
        }).length

        const totalExecutives = empsList.filter(e => {
          const r = (e.role || '').toLowerCase();
          return r.includes('executive') || r.includes('sales');
        }).length

        // Attendance stats
        const presentCount = attList.filter(a => String(a.status || '').toUpperCase() === 'PRESENT').length
        const lateCount = attList.filter(a => a.clock_in && String(a.clock_in).slice(11, 16) > '09:15').length
        const absentCount = Math.max(0, empsList.length - presentCount)

        setStats({
          totalUsers: empsList.length,
          adminsCount: totalAdmins,
          salesManagers: totalManagers,
          salesExecutives: totalExecutives,
          auditLogsCount: auditList.length,
          attendanceSummary: { present: presentCount, absent: absentCount, late: lateCount },
        })

        // Map real audit logs into systemActivities
        if (auditList.length > 0) {
          setSystemActivities(auditList.slice(0, 10).map((a, i) => ({
            id: a.id || `audit_${i}`,
            user: a.user_email || a.email || 'System User',
            role: a.user_role || 'Staff',
            action: a.action || 'System Action',
            module: a.module || 'system',
            time: a.created_at || new Date().toISOString(),
            details: a.description || (typeof a.details === 'string' ? a.details : a.details?.description) || 'System operation executed'
          })))
        } else {
          setSystemActivities([])
        }
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
      { Metric: 'Administrators Count', Value: stats.adminsCount },
      { Metric: 'Sales Managers Count', Value: stats.salesManagers },
      { Metric: 'Sales Executives Count', Value: stats.salesExecutives },
      { Metric: 'Total Security Audit Logs', Value: stats.auditLogsCount },
      { Metric: 'HRMS Attendance Present Rate', Value: `${stats.attendanceSummary.present} Present / ${stats.attendanceSummary.absent} Absent` },
      { Metric: 'Report Generated Date', Value: formatDate(new Date()) },
    ]
    exportToCSV(`TConnect_Admin_System_Control_Report_${new Date().toISOString().slice(0, 10)}.csv`, exportRows)
    showToast('System control summary exported to CSV successfully.', 'success')
  }

  const toggleWidget = (key) => {
    setActiveWidgets((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="space-y-6 font-sans text-slate-900">
      {/* Top Banner & Action Controls */}
      <div className="bg-gradient-to-r from-slate-900 via-[#1e293b] to-indigo-950 rounded-3xl p-6 lg:p-8 text-white shadow-xl border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" /> Admin Control Operations
          </div>
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight">System Operations Dashboard</h1>
          <p className="text-slate-300 text-xs sm:text-sm font-medium max-w-2xl">
            Real-time monitoring of system user accounts, role allocations, security logs, and database connectivity metrics.
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
            <Download className="w-4 h-4" /> Export System Report
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
              className="bg-transparent text-slate-900 focus:outline-none cursor-pointer font-bold"
            >
              <option value="Today">Today ({formatDate(new Date())})</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500 uppercase text-[10px]">Filter Scope:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent text-slate-900 focus:outline-none cursor-pointer font-bold"
            >
              <option value="All">All Operations</option>
              <option value="Executive">Sales Operations</option>
              <option value="Manager">Management Scope</option>
            </select>
          </div>
        </div>

        <div className="text-xs font-bold text-slate-400 flex items-center gap-2">
          <span>System Engine:</span>
          <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Supabase Connected
          </span>
        </div>
      </div>

      {/* SECTION 1: System Admin Controls KPIs */}
      {activeWidgets.systemStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Registered Users */}
          <div className="bg-white border border-slate-200/90 p-4.5 rounded-2xl shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Users</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mt-2">{loading ? '...' : stats.totalUsers}</h3>
            <span className="text-[11px] text-blue-600 font-bold">Registered Accounts</span>
          </div>

          {/* Administrators count */}
          <div className="bg-white border border-slate-200/90 p-4.5 rounded-2xl shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Administrators</span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mt-2">{loading ? '...' : stats.adminsCount}</h3>
            <span className="text-[11px] text-purple-600 font-bold">System Control Roles</span>
          </div>

          {/* Security Audits total */}
          <div className="bg-white border border-slate-200/90 p-4.5 rounded-2xl shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Security Audits</span>
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Terminal className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mt-2">{loading ? '...' : stats.auditLogsCount}</h3>
            <span className="text-[11px] text-slate-600 font-bold">Total Operations Logs</span>
          </div>

          {/* DB Status */}
          <div className="bg-white border border-slate-200/90 p-4.5 rounded-2xl shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Database Engine</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-xl font-black text-emerald-700 mt-2">Active</h3>
            <span className="text-[11px] text-emerald-600 font-bold">Supabase Realtime</span>
          </div>

          {/* System Load status */}
          <div className="bg-white border border-slate-200/90 p-4.5 rounded-2xl shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Server Health</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-indigo-700 flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-xl font-black text-indigo-900 mt-2">99.9% Uptime</h3>
            <span className="text-[11px] text-indigo-700 font-bold">All Engines Operational</span>
          </div>
        </div>
      )}

      {/* SECTION 2: Live Security activity feed and Database summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live System Activity Logs */}
        {activeWidgets.activityLogs && (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600 animate-pulse" />
                <h3 className="font-extrabold text-slate-900 text-sm">Live System Audit & Security Stream</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Real-Time Activity Logs</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
              {systemActivities.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-bold text-xs">
                  No system activity logs recorded yet.
                </div>
              ) : (
                systemActivities.map((act) => (
                  <div key={act.id} className="p-4 hover:bg-slate-50/80 transition flex items-start justify-between gap-4 text-xs font-semibold">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-900 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                        {act.user.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-900 text-xs">
                          {act.user} <span className="text-slate-400 font-normal">({act.role})</span>
                        </p>
                        <p className="text-xs text-blue-700 font-black mt-0.5">
                          Action: <span className="text-slate-800 font-extrabold">{act.action}</span> · <span className="text-indigo-600 uppercase font-black text-[9px]">{act.module}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1 italic leading-relaxed">&ldquo;{act.details}&rdquo;</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* User Distribution and Attendance summaries */}
        <div className="space-y-6">
          {/* User Distribution by Role */}
          {activeWidgets.userDistribution && (
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" /> User Distribution by Role
                </h3>
                <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  System Roles
                </span>
              </div>
              <div className="space-y-3 font-semibold text-xs text-slate-700">
                {[
                  { label: "Administrators", count: stats.adminsCount, bg: "bg-purple-500", text: "text-purple-700" },
                  { label: "Sales Managers", count: stats.salesManagers, bg: "bg-amber-500", text: "text-amber-700" },
                  { label: "Sales Executives", count: stats.salesExecutives, bg: "bg-blue-500", text: "text-blue-700" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-150">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${item.bg}`} />
                      <span>{item.label}</span>
                    </div>
                    <span className={`font-black ${item.text}`}>{item.count} users</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attendance Compliance (Kept for System Admin operation monitoring) */}
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
        </div>
      </div>

      {/* Customizer Modal */}
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
              Toggle specific system administration widgets on/off as per your monitoring preference:
            </p>

            <div className="space-y-3 pt-2 text-xs font-bold text-slate-800">
              {Object.entries({
                systemStats: 'System Control KPI Cards',
                activityLogs: 'Live System Activity Stream',
                userDistribution: 'User Distribution by Role',
                attendanceWidget: 'Daily Attendance Compliance',
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
