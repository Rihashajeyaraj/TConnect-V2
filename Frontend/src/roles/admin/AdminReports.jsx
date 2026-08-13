import React, { useState, useEffect } from 'react'
import {
  FileText,
  Users,
  ShieldCheck,
  CalendarCheck,
  Activity,
  AlertTriangle,
  RefreshCw,
  Clock,
  UserCheck,
  UserX
} from 'lucide-react'
import { userAPI, auditAPI, hrmsAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'

function AdminReports() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [activeTab, setActiveTab] = useState('system') // 'system', 'employees', 'security'

  const loadReportData = async () => {
    setLoading(true)
    try {
      const [usersRes, auditRes] = await Promise.all([
        userAPI.getUsers(),
        auditAPI.getLogs({ limit: 50 })
      ])

      if (usersRes && usersRes.data) {
        setEmployees(usersRes.data)
      }
      if (auditRes && auditRes.data) {
        setAuditLogs(auditRes.data)
      }
    } catch (err) {
      showToast('Error fetching system administration logs and report data', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReportData()
  }, [])

  // Computed employee/user metrics
  const stats = React.useMemo(() => {
    const total = employees.length
    const active = employees.filter((e) => (e.status || '').toLowerCase() === 'active').length
    const inactive = total - active

    const managers = employees.filter((e) => {
      const r = (e.role || '').toLowerCase()
      return r.includes('manager')
    }).length

    const executives = employees.filter((e) => {
      const r = (e.role || '').toLowerCase()
      return r.includes('executive')
    }).length

    const unassigned = employees.filter((e) => {
      const r = (e.role || '').toLowerCase()
      const isExec = r.includes('executive')
      return isExec && !e.reporting_manager_id && !e.reporting_manager_name
    }).length

    return { total, active, inactive, managers, executives, unassigned }
  }, [employees])

  // Computed audit logs statistics
  const auditStats = React.useMemo(() => {
    const totalLogs = auditLogs.length
    const logTypes = {}
    auditLogs.forEach((log) => {
      const type = log.action || 'INFO'
      logTypes[type] = (logTypes[type] || 0) + 1
    })

    return { totalLogs, logTypes }
  }, [auditLogs])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Reports & Analytics</h1>
          <p className="text-xs text-slate-500 mt-1">Audit administrative operations, analyze role permissions, and view system metrics.</p>
        </div>
        <button
          onClick={loadReportData}
          disabled={loading}
          className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer bg-white"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} /> Refresh Data
        </button>
      </div>

      {loading ? (
        <div className="py-24 text-center text-xs text-slate-500 font-bold bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          Compiling system configuration and audit report data...
        </div>
      ) : (
        <>
          {/* KPI Dashboard cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Employees</span>
                <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-slate-900 mt-2">{stats.total}</p>
              <div className="flex items-center gap-1.5 mt-2.5 text-[10px] font-bold text-slate-500">
                <span className="text-emerald-600 flex items-center gap-0.5"><UserCheck className="size-3" /> {stats.active} Active</span>
                <span>•</span>
                <span className="text-rose-500 flex items-center gap-0.5"><UserX className="size-3" /> {stats.inactive} Inactive</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Managers & Execs</span>
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <ShieldCheck className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-slate-900 mt-2">
                {stats.managers} <span className="text-xs font-bold text-slate-400">/</span> {stats.executives}
              </p>
              <p className="text-[10px] font-bold text-slate-400 mt-3.5 uppercase tracking-wider">Manager-Subordinate ratio</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Unassigned Execs</span>
                <span className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-slate-900 mt-2">{stats.unassigned}</p>
              <p className="text-[10px] font-bold text-amber-600 mt-3.5 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="size-3 shrink-0" /> Requires Manager Assignment
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Security Audit Logs</span>
                <span className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                  <Activity className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-slate-900 mt-2">{auditStats.totalLogs}</p>
              <p className="text-[10px] font-bold text-slate-400 mt-3.5 uppercase tracking-wider">Total operations registered</p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex border-b border-slate-200 gap-6">
            <button
              onClick={() => setActiveTab('system')}
              className={`pb-3 text-xs font-bold transition cursor-pointer relative ${
                activeTab === 'system' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              System Performance
              {activeTab === 'system' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
            </button>
            <button
              onClick={() => setActiveTab('employees')}
              className={`pb-3 text-xs font-bold transition cursor-pointer relative ${
                activeTab === 'employees' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Employee Matrix
              {activeTab === 'employees' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`pb-3 text-xs font-bold transition cursor-pointer relative ${
                activeTab === 'security' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Recent Audit Activity
              {activeTab === 'security' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
            </button>
          </div>

          {/* Tab content */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {activeTab === 'system' && (
              <div className="p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Database configuration summary */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">Connection Cache Configuration</h3>
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden text-xs">
                      <div className="p-3.5 flex justify-between bg-slate-50/50">
                        <span className="text-slate-500">Database Connection Host</span>
                        <span className="font-mono font-bold text-slate-800">db.cljifufjjwrdgethvfvl.supabase.co</span>
                      </div>
                      <div className="p-3.5 flex justify-between">
                        <span className="text-slate-500">PostgREST Service Layer</span>
                        <span className="font-mono font-bold text-slate-800">Active</span>
                      </div>
                      <div className="p-3.5 flex justify-between bg-slate-50/50">
                        <span className="text-slate-500">Active Database Schemas</span>
                        <span className="font-mono font-bold text-slate-800">hrms, organization, system, crm</span>
                      </div>
                      <div className="p-3.5 flex justify-between">
                        <span className="text-slate-500">Cache Cache Invalidation</span>
                        <span className="font-mono font-bold text-slate-800">Auto (On Schema Update)</span>
                      </div>
                    </div>
                  </div>

                  {/* Operation Actions summary */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">Audit Log Category Frequency</h3>
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden text-xs">
                      {Object.keys(auditStats.logTypes).length === 0 ? (
                        <div className="p-4 text-center text-slate-400 font-bold">No activity logs recorded.</div>
                      ) : (
                        Object.entries(auditStats.logTypes).map(([type, count]) => (
                          <div key={type} className="p-3.5 flex justify-between items-center">
                            <span className="font-mono font-bold text-slate-700">{type}</span>
                            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-md font-black">{count} logs</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'employees' && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-500">Code</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-500">Name</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-500">Email</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-500">Role</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-500">Reporting Manager</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-mono font-bold text-slate-500">{emp.employee_code || '—'}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">{emp.name}</td>
                        <td className="px-6 py-4 text-slate-600">{emp.email}</td>
                        <td className="px-6 py-4 font-bold text-slate-700">{emp.role}</td>
                        <td className="px-6 py-4 text-slate-600">
                          {emp.reporting_manager_name ? (
                            <span className="font-bold text-slate-800">{emp.reporting_manager_name}</span>
                          ) : (
                            <span className="text-amber-600 font-bold">Unassigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase border ${
                            emp.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-100'
                          }`}>
                            {emp.status || 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-500">Timestamp</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-500">User Email</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-500">Action / Event</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-500">Target Table</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-500">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                          {log.created_at ? new Date(log.created_at).toLocaleString('en-IN') : 'Recently'}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800">{log.user_email || 'System'}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md font-mono font-bold text-[10px] text-slate-700">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-mono">{log.table_name || '—'}</td>
                        <td className="px-6 py-4 text-slate-600 font-medium">{log.description || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default AdminReports
