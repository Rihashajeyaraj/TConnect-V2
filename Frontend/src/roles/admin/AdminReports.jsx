import React, { useState, useEffect, useMemo, useCallback } from 'react'
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
  UserX,
  Search,
  Filter,
  Eye,
  X,
  ChevronDown
} from 'lucide-react'
import { userAPI, auditAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'
import { formatDateTime } from '../../utils/dateUtils.js'

function AdminReports() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [employees, setEmployees] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab && ['system', 'employees', 'security'].includes(tab)) {
      return tab
    }
    return 'system'
  })

  // Filter state for Audit Logs
  const [filters, setFilters] = useState({
    user_email: '', role: '', action: '', entity_type: '', from_date: '', to_date: '',
  })
  const [activeFilters, setActiveFilters] = useState({})
  const [showFilters, setShowFilters] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)

  const loadReportData = useCallback(async (appliedFilters = {}) => {
    setLoading(true)
    try {
      const [usersRes, auditRes] = await Promise.all([
        userAPI.getUsers(),
        auditAPI.getLogs({ limit: 200, ...appliedFilters })
      ])

      if (usersRes && usersRes.data) {
        setEmployees(usersRes.data)
      }
      if (auditRes && auditRes.data) {
        setAuditLogs(Array.isArray(auditRes.data) ? auditRes.data : [])
      } else {
        setAuditLogs([])
      }
    } catch (err) {
      showToast('Error fetching system administration logs and report data', 'error')
      setAuditLogs([])
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadReportData({})
  }, [loadReportData])

  const applyFilters = () => {
    const active = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    setActiveFilters(active)
    loadReportData(active)
  }

  const resetFilters = () => {
    const empty = { user_email: '', role: '', action: '', entity_type: '', from_date: '', to_date: '' }
    setFilters(empty)
    setActiveFilters({})
    loadReportData({})
  }

  const activeFilterCount = Object.keys(activeFilters).length

  // Computed employee/user metrics
  const stats = useMemo(() => {
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
  const auditStats = useMemo(() => {
    const totalLogs = auditLogs.length
    const logTypes = {}
    auditLogs.forEach((log) => {
      const type = log.action || 'INFO'
      logTypes[type] = (logTypes[type] || 0) + 1
    })

    return { totalLogs, logTypes }
  }, [auditLogs])

  const roles = useMemo(() => [...new Set(auditLogs.map(l => l.role).filter(Boolean))], [auditLogs])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="min-w-0">
          <h1 className="text-base sm:text-xl font-extrabold text-slate-900 tracking-tight">Reports &amp; Security Audit Logs</h1>
          <p className="text-xs text-slate-500 mt-1">Audit administrative operations, analyze role permissions, and view system metrics.</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'security' && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-4 py-2 border rounded-xl text-xs font-bold transition cursor-pointer ${
                activeFilterCount > 0
                  ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" /> Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
              <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          )}
          <button
            onClick={() => loadReportData(activeFilters)}
            disabled={loading}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer bg-white"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} /> Refresh Data
          </button>
        </div>
      </div>

      {loading && auditLogs.length === 0 ? (
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
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Managers &amp; Execs</span>
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
                activeTab === 'system' ? 'text-blue-600 font-extrabold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              System Performance
              {activeTab === 'system' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
            </button>
            <button
              onClick={() => setActiveTab('employees')}
              className={`pb-3 text-xs font-bold transition cursor-pointer relative ${
                activeTab === 'employees' ? 'text-blue-600 font-extrabold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Employee Matrix
              {activeTab === 'employees' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`pb-3 text-xs font-bold transition cursor-pointer relative ${
                activeTab === 'security' ? 'text-blue-600 font-extrabold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Security Audit Trails
              {activeTab === 'security' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
            </button>
          </div>

          {/* Tab content */}
          {activeTab === 'security' && showFilters && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs font-semibold text-slate-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1 font-bold">User Email</label>
                  <input
                    type="text"
                    placeholder="e.g. admin@example.com"
                    value={filters.user_email}
                    onChange={e => setFilters(f => ({ ...f, user_email: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-bold">Role</label>
                  <select
                    value={filters.role}
                    onChange={e => setFilters(f => ({ ...f, role: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-slate-950 focus:outline-none focus:border-blue-600 font-bold"
                  >
                    <option value="">All Roles</option>
                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                    <option value="Super Admin">Super Admin</option>
                    <option value="Admin">Admin</option>
                    <option value="CEO / Founder">CEO / Founder</option>
                    <option value="Sales Manager">Sales Manager</option>
                    <option value="Sales Executive">Sales Executive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-bold">Module (entity_type)</label>
                  <input
                    type="text"
                    placeholder="e.g. crm.leads"
                    value={filters.entity_type}
                    onChange={e => setFilters(f => ({ ...f, entity_type: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-bold">Action</label>
                  <input
                    type="text"
                    placeholder="e.g. LEAD_CREATED"
                    value={filters.action}
                    onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-bold">From Date</label>
                  <input
                    type="date"
                    value={filters.from_date}
                    onChange={e => setFilters(f => ({ ...f, from_date: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-bold">To Date</label>
                  <input
                    type="date"
                    value={filters.to_date}
                    onChange={e => setFilters(f => ({ ...f, to_date: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 font-bold"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={applyFilters}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  Apply Filters
                </button>
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {activeTab === 'system' && (
              <div className="p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Database configuration summary */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">Connection Cache Configuration</h3>
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden text-xs font-bold">
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
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden text-xs font-bold">
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
                <table className="w-full min-w-[800px] border-collapse text-left whitespace-nowrap">
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
                  <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                    {employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-mono font-bold text-slate-500">{emp.employee_code || '—'}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">{emp.name}</td>
                        <td className="px-6 py-4 text-slate-600 font-semibold">{emp.email}</td>
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
                <table className="w-full min-w-[800px] border-collapse text-left whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-500">Timestamp</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-500">Performed By</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-500">Role</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-500">Action / Event</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-500">Target Table</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-500">Description</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-500 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-10 text-slate-400">No security audit logs found.</td>
                      </tr>
                    ) : (
                      auditLogs.map((log, idx) => (
                        <tr key={log.id || idx} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 text-slate-500 font-mono whitespace-nowrap">
                            {formatDateTime(log.created_at) || 'Recently'}
                          </td>
                          <td className="px-6 py-4 text-slate-800 font-bold">{log.user_email || 'System'}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 whitespace-nowrap">
                              {log.role || '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md font-mono font-bold text-[10px] text-slate-700">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-500 font-mono">{log.table_name || log.entity_type || '—'}</td>
                          <td className="px-6 py-4 text-slate-600 font-medium">{log.description || '—'}</td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 hover:text-blue-600 text-slate-500 transition cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" /> Audit Event Detail
              </h3>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-slate-400 font-black text-[9px] uppercase tracking-wider mb-1">ACTION</p>
                <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md font-mono font-bold text-[10px] text-slate-700">
                  {selectedLog.action}
                </span>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-slate-400 font-black text-[9px] uppercase tracking-wider mb-1">MODULE</p>
                <span className="text-slate-800">{selectedLog.module || selectedLog.entity_type}</span>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-slate-400 font-black text-[9px] uppercase tracking-wider mb-1">PERFORMED BY</p>
                <p className="text-slate-900">{selectedLog.user_email}</p>
                {selectedLog.role && <p className="text-slate-400 text-[10px]">{selectedLog.role}</p>}
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-slate-400 font-black text-[9px] uppercase tracking-wider mb-1">TIMESTAMP</p>
                <p className="text-slate-900 font-mono">{formatDateTime(selectedLog.created_at) || '—'}</p>
              </div>
              {selectedLog.description && (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 col-span-2">
                  <p className="text-slate-400 font-black text-[9px] uppercase tracking-wider mb-1">DESCRIPTION</p>
                  <p className="text-slate-700">{selectedLog.description}</p>
                </div>
              )}
            </div>

            {/* Before / After */}
            {(selectedLog.details?.previous_value !== undefined || selectedLog.details?.new_value !== undefined) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-rose-50/50 border border-rose-200/60 rounded-xl p-3">
                  <p className="text-rose-700 text-xs font-black mb-2 uppercase tracking-wider">⬅ PREVIOUS VALUE</p>
                  <pre className="text-xs text-rose-800 font-mono whitespace-pre-wrap break-words">
                    {JSON.stringify(selectedLog.details?.previous_value ?? '—', null, 2)}
                  </pre>
                </div>
                <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-xl p-3">
                  <p className="text-emerald-700 text-xs font-black mb-2 uppercase tracking-wider">➡ NEW VALUE</p>
                  <pre className="text-xs text-emerald-800 font-mono whitespace-pre-wrap break-words">
                    {JSON.stringify(selectedLog.details?.new_value ?? '—', null, 2)}
                  </pre>
                </div>
              </div>
            )}

            <div>
              <p className="text-slate-400 text-xs font-black uppercase tracking-wider mb-2">FULL AUDIT PAYLOAD</p>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 overflow-x-auto max-h-48">
                <pre>{JSON.stringify(selectedLog.details, null, 2)}</pre>
              </div>
            </div>

            <div className="text-right">
              <button onClick={() => setSelectedLog(null)} className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminReports
