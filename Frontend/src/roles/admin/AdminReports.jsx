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
  ChevronDown,
  Building,
  Briefcase,
  ChevronRight,
  User,
  MapPin,
  Navigation,
  Image,
  Key,
  ArrowLeft,
  CheckCircle2,
  Globe
} from 'lucide-react'
import { userAPI, auditAPI, crmAPI, visitAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'
import { formatDateTime } from '../../utils/dateUtils.js'

function AdminReports() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab && ['system', 'employees', 'security'].includes(tab)) {
      return tab
    }
    return 'security'
  })

  // Drill-down Audit Flow States:
  const [auditViewStep, setAuditViewStep] = useState('department') // 'department' | 'role' | 'employee' | 'timeline'
  const [selectedDepartment, setSelectedDepartment] = useState(null)
  const [selectedRole, setSelectedRole] = useState(null)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('')
  const [auditCategoryFilter, setAuditCategoryFilter] = useState('ALL')

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

  const getUserPhoto = useCallback((user) => {
    if (!user) return null
    return user.photo_url || user.profile_image || user.avatar_url || user.photo || null
  }, [])

  // 1. Real Dynamic Departments List
  const realDepartments = useMemo(() => {
    const depts = new Set()
    employees.forEach((e) => {
      const d = (e.department || e.dept || '').trim()
      if (d) depts.add(d)
    })
    if (depts.size === 0) {
      return ['Sales & Business Development', 'HR & Administration', 'Operations & IT', 'Management & Leadership']
    }
    return Array.from(depts)
  }, [employees])

  // 2. Roles in Selected Department
  const rolesForDept = useMemo(() => {
    let filteredEmps = employees
    if (selectedDepartment && selectedDepartment !== 'ALL') {
      filteredEmps = employees.filter((e) => {
        const d = (e.department || e.dept || '').toLowerCase().trim()
        return d.includes(selectedDepartment.toLowerCase().trim()) || selectedDepartment.toLowerCase().trim().includes(d)
      })
    }
    const rSet = new Set(filteredEmps.map((e) => e.role).filter(Boolean))
    return Array.from(rSet)
  }, [employees, selectedDepartment])

  // 3. Filtered & Alphabetically Sorted Employees List (A-Z)
  const filteredDepartmentEmployees = useMemo(() => {
    let list = employees.filter((e) => {
      const d = (e.department || e.dept || '').toLowerCase().trim()
      const matchesDept = !selectedDepartment || selectedDepartment === 'ALL' || d.includes(selectedDepartment.toLowerCase().trim()) || selectedDepartment.toLowerCase().trim().includes(d)
      const matchesRole = !selectedRole || selectedRole === 'ALL' || e.role === selectedRole
      const matchesSearch = !employeeSearchQuery || e.name.toLowerCase().includes(employeeSearchQuery.toLowerCase()) || e.email.toLowerCase().includes(employeeSearchQuery.toLowerCase())
      return matchesDept && matchesRole && matchesSearch
    })
    // Strictly sort alphabetically A-Z by employee name
    return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [employees, selectedDepartment, selectedRole, employeeSearchQuery])

  // 4. Chronological Audit Timeline for Selected Employee
  const employeeTimelineLogs = useMemo(() => {
    if (!selectedEmployee) return []
    const empEmail = (selectedEmployee.email || '').toLowerCase().trim()
    const empName = (selectedEmployee.name || '').toLowerCase().trim()
    const empId = String(selectedEmployee.id || '').toLowerCase()

    let logs = auditLogs.filter((log) => {
      const lEmail = String(log.user_email || log.email || '').toLowerCase().trim()
      const lUser = String(log.performed_by || log.user_name || '').toLowerCase().trim()
      const lId = String(log.user_id || '').toLowerCase()
      return (empEmail && lEmail === empEmail) || (lId && lId === empId) || (empName && lUser.includes(empName))
    })

    if (auditCategoryFilter !== 'ALL') {
      logs = logs.filter((l) => {
        const cat = l.category || (
          l.action.includes('PAGE') ? 'PAGES' :
          l.action.includes('LEAD') || l.action.includes('DEAL') ? 'LEADS' :
          l.action.includes('VISIT') ? 'VISITS' :
          l.action.includes('TRACKING') || l.action.includes('LOCATION') ? 'TRACKING' :
          l.action.includes('PROFILE') || l.action.includes('PHOTO') || l.action.includes('FACE') ? 'PROFILE' :
          'SECURITY'
        )
        return cat === auditCategoryFilter
      })
    }

    return logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }, [auditLogs, selectedEmployee, auditCategoryFilter])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Reports &amp; Security Audit Logs</h1>
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
                        <span className="font-mono font-bold text-slate-800">Supabase Realtime Engine</span>
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
              <div className="p-6 space-y-6">
                {/* Navigation Breadcrumb Bar */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setAuditViewStep('department')
                        setSelectedDepartment(null)
                        setSelectedRole(null)
                        setSelectedEmployee(null)
                      }}
                      className={`hover:text-blue-600 cursor-pointer ${auditViewStep === 'department' ? 'text-blue-700 font-extrabold' : ''}`}
                    >
                      🏢 Departments
                    </button>

                    {selectedDepartment && (
                      <>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        <button
                          type="button"
                          onClick={() => {
                            setAuditViewStep('role')
                            setSelectedRole(null)
                            setSelectedEmployee(null)
                          }}
                          className={`hover:text-blue-600 cursor-pointer ${auditViewStep === 'role' ? 'text-blue-700 font-extrabold' : ''}`}
                        >
                          📁 {selectedDepartment}
                        </button>
                      </>
                    )}

                    {selectedRole && (
                      <>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        <button
                          type="button"
                          onClick={() => {
                            setAuditViewStep('employee')
                            setSelectedEmployee(null)
                          }}
                          className={`hover:text-blue-600 cursor-pointer ${auditViewStep === 'employee' ? 'text-blue-700 font-extrabold' : ''}`}
                        >
                          👔 {selectedRole}
                        </button>
                      </>
                    )}

                    {selectedEmployee && (
                      <>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-blue-700 font-extrabold flex items-center gap-1">
                          👤 {selectedEmployee.name} (Audit Details Timeline)
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {auditViewStep !== 'department' && (
                      <button
                        type="button"
                        onClick={() => {
                          if (auditViewStep === 'timeline') setAuditViewStep('employee')
                          else if (auditViewStep === 'employee') setAuditViewStep('role')
                          else if (auditViewStep === 'role') setAuditViewStep('department')
                        }}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowFilters(!showFilters)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-bold transition cursor-pointer ${
                        activeFilterCount > 0
                          ? 'bg-blue-600 border-blue-500 text-white shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Filter className="w-3.5 h-3.5" /> Global Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                    </button>
                  </div>
                </div>

                {/* STEP 1: DEPARTMENT CARDS */}
                {auditViewStep === 'department' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                        <Building className="w-4 h-4 text-blue-600" /> Select Department for Audit Records
                      </h3>
                      <span className="text-xs text-slate-500 font-semibold">{realDepartments.length} Departments Registered</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {realDepartments.map((deptName) => {
                        const count = employees.filter((e) => {
                          const d = (e.department || e.dept || '').toLowerCase().trim()
                          return d.includes(deptName.toLowerCase().trim()) || deptName.toLowerCase().trim().includes(d)
                        }).length
                        const deptRoles = Array.from(new Set(employees.filter(e => {
                          const d = (e.department || e.dept || '').toLowerCase().trim()
                          return d.includes(deptName.toLowerCase().trim()) || deptName.toLowerCase().trim().includes(d)
                        }).map(e => e.role).filter(Boolean)))

                        return (
                          <button
                            key={deptName}
                            type="button"
                            onClick={() => {
                              setSelectedDepartment(deptName)
                              setAuditViewStep('role')
                            }}
                            className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all text-left flex flex-col justify-between cursor-pointer group shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 group-hover:scale-105 transition-transform">
                                <Briefcase className="w-5 h-5" />
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                {count} {count === 1 ? 'Employee' : 'Employees'}
                              </span>
                            </div>
                            <div className="mt-4">
                              <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">{deptName}</h4>
                              <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">
                                {deptRoles.length} Roles: {deptRoles.slice(0, 2).join(', ')}{deptRoles.length > 2 ? '...' : ''}
                              </p>
                              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-blue-600">
                                <span>View Roles & Employees</span>
                                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* STEP 2: ROLE CARDS */}
                {auditViewStep === 'role' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-blue-600" /> Select Role in {selectedDepartment}
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRole('ALL')
                          setAuditViewStep('employee')
                        }}
                        className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        View All Employees in Department ➔
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {rolesForDept.map((roleName) => {
                        const count = employees.filter((e) => {
                          const d = (e.department || e.dept || '').toLowerCase().trim()
                          const matchesDept = !selectedDepartment || selectedDepartment === 'ALL' || d.includes(selectedDepartment.toLowerCase().trim()) || selectedDepartment.toLowerCase().trim().includes(d)
                          return matchesDept && e.role === roleName
                        }).length

                        return (
                          <button
                            key={roleName}
                            type="button"
                            onClick={() => {
                              setSelectedRole(roleName)
                              setAuditViewStep('employee')
                            }}
                            className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all text-left flex flex-col justify-between cursor-pointer group shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:scale-105 transition-transform">
                                <UserCheck className="w-5 h-5" />
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {count} {count === 1 ? 'Person' : 'People'}
                              </span>
                            </div>
                            <div className="mt-4">
                              <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">{roleName}</h4>
                              <p className="text-[11px] text-slate-500 font-medium mt-1">Audit security logs for all {roleName}s</p>
                              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-indigo-600">
                                <span>Select Role</span>
                                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* STEP 3: EMPLOYEE LIST IN ALPHABETICAL ORDER (A-Z) */}
                {auditViewStep === 'employee' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-600" /> Employees List (Alphabetical Order A-Z)
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                          Department: {selectedDepartment || 'All'} • Role: {selectedRole || 'All'}
                        </p>
                      </div>

                      <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search employee name or email..."
                          value={employeeSearchQuery}
                          onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                        />
                      </div>
                    </div>

                    {filteredDepartmentEmployees.length === 0 ? (
                      <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 font-semibold">
                        No employees found in selected Department & Role.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {filteredDepartmentEmployees.map((emp) => {
                          const empLogsCount = auditLogs.filter(l => l.user_email === emp.email || (l.performed_by || '').toLowerCase() === (emp.name || '').toLowerCase()).length
                          const initials = (emp.name || 'E').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

                          return (
                            <div
                              key={emp.id}
                              onClick={() => {
                                setSelectedEmployee(emp)
                                setAuditViewStep('timeline')
                              }}
                              className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                            >
                              <div className="flex items-start gap-3">
                                <div className="relative w-11 h-11 shrink-0">
                                  {getUserPhoto(emp) && (
                                    <img
                                      src={getUserPhoto(emp)}
                                      alt={emp.name}
                                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                                      className="w-11 h-11 rounded-xl object-cover border border-slate-200 shadow-2xs absolute inset-0 z-10"
                                    />
                                  )}
                                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-xs flex items-center justify-center border border-white shadow-2xs">
                                    {initials}
                                  </div>
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
                                      {emp.role}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${emp.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                                      {emp.status || 'Active'}
                                    </span>
                                  </div>
                                  <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-blue-600 transition-colors mt-1 truncate">{emp.name}</h4>
                                  <p className="text-[11px] text-slate-500 font-medium truncate">{emp.email}</p>
                                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">{emp.employee_code || emp.employee_id || 'ID'}</p>
                                </div>
                              </div>

                              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                                <span className="text-[11px] font-semibold text-slate-500">
                                  {empLogsCount > 0 ? `${empLogsCount} Audit Logs` : 'Active Log Trail'}
                                </span>
                                <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                  View All Audit Details ➔
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 4: COMPREHENSIVE INDIVIDUAL AUDIT TIMELINE WITH DATE & TIME */}
                {auditViewStep === 'timeline' && selectedEmployee && (
                  <div className="space-y-6">
                    {/* Selected Employee Summary Card Header */}
                    <div className="bg-gradient-to-r from-slate-900 via-[#071A45] to-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-5">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="relative w-14 h-14 shrink-0">
                          {getUserPhoto(selectedEmployee) && (
                            <img
                              src={getUserPhoto(selectedEmployee)}
                              alt={selectedEmployee.name}
                              onError={(e) => { e.currentTarget.style.display = 'none' }}
                              className="w-14 h-14 rounded-2xl object-cover border-2 border-white/20 shadow-md absolute inset-0 z-10"
                            />
                          )}
                          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-black text-lg flex items-center justify-center border-2 border-white/20 shadow-md">
                            {(selectedEmployee.name || 'E').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/30">
                              {selectedEmployee.role}
                            </span>
                            <span className="text-[10px] font-mono text-slate-300">
                              ({selectedEmployee.employee_code || selectedEmployee.employee_id || 'ID'})
                            </span>
                          </div>
                          <h3 className="font-extrabold text-xl text-white tracking-tight mt-1">{selectedEmployee.name}</h3>
                          <p className="text-xs text-slate-300 font-medium">{selectedEmployee.email} • {selectedEmployee.department || selectedEmployee.dept || 'Sales'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          type="button"
                          onClick={() => setAuditViewStep('employee')}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition cursor-pointer border border-white/10"
                        >
                          Select Another Employee
                        </button>
                      </div>
                    </div>

                    {/* Category Filter Tabs */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                        {[
                          { id: 'ALL', label: 'All Audit Activities', icon: Activity },
                          { id: 'PAGES', label: 'Page Views & Clicks', icon: Globe },
                          { id: 'LEADS', label: 'CRM & Lead Creations', icon: Briefcase },
                          { id: 'VISITS', label: 'Client Visits', icon: MapPin },
                          { id: 'TRACKING', label: 'Live GPS Tracking', icon: Navigation },
                          { id: 'PROFILE', label: 'Profile & Photos', icon: Image },
                          { id: 'SECURITY', label: 'Logins & Security', icon: Key },
                        ].map(cat => {
                          const IconComp = cat.icon
                          const isSel = auditCategoryFilter === cat.id
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setAuditCategoryFilter(cat.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                                isSel
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                              }`}
                            >
                              <IconComp className="w-3.5 h-3.5" />
                              <span>{cat.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Comprehensive Chronological Timeline */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" /> Chronological Audit Activity Trail (With Date & Time)
                        </h4>
                        <span className="text-xs text-slate-500 font-bold">{employeeTimelineLogs.length} Events Logged</span>
                      </div>

                      {employeeTimelineLogs.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 font-semibold bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                          No audit logs recorded for {selectedEmployee.name} matching the selected category.
                        </div>
                      ) : (
                        <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                          {employeeTimelineLogs.map((log, idx) => (
                            <div key={log.id || idx} className="relative flex items-start gap-4 group">
                              <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center ring-4 ring-white shadow-2xs">
                                <Activity className="w-3 h-3" />
                              </div>

                              <div className="flex-1 bg-slate-50 hover:bg-blue-50/40 p-4 rounded-2xl border border-slate-200/80 transition shadow-2xs">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2 mb-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                                      {log.category || log.action || 'ACTIVITY'}
                                    </span>
                                    <span className="font-mono text-xs font-extrabold text-slate-800">
                                      {log.action}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                                    <span>{formatDateTime(log.created_at) || 'Recently'}</span>
                                  </div>
                                </div>

                                <p className="text-xs font-bold text-slate-800 leading-relaxed">{log.description}</p>

                                <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                                  <span>Target Entity: <code className="font-mono text-slate-700">{log.entity_type || log.table_name || 'system'}</code></span>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedLog(log)}
                                    className="text-blue-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Eye className="w-3 h-3" /> View Audit Payload Details
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
