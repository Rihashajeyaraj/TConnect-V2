import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  FileCheck,
  UserPlus,
  Percent,
  X,
} from 'lucide-react'
import { hrmsAPI, attendanceAPI, auditAPI, adminAPI, notificationAPI } from '../../services/api.js'

export default function AdminDashboard() {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('Today')
  const [roleFilter, setRoleFilter] = useState('All')
  
  // Incentive modal state
  const [showIncentiveModal, setShowIncentiveModal] = useState(false)
  const [selectedIncentiveEmp, setSelectedIncentiveEmp] = useState(null)
  const [incentivePctInput, setIncentivePctInput] = useState(5)
  const [incentiveSaving, setIncentiveSaving] = useState(false)

  // Modular Widget Customizer State
  const [customizerOpen, setCustomizerOpen] = useState(false)
  const [activeWidgets, setActiveWidgets] = useState({
    systemStats: true,
    activityLogs: true,
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

  // Dynamic backend KPI metrics
  const [kpiData, setKpiData] = useState({
    total_users: { value: 0, label: 'Registered Accounts' },
    administrators: { value: 0, label: 'System Control Roles' },
    security_audits: { value: 0, label: 'Total Operations Logs' },
    database_engine: { status: 'Inactive', label: 'Supabase Realtime' },
    server_health: { uptime: 0.0, status: 'Service Down' }
  })

  const [pendingDocs, setPendingDocs] = useState([])
  const [previewDoc, setPreviewDoc] = useState(null)
  const [actioningDocId, setActioningDocId] = useState(null)
  const [showApprovalsPage, setShowApprovalsPage] = useState(false)
  const [showTotalUsersPage, setShowTotalUsersPage] = useState(false)
  const [selectedRoleTab, setSelectedRoleTab] = useState('All')
  const [allEmployees, setAllEmployees] = useState([])
  const [showSecurityAuditsPage, setShowSecurityAuditsPage] = useState(false)
  const [selectedAuditModuleTab, setSelectedAuditModuleTab] = useState('All')
  const [allAuditLogs, setAllAuditLogs] = useState([])

  async function loadAdminDashboardData() {
    setLoading(true)
    try {
      const periodParam = dateRange === 'Today' ? 'today' : (dateRange === 'This Week' ? 'week' : (dateRange === 'This Month' ? 'month' : 'all'));
      
      const [empRes, attRes, auditRes, kpisRes] = await Promise.allSettled([
        hrmsAPI.getEmployees(),
        attendanceAPI.getLogs(),
        auditAPI.getLogs(),
        adminAPI.getKPIs(periodParam)
      ])

      const empsList = empRes.status === 'fulfilled' && empRes.value?.data ? empRes.value.data : []
      const attList = attRes.status === 'fulfilled' && attRes.value?.data ? attRes.value.data : []
      const auditList = auditRes.status === 'fulfilled' && auditRes.value?.data ? auditRes.value.data : []
      const kpisObj = kpisRes.status === 'fulfilled' && kpisRes.value?.data ? kpisRes.value.data : null

      setAllEmployees(empsList)
      setAllAuditLogs(auditList)

      if (kpisObj) {
        setKpiData(kpisObj)
      }

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

      // Parse and collect pending document approvals
      const pending = []
      empsList.forEach(emp => {
        let docs = []
        try {
          docs = typeof emp.documents === 'string' ? JSON.parse(emp.documents) : (emp.documents || [])
        } catch (_) {
          docs = []
        }
        if (Array.isArray(docs)) {
          docs.forEach(doc => {
            if (doc.status === 'uploaded') {
              pending.push({
                employeeCode: emp.employee_code || emp.employee_id,
                employeeName: emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.email || 'Employee',
                employeeEmail: emp.email,
                employeeRole: emp.role || emp.designation || 'Staff',
                docId: doc.id,
                docName: doc.name,
                fileName: doc.fileName,
                fileUrl: doc.fileUrl,
                allDocs: docs
              })
            }
          })
        }
      })
      setPendingDocs(pending)

    } catch (e) {
      console.error('Error loading admin dashboard data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAdminDashboardData()
  }, [dateRange])

  const handleApproveDocument = async (doc) => {
    const actionKey = `${doc.employeeCode}_${doc.docId}`
    if (actioningDocId) return
    setActioningDocId(actionKey)
    try {
      const updatedDocs = doc.allDocs.map(d =>
        d.id === doc.docId ? { ...d, status: 'approved' } : d
      )
      await hrmsAPI.updateEmployee(doc.employeeCode, {
        documents: JSON.stringify(updatedDocs)
      })
      
      try {
        await notificationAPI.sendNotification({
          employee_code: doc.employeeCode,
          recipient_email: doc.employeeEmail,
          title: "Document Approved",
          message: `Your document "${doc.docName}" has been approved by the Admin.`,
          type: "SYSTEM",
          reference_module: "HRMS"
        })
      } catch (notifErr) {
        console.warn("Could not send approval notification:", notifErr)
      }

      showToast(`Document "${doc.docName}" approved successfully!`, 'success')
      await loadAdminDashboardData()
    } catch (err) {
      console.error(err)
      showToast(err.message || "Failed to approve document", 'error')
    } finally {
      setActioningDocId(null)
    }
  }

  const handleRejectDocument = async (doc) => {
    const actionKey = `${doc.employeeCode}_${doc.docId}`
    if (actioningDocId) return
    setActioningDocId(actionKey)
    try {
      const updatedDocs = doc.allDocs.map(d =>
        d.id === doc.docId ? { ...d, status: 'rejected', fileUrl: null, fileName: "" } : d
      )
      await hrmsAPI.updateEmployee(doc.employeeCode, {
        documents: JSON.stringify(updatedDocs)
      })

      try {
        await notificationAPI.sendNotification({
          employee_code: doc.employeeCode,
          recipient_email: doc.employeeEmail,
          title: "Document Rejected",
          message: `Your document "${doc.docName}" has been rejected. Please re-upload a valid document.`,
          type: "SYSTEM",
          reference_module: "HRMS"
        })
      } catch (notifErr) {
        console.warn("Could not send rejection notification:", notifErr)
      }

      showToast(`Document "${doc.docName}" rejected.`, 'info')
      await loadAdminDashboardData()
    } catch (err) {
      console.error(err)
      showToast(err.message || "Failed to reject document", 'error')
    } finally {
      setActioningDocId(null)
    }
  }

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
          {kpiData.database_engine.status === 'Active' ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Supabase Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Supabase Disconnected
            </span>
          )}
        </div>
      </div>

      {/* SECTION 1: System Admin Controls KPIs */}
      {activeWidgets.systemStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Total Registered Users */}
          <div 
            onClick={() => setShowTotalUsersPage(true)}
            className="relative overflow-hidden bg-white border border-[#DCE3EF] p-4.5 rounded-2xl shadow-xs hover:shadow-md transition duration-300 cursor-pointer select-none group"
          >
            <div className="absolute top-0 inset-x-0 h-[3px] bg-[#D9A441] opacity-60 group-hover:opacity-100 transition" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#071A45]">Total Users</span>
              <div className="w-9 h-9 rounded-xl bg-slate-50 text-[#123A8C] flex items-center justify-center group-hover:scale-110 transition duration-300">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-[#123A8C] mt-2">{loading ? '...' : kpiData.total_users.value}</h3>
            <span className="text-[11px] text-[#D9A441] font-bold">{kpiData.total_users.label}</span>
          </div>

          {/* Administrators count */}
          <div className="relative overflow-hidden bg-white border border-[#DCE3EF] p-4.5 rounded-2xl shadow-xs hover:shadow-md transition duration-300 group">
            <div className="absolute top-0 inset-x-0 h-[3px] bg-[#D9A441] opacity-60 group-hover:opacity-100 transition" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#071A45]">Administrators</span>
              <div className="w-9 h-9 rounded-xl bg-slate-50 text-[#123A8C] flex items-center justify-center group-hover:scale-110 transition duration-300">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-[#123A8C] mt-2">{loading ? '...' : kpiData.administrators.value}</h3>
            <span className="text-[11px] text-[#D9A441] font-bold">{kpiData.administrators.label}</span>
          </div>

          {/* Document Approvals Card */}
          <div 
            onClick={() => setShowApprovalsPage(true)}
            className="relative overflow-hidden bg-white border border-[#DCE3EF] p-4.5 rounded-2xl shadow-xs hover:shadow-md transition duration-300 cursor-pointer select-none group"
          >
            <div className="absolute top-0 inset-x-0 h-[3px] bg-[#D9A441] opacity-60 group-hover:opacity-100 transition" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#071A45]">Document Approvals</span>
              <div className="w-9 h-9 rounded-xl bg-slate-50 text-[#123A8C] flex items-center justify-center group-hover:scale-110 transition duration-300">
                <FileCheck className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-[#123A8C] mt-2">{loading ? '...' : pendingDocs.length}</h3>
            <span className={`text-[11px] font-bold flex items-center gap-1 ${pendingDocs.length > 0 ? 'text-[#D99A18]' : 'text-[#168A55]'}`}>
              {pendingDocs.length > 0 ? '⚠️ Action Required' : '✓ All Approved'}
            </span>
          </div>

          {/* Security Audits total */}
          <div 
            onClick={() => setShowSecurityAuditsPage(true)}
            className="relative overflow-hidden bg-white border border-[#DCE3EF] p-4.5 rounded-2xl shadow-xs hover:shadow-md transition duration-300 cursor-pointer select-none group"
          >
            <div className="absolute top-0 inset-x-0 h-[3px] bg-[#D9A441] opacity-60 group-hover:opacity-100 transition" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#071A45]">Security Audits</span>
              <div className="w-9 h-9 rounded-xl bg-slate-50 text-[#123A8C] flex items-center justify-center group-hover:scale-110 transition duration-300">
                <Terminal className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-[#123A8C] mt-2">{loading ? '...' : kpiData.security_audits.value}</h3>
            <span className="text-[11px] text-[#D9A441] font-bold">{kpiData.security_audits.label}</span>
          </div>

          {/* DB Status */}
          <div className="relative overflow-hidden bg-white border border-[#DCE3EF] p-4.5 rounded-2xl shadow-xs hover:shadow-md transition duration-300 group">
            <div className="absolute top-0 inset-x-0 h-[3px] bg-[#D9A441] opacity-60 group-hover:opacity-100 transition" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#071A45]">Database Engine</span>
              <div className="w-9 h-9 rounded-xl bg-slate-50 text-[#123A8C] flex items-center justify-center group-hover:scale-110 transition duration-300">
                <Database className="w-5 h-5" />
              </div>
            </div>
            <h3 className={`text-xl font-black mt-2 ${kpiData.database_engine.status === 'Active' ? 'text-[#168A55]' : 'text-[#DC3E3E]'}`}>
              {loading ? '...' : kpiData.database_engine.status}
            </h3>
            <span className="text-[11px] text-[#D9A441] font-bold">{kpiData.database_engine.label}</span>
          </div>

          {/* System Load status */}
          <div className="relative overflow-hidden bg-white border border-[#DCE3EF] p-4.5 rounded-2xl shadow-xs hover:shadow-md transition duration-300 group">
            <div className="absolute top-0 inset-x-0 h-[3px] bg-[#D9A441] opacity-60 group-hover:opacity-100 transition" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#071A45]">Server Health</span>
              <div className="w-9 h-9 rounded-xl bg-slate-50 text-[#123A8C] flex items-center justify-center group-hover:scale-110 transition duration-300">
                <Server className="w-5 h-5" />
              </div>
            </div>
            <h3 className={`text-xl font-black mt-2 ${kpiData.server_health.status.includes('Operational') ? 'text-[#123A8C]' : 'text-[#DC3E3E]'}`}>
              {loading ? '...' : `${kpiData.server_health.uptime}% Uptime`}
            </h3>
            <span className="text-[11px] text-[#D9A441] font-bold">{kpiData.server_health.status}</span>
          </div>
        </div>
      ) }

      {/* SECTION 1.5: Quick Actions Panel */}
      <div className="bg-white border border-[#DCE3EF] p-4 rounded-2xl shadow-xs space-y-3">
        <h3 className="font-extrabold text-[#071A45] text-xs flex items-center gap-1.5 uppercase tracking-wider">
          Quick Actions
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            {
              title: "Attendance",
              icon: Clock,
              path: "/admin/hrms",
              color: "text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50 border-emerald-100 hover:border-emerald-250",
            },
            {
              title: "Create Employee",
              icon: UserPlus,
              path: "/admin/users",
              state: { openAddModal: true },
              color: "text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 border-indigo-100 hover:border-indigo-250",
            },
            {
              title: "Edit Employee",
              icon: Users,
              path: "/admin/users",
              state: { focusSearch: true },
              color: "text-[#123A8C] bg-blue-50/50 hover:bg-blue-50 border-blue-100 hover:border-blue-250",
            },
            {
              title: "Add Incentive",
              icon: Percent,
              onClick: () => setShowIncentiveModal(true),
              color: "text-rose-700 bg-rose-50/50 hover:bg-rose-50 border-rose-100 hover:border-rose-250",
            },
            {
              title: "Security Roles",
              icon: ShieldCheck,
              path: "/admin/roles",
              color: "text-amber-700 bg-amber-50/50 hover:bg-amber-50 border-amber-100 hover:border-amber-250",
            },
          ].map((action) => {
            const IconComp = action.icon
            return (
              <button
                key={action.title}
                type="button"
                onClick={() => {
                  if (action.onClick) {
                    action.onClick()
                  } else {
                    navigate(action.path, { state: action.state })
                  }
                }}
                className={`flex items-center gap-2.5 p-3 rounded-xl border ${action.color} text-xs font-bold transition duration-200 cursor-pointer shadow-3xs hover:shadow-2xs select-none`}
              >
                <IconComp className="w-4 h-4 shrink-0" />
                <span>{action.title}</span>
              </button>
            )
          })}
        </div>
      </div>



      {/* SECTION 2: Live Security activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live System Activity Logs */}
        {activeWidgets.activityLogs && (
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
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

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-4xl w-full flex flex-col border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-slate-950 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 className="font-extrabold text-sm text-slate-100">{previewDoc.docName}</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  Uploaded by: {previewDoc.employeeName} ({previewDoc.employeeCode}) · {previewDoc.employeeRole}
                </p>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-white font-extrabold text-sm p-1 rounded-lg hover:bg-slate-800 cursor-pointer transition"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Content / Preview Area */}
            <div className="flex-1 bg-slate-100 p-6 overflow-y-auto flex items-center justify-center min-h-[300px]">
              {previewDoc.fileUrl ? (
                previewDoc.fileUrl.startsWith('data:image/') || 
                /\.(jpg|jpeg|png|webp|gif)$/i.test(previewDoc.fileName) ? (
                  <img
                    src={previewDoc.fileUrl}
                    className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-md"
                    alt="Document Preview"
                  />
                ) : (
                  <iframe
                    src={previewDoc.fileUrl}
                    className="w-full h-[60vh] rounded-xl border border-slate-200 bg-white"
                    title="Document Preview Frame"
                  />
                )
              ) : (
                <div className="text-center p-8 text-slate-500 font-bold text-sm">
                  ⚠️ Preview unavailable: no file data found.
                </div>
              )}
            </div>

            {/* Modal Actions / Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <p className="text-[10px] text-slate-400 font-mono font-semibold max-w-sm truncate" title={previewDoc.fileName}>
                Filename: {previewDoc.fileName}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="px-4 py-2 text-xs font-extrabold bg-white border border-slate-350 text-slate-700 hover:text-slate-900 rounded-xl cursor-pointer hover:bg-slate-100 transition shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const doc = previewDoc;
                    setPreviewDoc(null);
                    await handleRejectDocument(doc);
                  }}
                  disabled={!!actioningDocId}
                  className="px-5 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer transition shadow-sm"
                >
                  Reject Document
                </button>
                <button
                  onClick={async () => {
                    const doc = previewDoc;
                    setPreviewDoc(null);
                    await handleApproveDocument(doc);
                  }}
                  disabled={!!actioningDocId}
                  className="px-5 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer transition shadow-sm"
                >
                  Approve Document
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Document Approval requests table view overlay */}
      {showApprovalsPage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-3xl max-w-4xl w-full flex flex-col border border-slate-200 shadow-2xl overflow-hidden max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <h3 className="font-black text-slate-900 text-base">Document Approval Requests</h3>
              </div>
              <button 
                onClick={() => setShowApprovalsPage(false)}
                className="text-slate-400 hover:text-slate-700 font-extrabold text-lg p-1.5 hover:bg-slate-200/60 rounded-xl cursor-pointer transition flex items-center justify-center"
                title="Close Approvals"
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Table View */}
            <div className="flex-1 overflow-auto p-5">
              {pendingDocs.length === 0 ? (
                <div className="text-center py-12 text-slate-450 font-bold text-sm">
                  No pending document approval requests.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">
                        <th className="px-5 py-3.5">Employee Name & Role</th>
                        <th className="px-5 py-3.5">Document Name</th>
                        <th className="px-5 py-3.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 bg-white">
                      {pendingDocs.map((doc) => {
                        const actionKey = `${doc.employeeCode}_${doc.docId}`
                        const isActioning = actioningDocId === actionKey
                        return (
                          <tr key={actionKey} className="hover:bg-slate-50/50 transition">
                            <td className="px-5 py-4">
                              <div className="font-extrabold text-slate-900 text-xs">{doc.employeeName}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{doc.employeeRole} · {doc.employeeCode}</div>
                            </td>
                            <td className="px-5 py-4 font-mono text-slate-500 font-medium">
                              <div className="font-bold text-slate-900">{doc.docName}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{doc.fileName || 'file_attachment'}</div>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  onClick={() => setPreviewDoc(doc)}
                                  className="py-1 px-3 text-[10px] font-extrabold text-slate-700 hover:text-slate-900 hover:bg-slate-200 bg-white border border-slate-350 rounded-lg cursor-pointer transition shadow-2xs"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => handleApproveDocument(doc)}
                                  disabled={!!actioningDocId}
                                  className="py-1 px-3 text-[10px] font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-lg cursor-pointer transition shadow-xs"
                                >
                                  {isActioning ? '...' : 'Approve'}
                                </button>
                                <button
                                  onClick={() => handleRejectDocument(doc)}
                                  disabled={!!actioningDocId}
                                  className="py-1 px-3 text-[10px] font-extrabold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60 rounded-lg cursor-pointer transition shadow-xs"
                                >
                                  {isActioning ? '...' : 'Reject'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Total Registered Users List view overlay */}
      {showTotalUsersPage && (
        <div className="fixed inset-0 bg-[#061A4D]/40 backdrop-blur-xs flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-3xl max-w-4xl w-full flex flex-col border border-[#DCE3EF] shadow-2xl overflow-hidden max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#DCE3EF] flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-[#123A8C]" />
                <h3 className="font-black text-[#071A45] text-base">Registered System Employees</h3>
              </div>
              <button 
                onClick={() => setShowTotalUsersPage(false)}
                className="text-slate-450 hover:text-slate-700 font-extrabold text-lg p-1.5 hover:bg-slate-200/60 rounded-xl cursor-pointer transition flex items-center justify-center"
                title="Close Users List"
              >
                ✕
              </button>
            </div>

            {/* Toggle tabs bar */}
            <div className="p-5 border-b border-slate-100 bg-white">
              <div className="flex flex-wrap gap-2">
                {['All', 'Admin', 'Sales Manager', 'Sales Executive'].map((tab) => {
                  const isActive = selectedRoleTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setSelectedRoleTab(tab)}
                      className={`px-4 py-2 text-xs font-black rounded-xl transition duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-[#061A4D] text-white shadow-md shadow-[#061A4D]/20'
                          : 'bg-slate-100 text-slate-650 hover:bg-slate-200'
                      }`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Body / Table View */}
            <div className="flex-1 overflow-auto p-5">
              {allEmployees.filter(emp => {
                if (selectedRoleTab === 'All') return true;
                const r = (emp.role || '').toLowerCase();
                if (selectedRoleTab === 'Admin') return r.includes('admin') || r.includes('administrator');
                if (selectedRoleTab === 'Sales Manager') return r.includes('manager');
                if (selectedRoleTab === 'Sales Executive') return r.includes('executive') || r.includes('sales');
                return true;
              }).length === 0 ? (
                <div className="text-center py-12 text-slate-450 font-bold text-sm">
                  No registered users match this category.
                </div>
              ) : (
                <div className="border border-[#DCE3EF] rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left border-collapse text-xs font-semibold text-[#071A45]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-[#DCE3EF] text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">
                        <th className="px-5 py-3.5">Employee Details</th>
                        <th className="px-5 py-3.5">Designation</th>
                        <th className="px-5 py-3.5">Department</th>
                        <th className="px-5 py-3.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 bg-white">
                      {allEmployees.filter(emp => {
                        if (selectedRoleTab === 'All') return true;
                        const r = (emp.role || '').toLowerCase();
                        if (selectedRoleTab === 'Admin') return r.includes('admin') || r.includes('administrator');
                        if (selectedRoleTab === 'Sales Manager') return r.includes('manager');
                        if (selectedRoleTab === 'Sales Executive') return r.includes('executive') || r.includes('sales');
                        return true;
                      }).map((emp) => {
                        const statusUpper = String(emp.status || 'Active').toUpperCase();
                        const isActive = statusUpper === 'ACTIVE';
                        return (
                          <tr key={emp.employee_id || emp.employee_code} className="hover:bg-slate-50/50 transition">
                            <td className="px-5 py-4">
                              <div className="font-extrabold text-[#071A45] text-xs">
                                {emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'System User'}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{emp.email} · {emp.employee_code || emp.employee_id}</div>
                            </td>
                            <td className="px-5 py-4 font-bold text-[#123A8C]">
                              {emp.designation || emp.role || 'Sales Executive'}
                            </td>
                            <td className="px-5 py-4 text-slate-500 font-semibold">
                              {emp.department || 'Sales & Business Development'}
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                                isActive 
                                  ? 'bg-emerald-50 text-[#168A55] border-emerald-200' 
                                  : 'bg-rose-50 text-[#DC3E3E] border-rose-200'
                              }`}>
                                {emp.status || 'Active'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Security & Operation Audits List view overlay */}
      {showSecurityAuditsPage && (
        <div className="fixed inset-0 bg-[#061A4D]/40 backdrop-blur-xs flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-3xl max-w-5xl w-full flex flex-col border border-[#DCE3EF] shadow-2xl overflow-hidden max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#DCE3EF] flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-5 h-5 text-[#123A8C]" />
                <h3 className="font-black text-[#071A45] text-base">Security & Operation Audit Logs</h3>
              </div>
              <button 
                onClick={() => setShowSecurityAuditsPage(false)}
                className="text-slate-450 hover:text-slate-700 font-extrabold text-lg p-1.5 hover:bg-slate-200/60 rounded-xl cursor-pointer transition flex items-center justify-center"
                title="Close Audit Logs"
              >
                ✕
              </button>
            </div>

            {/* Toggle tabs bar */}
            <div className="p-5 border-b border-slate-100 bg-white">
              <div className="flex flex-wrap gap-2">
                {['All', 'Authentication', 'HRMS', 'CRM & Sales', 'Others'].map((tab) => {
                  const isActive = selectedAuditModuleTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setSelectedAuditModuleTab(tab)}
                      className={`px-4 py-2 text-xs font-black rounded-xl transition duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-[#061A4D] text-white shadow-md shadow-[#061A4D]/20'
                          : 'bg-slate-100 text-slate-650 hover:bg-slate-200'
                      }`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Body / Table View */}
            <div className="flex-1 overflow-auto p-5 bg-[#F7F9FC]">
              {(() => {
                const filteredAudits = allAuditLogs.map((a, i) => ({
                  id: a.id || `audit_${i}`,
                  user: a.user_email || a.email || 'System User',
                  role: a.user_role || 'Staff',
                  action: a.action || 'System Action',
                  module: a.module || 'system',
                  time: a.created_at || new Date().toISOString(),
                  details: a.description || (typeof a.details === 'string' ? a.details : a.details?.description) || 'System operation executed'
                })).filter(a => {
                  if (selectedAuditModuleTab === 'All') return true;
                  const m = String(a.module).toUpperCase();
                  if (selectedAuditModuleTab === 'Authentication') return m === 'AUTHENTICATION' || m === 'AUTH' || m === 'LOGIN';
                  if (selectedAuditModuleTab === 'HRMS') return m === 'HRMS' || m === 'ATTENDANCE' || m === 'LEAVE';
                  if (selectedAuditModuleTab === 'CRM & Sales') return m === 'CRM' || m === 'SALES' || m === 'EXPENSE' || m === 'CUSTOMER' || m === 'VISIT' || m === 'SPATIAL';
                  if (selectedAuditModuleTab === 'Others') {
                    return !(m === 'AUTHENTICATION' || m === 'AUTH' || m === 'LOGIN' || m === 'HRMS' || m === 'ATTENDANCE' || m === 'LEAVE' || m === 'CRM' || m === 'SALES' || m === 'EXPENSE' || m === 'CUSTOMER' || m === 'VISIT' || m === 'SPATIAL');
                  }
                  return true;
                });

                if (filteredAudits.length === 0) {
                  return (
                    <div className="text-center py-12 text-slate-450 font-bold text-sm bg-white rounded-2xl border border-[#DCE3EF]">
                      No audit logs match this module filter.
                    </div>
                  );
                }

                const formatAuditDate = (isoStr) => {
                  try {
                    const d = new Date(isoStr)
                    const day = String(d.getDate()).padStart(2, '0')
                    const month = String(d.getMonth() + 1).padStart(2, '0')
                    const year = d.getFullYear()
                    const hours = String(d.getHours()).padStart(2, '0')
                    const minutes = String(d.getMinutes()).padStart(2, '0')
                    const seconds = String(d.getSeconds()).padStart(2, '0')
                    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
                  } catch {
                    return isoStr
                  }
                };

                return (
                  <div className="border border-[#DCE3EF] rounded-2xl overflow-hidden shadow-xs bg-white">
                    <table className="w-full text-left border-collapse text-xs font-semibold text-[#071A45]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-[#DCE3EF] text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">
                          <th className="px-5 py-3.5">Timestamp</th>
                          <th className="px-5 py-3.5">Actor Details</th>
                          <th className="px-5 py-3.5">Module & Action</th>
                          <th className="px-5 py-3.5">Operation Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {filteredAudits.map((act) => (
                          <tr key={act.id} className="hover:bg-slate-50/50 transition">
                            <td className="px-5 py-4 text-slate-550 font-medium whitespace-nowrap">
                              {formatAuditDate(act.time)}
                            </td>
                            <td className="px-5 py-4">
                              <div className="font-extrabold text-[#071A45] text-xs">{act.user}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{act.role}</div>
                            </td>
                            <td className="px-5 py-4 font-bold text-[#123A8C]">
                              <span className="text-[#123A8C]">{act.action}</span>
                              <div className="text-[10px] text-[#D9A441] mt-0.5 font-extrabold uppercase">{act.module}</div>
                            </td>
                            <td className="px-5 py-4 text-slate-600 font-medium leading-relaxed max-w-sm italic">
                              &ldquo;{act.details}&rdquo;
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      {/* ── ADD INCENTIVE MODAL ── */}
      {showIncentiveModal && (
        <div className="fixed inset-0 bg-[#071A45]/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[#071A45] font-black text-sm uppercase tracking-wider flex items-center gap-2">
                💰 Configure Sales Incentive
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowIncentiveModal(false)
                  setSelectedIncentiveEmp(null)
                  setIncentivePctInput(5)
                }}
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black text-[#071A45] uppercase tracking-wider mb-1">
                  Select Sales Executive
                </label>
                <select
                  value={selectedIncentiveEmp ? selectedIncentiveEmp.id : ""}
                  onChange={(e) => {
                    const emp = allEmployees.find(u => u.id === e.target.value)
                    setSelectedIncentiveEmp(emp)
                    if (emp) {
                      setIncentivePctInput(emp.incentive_percentage !== undefined ? emp.incentive_percentage : 5.0)
                    }
                  }}
                  className="w-full h-10 px-3 border border-slate-250 rounded-xl bg-slate-50/50 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-rose-550 focus:border-rose-550 cursor-pointer"
                >
                  <option value="">-- Choose Employee --</option>
                  {allEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employee_code || "N/A"} - {emp.name} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>

              {selectedIncentiveEmp && (
                <div className="p-3 bg-rose-50/30 border border-rose-100 rounded-xl text-[11px] text-rose-950 font-bold">
                  Current Incentive Rate: <span className="text-rose-800 font-extrabold">{selectedIncentiveEmp.incentive_percentage !== undefined ? selectedIncentiveEmp.incentive_percentage : 5.0}%</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-[#071A45] uppercase tracking-wider mb-1">
                  New Incentive Percentage (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={incentivePctInput}
                    onChange={(e) => setIncentivePctInput(e.target.value)}
                    className="w-full h-10 pl-3 pr-10 border border-slate-250 rounded-xl bg-slate-50/50 font-black text-sm focus:outline-none"
                    placeholder="5.0"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                    %
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowIncentiveModal(false)
                  setSelectedIncentiveEmp(null)
                  setIncentivePctInput(5)
                }}
                className="px-4 h-9 border border-slate-200 rounded-xl text-slate-600 font-extrabold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedIncentiveEmp || incentiveSaving}
                onClick={async () => {
                  if (!selectedIncentiveEmp) return
                  setIncentiveSaving(true)
                  try {
                    const empCode = selectedIncentiveEmp.id || selectedIncentiveEmp.employee_id
                    await hrmsAPI.updateEmployee(empCode, { incentive_percentage: Number(incentivePctInput) })
                    showToast(`Successfully updated incentive for ${selectedIncentiveEmp.name} to ${incentivePctInput}%`, "success")
                    setShowIncentiveModal(false)
                    setSelectedIncentiveEmp(null)
                    setIncentivePctInput(5)
                    loadAdminDashboardData() // reload list to show updated rate
                  } catch (err) {
                    showToast("Failed to update incentive: " + (err.message || err), "error")
                  } finally {
                    setIncentiveSaving(false)
                  }
                }}
                className="px-4 h-9 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {incentiveSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
