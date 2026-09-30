import React, { useState, useEffect, useCallback } from 'react'
import { X, ShieldCheck, RotateCcw, Save, Check, Lock, Info, Sparkles, Sliders } from 'lucide-react'
import { userAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'
import { usePermissions } from '../../context/PermissionContext.jsx'

const PERMISSION_CATEGORIES = [
  {
    name: 'CRM & Customer Management',
    module: 'crm',
    icon: '📊',
    keys: [
      { key: 'crm.leads.view', label: 'View Leads', desc: 'Access and search lead records' },
      { key: 'crm.leads.create', label: 'Create Leads', desc: 'Add new lead entries' },
      { key: 'crm.leads.edit', label: 'Edit Leads', desc: 'Update lead details & stages' },
      { key: 'crm.leads.delete', label: 'Delete Leads', desc: 'Remove lead records' },
      { key: 'crm.leads.assign', label: 'Assign / Reassign Leads', desc: 'Change lead owners' },
      { key: 'crm.leads.export', label: 'Export Leads', desc: 'Export lead data to files' },
      { key: 'crm.customers.view', label: 'View Clients / Customers', desc: 'Access client accounts' },
      { key: 'crm.customers.create', label: 'Create Clients', desc: 'Add new client accounts' },
      { key: 'crm.customers.edit', label: 'Edit Clients', desc: 'Update client details' },
      { key: 'crm.customers.delete', label: 'Delete Clients', desc: 'Remove client accounts' },
      { key: 'crm.customers.convert', label: 'Convert Lead to Client', desc: 'Perform lead conversion' },
    ]
  },
  {
    name: 'HRMS & Employee Management',
    module: 'hrms',
    icon: '👥',
    keys: [
      { key: 'hrms.employees.view', label: 'View Employees', desc: 'View employee directory' },
      { key: 'hrms.employees.create', label: 'Add Employee', desc: 'Create new employee profiles' },
      { key: 'hrms.employees.edit', label: 'Edit Employee', desc: 'Modify profile & team assignments' },
      { key: 'hrms.employees.status', label: 'Status & Deactivation', desc: 'Activate/deactivate employee accounts' },
      { key: 'hrms.employees.reporting', label: 'Reporting Structure', desc: 'Assign reporting manager' },
      { key: 'hrms.attendance.mark', label: 'Mark Attendance', desc: 'Clock-in / Clock-out & face verification' },
      { key: 'hrms.attendance.view_own', label: 'View Own Attendance', desc: 'Access own attendance logs' },
      { key: 'hrms.attendance.view_team', label: 'View Team Attendance', desc: 'Access direct team logs' },
      { key: 'hrms.attendance.view_all', label: 'View All Attendance', desc: 'Access organization-wide attendance' },
      { key: 'hrms.attendance.approve', label: 'Approve Attendance', desc: 'Approve manual/overtime attendance' },
      { key: 'hrms.leaves.view', label: 'View Leaves', desc: 'Access leave request records' },
      { key: 'hrms.leaves.apply', label: 'Apply Leave', desc: 'Submit personal leave applications' },
      { key: 'hrms.leaves.cancel', label: 'Cancel Leave', desc: 'Cancel applied leave requests' },
      { key: 'hrms.leaves.approve_team', label: 'Approve Team Leaves', desc: 'Review & approve direct team leaves' },
      { key: 'hrms.leaves.approve_all', label: 'Approve All Leaves', desc: 'Approve organization-wide leave requests' },
    ]
  },
  {
    name: 'Field Visits & Client Log',
    module: 'visit',
    icon: '📍',
    keys: [
      { key: 'visit.visits.view', label: 'View Visits', desc: 'Access scheduled & logged visits' },
      { key: 'visit.visits.create', label: 'Create / Schedule Visit', desc: 'Add new client visit appointments' },
      { key: 'visit.visits.edit', label: 'Edit Visit Details', desc: 'Modify scheduled visit parameters' },
      { key: 'visit.visits.cancel', label: 'Cancel Visit', desc: 'Cancel scheduled client visits' },
      { key: 'visit.visits.snapshots', label: 'View Route Snapshots', desc: 'Access GPS trip route map snapshots' },
    ]
  },
  {
    name: 'Spatial & Smart Radar Maps',
    module: 'spatial',
    icon: '🗺️',
    keys: [
      { key: 'spatial.map.view', label: 'View Map', desc: 'Access live GPS radar map' },
      { key: 'spatial.map.view_team', label: 'View Team Locations', desc: 'Track direct team members on map' },
      { key: 'spatial.map.view_all', label: 'View All Employee Maps', desc: 'Track all company field staff live' },
    ]
  },
  {
    name: 'Expenses & Finance Claims',
    module: 'expenses',
    icon: '💰',
    keys: [
      { key: 'expenses.view', label: 'View Expenses', desc: 'Access expense claim records' },
      { key: 'expenses.create', label: 'Create Claim', desc: 'Submit new expense reimbursement' },
      { key: 'expenses.edit', label: 'Edit Claim', desc: 'Modify draft expense claims' },
      { key: 'expenses.approve', label: 'Approve / Reject Claims', desc: 'Process team & org expense approvals' },
      { key: 'finance.expenses.view', label: 'Finance Expenses View', desc: 'View financial expense records' },
      { key: 'finance.expenses.view_own', label: 'Finance Expenses View Own', desc: 'View own financial expenses' },
      { key: 'finance.expenses.create', label: 'Finance Expenses Create', desc: 'Create financial expense entry' },
      { key: 'finance.expenses.edit', label: 'Finance Expenses Edit', desc: 'Edit financial expense entry' },
      { key: 'finance.expenses.edit_own', label: 'Finance Expenses Edit Own', desc: 'Edit own financial expense' },
      { key: 'finance.expenses.view_team', label: 'Finance Expenses View Team', desc: 'View team financial expenses' },
      { key: 'finance.expenses.approve', label: 'Finance Expenses Approve', desc: 'Approve financial expense claims' },
    ]
  },
  {
    name: 'Reports & Analytics',
    module: 'reports',
    icon: '📈',
    keys: [
      { key: 'reports.view', label: 'View Reports', desc: 'Access executive dashboards & summaries' },
      { key: 'reports.export', label: 'Export Reports', desc: 'Export report data to Excel/PDF' },
      { key: 'system.reports.view', label: 'View System Reports', desc: 'Access system reporting tools' },
      { key: 'system.reports.export', label: 'Export System Reports', desc: 'Export system reports to files' },
    ]
  },
  {
    name: 'Admin & User Management',
    module: 'admin',
    icon: '⚙️',
    keys: [
      { key: 'admin.users.view', label: 'View Users', desc: 'Access system accounts & team views' },
      { key: 'admin.users.create', label: 'Create User', desc: 'Provision new system user accounts' },
      { key: 'admin.users.edit', label: 'Edit User', desc: 'Update user account roles & details' },
      { key: 'admin.users.disable', label: 'Disable Account', desc: 'Disable system user login access' },
      { key: 'admin.permissions.manage', label: 'Manage Permissions', desc: 'Grant/revoke employee RBAC permissions' },
    ]
  },
  {
    name: 'Audit Logs',
    module: 'system',
    icon: '🛡️',
    keys: [
      { key: 'system.audit.view', label: 'View Audit Logs', desc: 'Access system activity audit trails' },
      { key: 'system.audit.export', label: 'Export Audit Logs', desc: 'Download compliance audit logs' },
    ]
  },
  {
    name: 'System Settings',
    module: 'system',
    icon: '🔧',
    keys: [
      { key: 'system.settings.view', label: 'View Settings', desc: 'Access system business configuration' },
      { key: 'system.settings.edit', label: 'Edit Settings', desc: 'Modify company profile & branches' },
    ]
  },
  {
    name: 'Sales Targets',
    module: 'sales',
    icon: '🎯',
    keys: [
      { key: 'sales.targets.view', label: 'View Sales Targets', desc: 'Access sales targets and quotas' },
      { key: 'sales.targets.manage', label: 'Manage Sales Targets', desc: 'Set and assign sales targets' },
    ]
  },
]

export default function AdminPermissionManagementModal({
  employee,
  onClose,
  onPermissionsUpdated
}) {
  const { showToast } = useToast()
  const { refreshPermissions: refreshMyPermissions } = usePermissions()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [permissionsMap, setPermissionsMap] = useState({})
  const [scopesMap, setScopesMap] = useState({})
  const [activeCategory, setActiveCategory] = useState('all')

  const empId = employee.employee_code || employee.employee_id || employee.id || employee.user_id
  const empName = employee.name || employee.employee_name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Employee'
  const empDesig = employee.designation || employee.role || 'Sales Executive'

  const fetchEffectivePermissions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await userAPI.getUserPermissions(empId)
      const data = res?.data || res
      if (data) {
        setPermissionsMap(data.permissions || {})
        setScopesMap(data.scopes || {})
      }
    } catch (err) {
      console.error('[AdminPermissionModal] Fetch permissions error:', err)
      showToast(err.message || 'Could not load employee permissions', 'error')
    } finally {
      setLoading(false)
    }
  }, [empId, showToast])

  useEffect(() => {
    fetchEffectivePermissions()
  }, [fetchEffectivePermissions])

  const handleTogglePermission = (key) => {
    setPermissionsMap((prev) => ({
      ...prev,
      [key]: !Boolean(prev[key])
    }))
  }

  const handleScopeChange = (key, scopeVal) => {
    setScopesMap((prev) => ({
      ...prev,
      [key]: scopeVal
    }))
  }

  const handleSavePermissions = async () => {
    setSaving(true)
    try {
      await userAPI.updateUserPermissions(empId, {
        permissions: permissionsMap,
        scopes: scopesMap
      })
      showToast(`Successfully saved updated permissions for ${empName}!`, 'success')
      await refreshMyPermissions()
      if (onPermissionsUpdated) onPermissionsUpdated()
      onClose()
    } catch (err) {
      console.error('[AdminPermissionModal] Save error:', err)
      showToast(err.message || 'Failed to update employee permissions', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleResetToDefaults = async () => {
    if (!window.confirm(`Reset permissions for ${empName} back to "${empDesig}" designation defaults?`)) {
      return
    }

    setResetting(true)
    try {
      const res = await userAPI.resetUserPermissions(empId, { designation: empDesig })
      const data = res?.data || res
      if (data) {
        setPermissionsMap(data.permissions || {})
        setScopesMap(data.scopes || {})
      }
      showToast(`Permissions reset to ${empDesig} defaults!`, 'info')
      await refreshMyPermissions()
      if (onPermissionsUpdated) onPermissionsUpdated()
    } catch (err) {
      console.error('[AdminPermissionModal] Reset error:', err)
      showToast(err.message || 'Failed to reset employee permissions', 'error')
    } finally {
      setResetting(false)
    }
  }

  const categoriesToDisplay = activeCategory === 'all'
    ? PERMISSION_CATEGORIES
    : PERMISSION_CATEGORIES.filter(c => c.module === activeCategory)

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150 font-sans">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/20 border border-blue-400/30 text-blue-400 flex items-center justify-center text-xl shrink-0 shadow-inner">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>{empName}</span>
                <span className="text-xs font-mono font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700">
                  {empId}
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Designation: <strong className="text-blue-400 font-extrabold">{empDesig}</strong> • Effective Employee RBAC Matrix
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition flex items-center justify-center cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter Category Tabs */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition whitespace-nowrap cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            All Categories ({PERMISSION_CATEGORIES.reduce((acc, c) => acc + c.keys.length, 0)})
          </button>

          {PERMISSION_CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              type="button"
              onClick={() => setActiveCategory(cat.module)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeCategory === cat.module
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* Main Content Area: Permission Categories */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-slate-50/50">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500">Loading effective employee permissions...</p>
            </div>
          ) : (
            categoriesToDisplay.map((cat) => (
              <div key={cat.name} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <span className="text-base">{cat.icon}</span>
                    <span>{cat.name}</span>
                  </h4>
                  <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                    {cat.keys.filter(k => Boolean(permissionsMap[k.key])).length} / {cat.keys.length} Enabled
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cat.keys.map((item) => {
                    const isGranted = Boolean(permissionsMap[item.key])
                    const currentScope = scopesMap[item.key] || 'ORG'
                    const isDefault = isGranted && currentScope === 'ORG'

                    return (
                      <div
                        key={item.key}
                        className={`p-3 rounded-xl border transition-all duration-150 flex items-center justify-between gap-3 ${
                          isGranted
                            ? 'bg-blue-50/40 border-blue-200/80 shadow-2xs'
                            : 'bg-amber-50/30 border-amber-200/80 opacity-90'
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 truncate" title={item.key}>
                              {item.label}
                            </span>
                            <code className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1 py-0.5 rounded shrink-0">
                              {item.key}
                            </code>
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border shrink-0 ${
                                isDefault
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-100 text-amber-800 border-amber-300'
                              }`}
                            >
                              {isDefault ? 'Default' : 'Override'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium truncate">{item.desc}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Scope Selector */}
                          {isGranted ? (
                            <select
                              value={currentScope}
                              onChange={(e) => handleScopeChange(item.key, e.target.value)}
                              className="text-[10px] font-extrabold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs cursor-pointer"
                              title="Data Scope (OWN, TEAM, ORG)"
                            >
                              <option value="ORG">ORG</option>
                              <option value="TEAM">TEAM</option>
                              <option value="OWN">OWN</option>
                            </select>
                          ) : (
                            <span className="text-[10px] font-mono font-bold text-slate-400 px-2">--</span>
                          )}

                          {/* Toggle Button */}
                          <button
                            type="button"
                            onClick={() => handleTogglePermission(item.key)}
                            className={`w-12 h-6 rounded-full transition-colors duration-200 ease-in-out p-0.5 flex items-center cursor-pointer ${
                              isGranted ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
                            }`}
                          >
                            <span className="w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center text-[9px] font-black">
                              {isGranted ? <Check size={11} className="text-blue-600" /> : null}
                            </span>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            disabled={resetting || saving}
            onClick={handleResetToDefaults}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RotateCcw size={14} className="text-slate-500" />
            <span>{resetting ? 'Resetting...' : 'Reset to Designation Defaults'}</span>
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-extrabold text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving || resetting}
              onClick={handleSavePermissions}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition active:scale-95 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save size={14} />
              <span>{saving ? 'Saving...' : 'Save Permission Changes'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
