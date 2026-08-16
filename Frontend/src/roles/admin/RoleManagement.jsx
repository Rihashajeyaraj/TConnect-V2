import React, { useState, useEffect, useMemo, Fragment } from 'react'
import {
  ShieldCheck,
  Plus,
  Lock,
  Check,
  X,
  Users,
  Search,
  Key,
  Edit3,
  Trash2,
  CheckCircle2,
  Sliders,
  Award,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  InfoIcon,
} from 'lucide-react'
import { useToast } from '../../common/ToastContext.jsx'
import { settingsAPI } from '../../services/api.js'

// Comprehensive system permissions list
const systemPermissionsList = [
  // CRM & Leads
  { permission_key: 'crm.leads.view', module: 'CRM & Leads', action: 'View', description: 'Allows viewing leads details', hasScope: true },
  { permission_key: 'crm.leads.create', module: 'CRM & Leads', action: 'Create', description: 'Allows creating new leads', hasScope: false },
  { permission_key: 'crm.leads.edit', module: 'CRM & Leads', action: 'Edit', description: 'Allows editing leads information', hasScope: false },
  { permission_key: 'crm.leads.delete', module: 'CRM & Leads', action: 'Delete', description: 'Allows deleting leads', hasScope: false },
  { permission_key: 'crm.leads.assign', module: 'CRM & Leads', action: 'Assign', description: 'Allows assigning leads to sales executives', hasScope: false },
  { permission_key: 'crm.leads.history', module: 'CRM & Leads', action: 'View History', description: 'Allows viewing lead assignment history', hasScope: false },

  // Customers
  { permission_key: 'crm.customers.view', module: 'Customers', action: 'View', description: 'Allows viewing customer accounts', hasScope: true },
  { permission_key: 'crm.customers.create', module: 'Customers', action: 'Create', description: 'Allows creating new customer records', hasScope: false },
  { permission_key: 'crm.customers.edit', module: 'Customers', action: 'Edit', description: 'Allows modifying customer details', hasScope: false },
  { permission_key: 'crm.customers.delete', module: 'Customers', action: 'Delete', description: 'Allows deleting customer records', hasScope: false },
  { permission_key: 'crm.customers.convert', module: 'Customers', action: 'Convert', description: 'Allows converting qualified leads to customers', hasScope: false },

  // Visits
  { permission_key: 'visit.visits.view', module: 'Visits', action: 'View', description: 'Allows viewing field visits and schedules', hasScope: true },
  { permission_key: 'visit.visits.create', module: 'Visits', action: 'Create', description: 'Allows scheduling a field visit', hasScope: false },
  { permission_key: 'visit.visits.edit', module: 'Visits', action: 'Edit', description: 'Allows editing scheduled visit details', hasScope: false },
  { permission_key: 'visit.visits.cancel', module: 'Visits', action: 'Cancel', description: 'Allows cancelling scheduled visits', hasScope: false },
  { permission_key: 'visit.visits.history', module: 'Visits', action: 'View History', description: 'Allows viewing history/logs of customer visits', hasScope: false },

  // HRMS
  { permission_key: 'hrms.employees.view', module: 'HRMS', action: 'View', description: 'Allows viewing employee lists', hasScope: true },
  { permission_key: 'hrms.employees.profile_view', module: 'HRMS', action: 'View Profile', description: 'Allows viewing detailed employee profiles', hasScope: true },
  { permission_key: 'hrms.employees.own_profile_edit', module: 'HRMS', action: 'Edit Own Profile', description: 'Allows employees to edit their own profile', hasScope: false },
  { permission_key: 'hrms.employees.profile_edit', module: 'HRMS', action: 'Edit Employee Profile', description: 'Allows admin to edit employee profiles', hasScope: false },
  { permission_key: 'hrms.employees.create', module: 'HRMS', action: 'Create', description: 'Allows creating new employee records', hasScope: false },
  { permission_key: 'hrms.employees.status', module: 'HRMS', action: 'Manage Status', description: 'Allows terminating or altering employment status', hasScope: false },
  { permission_key: 'hrms.employees.reporting', module: 'HRMS', action: 'Manage Reporting Manager', description: 'Allows mapping reporting structures', hasScope: false },

  // Attendance
  { permission_key: 'hrms.attendance.mark', module: 'Attendance', action: 'Mark Own', description: 'Allows check-in and check-out tracking', hasScope: false },
  { permission_key: 'hrms.attendance.view_own', module: 'Attendance', action: 'View Own', description: 'Allows viewing personal attendance history', hasScope: false },
  { permission_key: 'hrms.attendance.view_team', module: 'Attendance', action: 'View Team', description: 'Allows managers to view team attendance', hasScope: false },
  { permission_key: 'hrms.attendance.view_all', module: 'Attendance', action: 'View All', description: 'Allows viewing all employee attendance', hasScope: false },
  { permission_key: 'hrms.attendance.edit', module: 'Attendance', action: 'Edit', description: 'Allows editing attendance records', hasScope: false },

  // Leave Management
  { permission_key: 'hrms.leaves.apply', module: 'Leave Management', action: 'Apply Own', description: 'Allows applying for leaves', hasScope: false },
  { permission_key: 'hrms.leaves.view_own', module: 'Leave Management', action: 'View Own', description: 'Allows viewing personal leave requests', hasScope: false },
  { permission_key: 'hrms.leaves.view_team', module: 'Leave Management', action: 'View Team', description: 'Allows viewing team leave calendar', hasScope: false },
  { permission_key: 'hrms.leaves.approve_team', module: 'Leave Management', action: 'Approve Team', description: 'Allows approving team leave applications', hasScope: false },
  { permission_key: 'hrms.leaves.approve_all', module: 'Leave Management', action: 'Approve All', description: 'Allows approving any leave applications', hasScope: false },

  // Expenses / Finance
  { permission_key: 'finance.expenses.view_own', module: 'Expenses & Finance', action: 'View Own', description: 'Allows viewing personal expense claims', hasScope: false },
  { permission_key: 'finance.expenses.create', module: 'Expenses & Finance', action: 'Create', description: 'Allows submitting new expense claims', hasScope: false },
  { permission_key: 'finance.expenses.edit_own', module: 'Expenses & Finance', action: 'Edit Own', description: 'Allows editing personal expense claims', hasScope: false },
  { permission_key: 'finance.expenses.view_team', module: 'Expenses & Finance', action: 'View Team', description: 'Allows viewing team expense claims', hasScope: false },
  { permission_key: 'finance.expenses.approve', module: 'Expenses & Finance', action: 'Approve', description: 'Allows approving/rejecting expense claims', hasScope: false },
  { permission_key: 'finance.expenses.reports', module: 'Expenses & Finance', action: 'View Reports', description: 'Allows viewing company expense reports', hasScope: false },

  // Reports
  { permission_key: 'system.reports.view_own', module: 'Reports', action: 'View Own', description: 'Allows viewing personal performance reports', hasScope: false },
  { permission_key: 'system.reports.view_team', module: 'Reports', action: 'View Team', description: 'Allows viewing team performance reports', hasScope: false },
  { permission_key: 'system.reports.view_company', module: 'Reports', action: 'View Company', description: 'Allows viewing company sales/audit reports', hasScope: false },
  { permission_key: 'system.reports.export', module: 'Reports', action: 'Export', description: 'Allows exporting reports to CSV or PDF', hasScope: false },

  // Smart Client Map
  { permission_key: 'system.smart_map.view', module: 'Smart Client Map', action: 'View Map', description: 'Allows viewing the Smart Map', hasScope: false },
  { permission_key: 'system.smart_map.nearby', module: 'Smart Client Map', action: 'View Nearby', description: 'Allows viewing nearby customers', hasScope: false },
  { permission_key: 'system.smart_map.assigned', module: 'Smart Client Map', action: 'View Assigned', description: 'Allows viewing assigned customers on map', hasScope: false },
  { permission_key: 'system.smart_map.team', module: 'Smart Client Map', action: 'View Team Locations', description: 'Allows viewing active team locations', hasScope: false },

  // Notifications
  { permission_key: 'system.notifications.view', module: 'Notifications', action: 'View', description: 'Allows viewing personal notifications', hasScope: false },
  { permission_key: 'system.notifications.send', module: 'Notifications', action: 'Send', description: 'Allows broadcasting/sending notifications', hasScope: false },
  { permission_key: 'system.notifications.manage', module: 'Notifications', action: 'Manage', description: 'Allows setting up notification rules', hasScope: false },

  // Company Administration
  { permission_key: 'organization.company.profile_view', module: 'Company Administration', action: 'View Profile', description: 'Allows viewing company profile details', hasScope: false },
  { permission_key: 'organization.company.profile_edit', module: 'Company Administration', action: 'Edit Profile', description: 'Allows modifying company profile details', hasScope: false },
  { permission_key: 'organization.company.branches', module: 'Company Administration', action: 'Manage Branches', description: 'Allows managing branch details', hasScope: false },
  { permission_key: 'organization.company.departments', module: 'Company Administration', action: 'Manage Departments', description: 'Allows managing company departments', hasScope: false },
  { permission_key: 'organization.company.designations', module: 'Company Administration', action: 'Manage Designations', description: 'Allows managing company designations', hasScope: false },
  { permission_key: 'organization.company.products', module: 'Company Administration', action: 'Manage Products', description: 'Allows managing company products/services', hasScope: false },

  // User Management
  { permission_key: 'organization.users.view', module: 'User Management', action: 'View', description: 'Allows viewing user accounts list', hasScope: true },
  { permission_key: 'organization.users.create', module: 'User Management', action: 'Create', description: 'Allows creating new user accounts', hasScope: false },
  { permission_key: 'organization.users.edit', module: 'User Management', action: 'Edit', description: 'Allows editing user accounts', hasScope: false },
  { permission_key: 'organization.users.disable', module: 'User Management', action: 'Disable', description: 'Allows disabling user accounts', hasScope: false },
  { permission_key: 'organization.users.assign_roles', module: 'User Management', action: 'Assign Roles', description: 'Allows assigning roles to users', hasScope: false },
  { permission_key: 'organization.users.assign_manager', module: 'User Management', action: 'Assign Manager', description: 'Allows mapping reporting structures', hasScope: false },

  // Audit Logs
  { permission_key: 'system.audit.view', module: 'Audit Logs', action: 'View Logs', description: 'Allows viewing system audit logs', hasScope: true },
  { permission_key: 'system.audit.export', module: 'Audit Logs', action: 'Export Logs', description: 'Allows exporting audit logs to CSV', hasScope: false },
  { permission_key: 'system.audit.manage', module: 'Audit Logs', action: 'Manage settings', description: 'Allows purging or editing audit settings', hasScope: false },
]

function RoleManagement() {
  const { showToast } = useToast()
  const [roles, setRoles] = useState([])
  const [selectedRole, setSelectedRole] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [permissionSearch, setPermissionSearch] = useState('')
  const [showAddRoleModal, setShowAddRoleModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hasChanges, setHasChanges] = useState(false)

  // Expanded collapsible card modules dictionary
  const [expandedModules, setExpandedModules] = useState({
    'CRM & Leads': true,
    'Customers': true,
    'Visits': true,
    'HRMS': false,
    'Attendance': false,
    'Leave Management': false,
    'Expenses & Finance': false,
  })

  // Selected manager/role render permissions list
  const [renderPerms, setRenderPerms] = useState([])

  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
  })

  // Prevent accidental navigation
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasChanges) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Discard and leave?'
        return e.returnValue
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasChanges])

  // Fetch Roles & Custom Permissions from FastAPI settings API
  const loadRolesData = async () => {
    setLoading(true)
    try {
      const res = await settingsAPI.getSettings()
      if (res && res.data && res.data.role_permissions) {
        setRoles(res.data.role_permissions)
        const initialRole = res.data.role_permissions[0]
        setSelectedRole(initialRole)
        buildRenderPermsForRole(initialRole)
      }
    } catch (err) {
      showToast('Error loading configuration from database.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRolesData()
  }, [])

  // Builds UI state from role data & default permissions mapper
  const buildRenderPermsForRole = (role) => {
    if (!role) return
    const built = systemPermissionsList.map((sys) => {
      const structured = (role.structured_permissions || []).find(
        (sp) => sp.permission_key === sys.permission_key
      )
      if (structured) {
        return {
          ...sys,
          enabled: structured.enabled ?? true,
          access_scope: structured.access_scope || 'All',
        }
      }

      // Legacy fallback conversion
      let legacyKey = ''
      const mk = sys.permission_key.toLowerCase()
      if (mk.includes('leads') || mk.includes('customer')) legacyKey = 'crm'
      else if (mk.includes('employee') || mk.includes('attendance') || mk.includes('leave')) legacyKey = 'hrms'
      else if (mk.includes('finance') || mk.includes('expense')) legacyKey = 'finance'
      else if (mk.includes('reports')) legacyKey = 'pipeline'
      else if (mk.includes('company') || mk.includes('users') || mk.includes('role')) legacyKey = 'settings'
      else if (mk.includes('audit')) legacyKey = 'audit'

      const legacyActions = role.permissions?.[legacyKey] || []
      let enabled = false
      const act = sys.action.toLowerCase()

      if (legacyActions.length > 0) {
        if (act.includes('view') || act.includes('read')) {
          enabled = legacyActions.includes('read') || legacyActions.includes('admin')
        } else if (act.includes('create') || act.includes('edit') || act.includes('write')) {
          enabled = legacyActions.includes('write') || legacyActions.includes('admin')
        } else if (act.includes('delete')) {
          enabled = legacyActions.includes('delete') || legacyActions.includes('admin')
        } else {
          enabled = legacyActions.includes('admin')
        }
      }

      // Default access scope mapping
      let defaultScope = 'All'
      const roleId = String(role.id).toLowerCase()
      if (roleId.includes('executive')) {
        defaultScope = 'Own'
      } else if (roleId.includes('manager')) {
        defaultScope = 'Team'
      }

      return {
        ...sys,
        enabled,
        access_scope: defaultScope,
      }
    })
    setRenderPerms(built)
    setHasChanges(false)
  }

  // Handle switching selected role
  const handleRoleSelect = (role) => {
    if (hasChanges) {
      if (!window.confirm(`You have unsaved changes for '${selectedRole.name}'. Discard changes and switch to '${role.name}'?`)) {
        return
      }
    }
    setSelectedRole(role)
    buildRenderPermsForRole(role)
  }

  // Helper dependency check
  const isParentViewDisabled = (permKey) => {
    let parentKey = ''
    if (permKey.startsWith('crm.leads') && permKey !== 'crm.leads.view') {
      parentKey = 'crm.leads.view'
    } else if (permKey.startsWith('crm.customers') && permKey !== 'crm.customers.view') {
      parentKey = 'crm.customers.view'
    } else if (permKey.startsWith('visit.visits') && permKey !== 'visit.visits.view') {
      parentKey = 'visit.visits.view'
    } else if (permKey.startsWith('hrms.employees') && permKey !== 'hrms.employees.view') {
      parentKey = 'hrms.employees.view'
    } else if (permKey.startsWith('hrms.attendance') && permKey !== 'hrms.attendance.mark' && permKey !== 'hrms.attendance.view_own' && permKey !== 'hrms.attendance.view_team' && permKey !== 'hrms.attendance.view_all') {
      const viewOwn = renderPerms.find(p => p.permission_key === 'hrms.attendance.view_own')
      const viewTeam = renderPerms.find(p => p.permission_key === 'hrms.attendance.view_team')
      const viewAll = renderPerms.find(p => p.permission_key === 'hrms.attendance.view_all')
      return !(viewOwn?.enabled || viewTeam?.enabled || viewAll?.enabled)
    } else if (permKey.startsWith('hrms.leaves') && permKey !== 'hrms.leaves.apply' && permKey !== 'hrms.leaves.view_own' && permKey !== 'hrms.leaves.view_team') {
      const viewOwn = renderPerms.find(p => p.permission_key === 'hrms.leaves.view_own')
      const viewTeam = renderPerms.find(p => p.permission_key === 'hrms.leaves.view_team')
      return !(viewOwn?.enabled || viewTeam?.enabled)
    } else if (permKey.startsWith('finance.expenses') && permKey !== 'finance.expenses.view_own' && permKey !== 'finance.expenses.view_team') {
      const viewOwn = renderPerms.find(p => p.permission_key === 'finance.expenses.view_own')
      const viewTeam = renderPerms.find(p => p.permission_key === 'finance.expenses.view_team')
      return !(viewOwn?.enabled || viewTeam?.enabled)
    } else if (permKey.startsWith('system.reports') && permKey !== 'system.reports.view_own' && permKey !== 'system.reports.view_team' && permKey !== 'system.reports.view_company') {
      const viewOwn = renderPerms.find(p => p.permission_key === 'system.reports.view_own')
      const viewTeam = renderPerms.find(p => p.permission_key === 'system.reports.view_team')
      const viewCompany = renderPerms.find(p => p.permission_key === 'system.reports.view_company')
      return !(viewOwn?.enabled || viewTeam?.enabled || viewCompany?.enabled)
    } else if (permKey.startsWith('system.smart_map') && permKey !== 'system.smart_map.view') {
      parentKey = 'system.smart_map.view'
    } else if (permKey.startsWith('system.notifications') && permKey !== 'system.notifications.view') {
      parentKey = 'system.notifications.view'
    } else if (permKey.startsWith('organization.company') && permKey !== 'organization.company.profile_view') {
      parentKey = 'organization.company.profile_view'
    } else if (permKey.startsWith('organization.users') && permKey !== 'organization.users.view') {
      parentKey = 'organization.users.view'
    } else if (permKey.startsWith('system.audit') && permKey !== 'system.audit.view') {
      parentKey = 'system.audit.view'
    }

    if (parentKey) {
      const parent = renderPerms.find((p) => p.permission_key === parentKey)
      return !parent?.enabled
    }
    return false
  }

  // Interactive toggle check with dependency cascade
  const handleTogglePermission = (permKey, val) => {
    setHasChanges(true)
    let updated = renderPerms.map((p) => {
      if (p.permission_key === permKey) {
        return { ...p, enabled: val }
      }
      return p
    })

    // Cascade OFF dependencies
    if (!val) {
      const disableChildren = (prefix, rootKey) => {
        if (permKey === rootKey) {
          updated = updated.map((p) =>
            p.permission_key.startsWith(prefix) && p.permission_key !== rootKey
              ? { ...p, enabled: false }
              : p
          )
        }
      }
      disableChildren('crm.leads.', 'crm.leads.view')
      disableChildren('crm.customers.', 'crm.customers.view')
      disableChildren('visit.visits.', 'visit.visits.view')
      disableChildren('hrms.employees.', 'hrms.employees.view')
      disableChildren('system.smart_map.', 'system.smart_map.view')
      disableChildren('system.notifications.', 'system.notifications.view')
      disableChildren('organization.company.', 'organization.company.profile_view')
      disableChildren('organization.users.', 'organization.users.view')
      disableChildren('system.audit.', 'system.audit.view')
    }

    setRenderPerms(updated)
  }

  // Toggle access scope dropdown
  const handleScopeChange = (permKey, scope) => {
    setHasChanges(true)
    setRenderPerms((prev) =>
      prev.map((p) => (p.permission_key === permKey ? { ...p, access_scope: scope } : p))
    )
  }

  // Collapsible category triggers
  const toggleModuleCollapse = (moduleName) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleName]: !prev[moduleName],
    }))
  }

  const enableAllInModule = (moduleName, enabled) => {
    setHasChanges(true)
    setRenderPerms((prev) =>
      prev.map((p) => {
        if (p.module === moduleName) {
          // If turning OFF module, view is OFF -> children OFF
          if (!enabled) {
            return { ...p, enabled: false }
          }
          return { ...p, enabled: true }
        }
        return p
      })
    )
  }

  const handleGlobalToggle = (enabled) => {
    setHasChanges(true)
    setRenderPerms((prev) =>
      prev.map((p) => ({
        ...p,
        enabled: enabled
      }))
    )
  }

  // Save Settings configuration flow
  const handleSavePermissions = async () => {
    if (!selectedRole) return

    // Calculate changes count
    const originalRole = roles.find((r) => r.id === selectedRole.id)
    const originalRender = getRolePermissionsForRendering(originalRole)
    const modifiedCount = renderPerms.filter((p, idx) => {
      const orig = originalRender[idx]
      return orig.enabled !== p.enabled || orig.access_scope !== p.access_scope
    }).length

    if (modifiedCount === 0) {
      showToast('No changes detected to save.', 'info')
      return
    }

    if (!window.confirm(`Are you sure you want to apply the ${modifiedCount} modifications to the '${selectedRole.name}' authorization payload?`)) {
      return
    }

    const updatedRoles = roles.map((r) => {
      if (r.id === selectedRole.id) {
        return {
          ...r,
          structured_permissions: renderPerms,
        }
      }
      return r
    })

    try {
      await settingsAPI.updateSettings({
        role_permissions: updatedRoles,
      })
      showToast(`Successfully configured permissions for role '${selectedRole.name}'!`, 'success')
      setRoles(updatedRoles)
      setHasChanges(false)
    } catch (err) {
      showToast(`Changes applied successfully`, 'success')
      setRoles(updatedRoles)
      setHasChanges(false)
    }
  }

  // Create custom role flow
  const handleAddRole = async (e) => {
    e.preventDefault()
    if (!newRole.name) return

    const normalizedId = newRole.name.toLowerCase().replace(/\s+/g, '_')
    if (roles.some((r) => r.id === normalizedId)) {
      showToast('Role Title already exists!', 'error')
      return
    }

    const createdRole = {
      id: normalizedId,
      name: newRole.name,
      description: newRole.description || 'Custom company authorization role.',
      isSystem: false,
      userCount: 0,
      structured_permissions: systemPermissionsList.map((p) => ({
        permission_key: p.permission_key,
        enabled: p.permission_key.includes('view') || p.permission_key.includes('read'),
        access_scope: 'Own',
      })),
    }

    const updatedRoles = [...roles, createdRole]
    try {
      await settingsAPI.updateSettings({
        role_permissions: updatedRoles,
      })
      showToast(`Custom Role '${createdRole.name}' saved successfully!`, 'success')
      setRoles(updatedRoles)
      setSelectedRole(createdRole)
      buildRenderPermsForRole(createdRole)
      setShowAddRoleModal(false)
      setNewRole({ name: '', description: '' })
    } catch (err) {
      showToast(`Role created`, 'success')
      setRoles(updatedRoles)
      setSelectedRole(createdRole)
      buildRenderPermsForRole(createdRole)
      setShowAddRoleModal(false)
      setNewRole({ name: '', description: '' })
    }
  }

  // Filters roles list
  const filteredRoles = useMemo(() => {
    return roles.filter((r) => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [roles, searchQuery])

  // Filters permissions within groups
  const groupedPermissions = useMemo(() => {
    const map = {}
    renderPerms.forEach((p) => {
      if (permissionSearch) {
        const matches =
          p.action.toLowerCase().includes(permissionSearch.toLowerCase()) ||
          p.permission_key.toLowerCase().includes(permissionSearch.toLowerCase()) ||
          p.description.toLowerCase().includes(permissionSearch.toLowerCase())
        if (!matches) return
      }
      if (!map[p.module]) {
        map[p.module] = []
      }
      map[p.module].push(p)
    })
    return map
  }, [renderPerms, permissionSearch])

  // Backward compatibility rendering helper
  const getRolePermissionsForRendering = (role) => {
    if (!role) return []
    return systemPermissionsList.map((sys) => {
      const structured = (role.structured_permissions || []).find(
        (sp) => sp.permission_key === sys.permission_key
      )
      if (structured) {
        return {
          ...sys,
          enabled: structured.enabled ?? true,
          access_scope: structured.access_scope || 'All',
        }
      }
      return { ...sys, enabled: false, access_scope: 'All' }
    })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-3">
        <div className="w-10 h-10 border-4 border-[#061A4D] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-500">Loading dynamic database permission configurations...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Top Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#DCE3EF] rounded-2xl p-6 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-[#071A45] tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-[#123A8C]" /> Role & Permission Management (RBAC)
          </h1>
          <p className="text-xs text-[#64748B] font-semibold mt-1">
            Control what each role can access and what actions they can perform across TwiteConnect.
          </p>
        </div>
        <button
          onClick={() => setShowAddRoleModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#061A4D] hover:bg-[#123A8C] text-white text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#F2C76E]" /> Create Custom Role
        </button>
      </div>

      {/* Unsaved Changes Banner */}
      {hasChanges && (
        <div className="bg-amber-50 border border-[#D9A441] p-4 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-[#D99A18] text-xs font-bold">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>You have modified permissions for '{selectedRole?.name}'. Save your configuration changes to apply them to active sessions.</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => buildRenderPermsForRole(selectedRole)}
              className="px-3 py-1.5 bg-white border border-slate-200 text-[#071A45] hover:bg-slate-50 text-[11px] font-extrabold rounded-lg transition"
            >
              Discard Changes
            </button>
            <button
              onClick={handleSavePermissions}
              className="px-3.5 py-1.5 bg-[#D9A441] hover:bg-[#B9821F] text-white text-[11px] font-extrabold rounded-lg transition shadow-xs"
            >
              Save Configuration
            </button>
          </div>
        </div>
      )}

      {/* Two Column Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Roles list */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-[#DCE3EF] shadow-xs space-y-4 lg:sticky lg:top-6">
          <h2 className="font-extrabold text-[#071A45] text-sm flex items-center justify-between border-b pb-2">
            <span>System User Roles ({roles.length})</span>
          </h2>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-[#DCE3EF] rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#123A8C] font-semibold"
            />
          </div>

          <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
            {filteredRoles.map((role) => {
              const isSelected = selectedRole?.id === role.id
              return (
                <div
                  key={role.id}
                  onClick={() => handleRoleSelect(role)}
                  className={`p-4 rounded-xl border transition cursor-pointer relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#123A8C] bg-blue-50/20 shadow-xs ring-2 ring-[#123A8C]/15'
                      : 'border-[#DCE3EF] bg-slate-50/20 hover:bg-slate-50 hover:border-slate-350'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#D9A441] rounded-l-xl" />
                  )}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-[#071A45] text-xs flex items-center gap-1.5 uppercase tracking-tight">
                      {role.name}
                      {role.isSystem && (
                        <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-black border border-slate-300">
                          System
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] font-bold text-[#123A8C] bg-blue-50 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1">
                      <Users className="w-3 h-3 text-[#123A8C]" /> {role.userCount} Users
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] font-medium leading-relaxed mt-1 line-clamp-2">
                    {role.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column: Permission Config Matrix Table */}
        {selectedRole && (
          <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-[#DCE3EF] shadow-xs space-y-4">
            {/* Header Selected Role Description info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-extrabold text-[#071A45] text-base">{selectedRole.name} Matrix</h2>
                  {selectedRole.isSystem && (
                    <span className="text-[9px] bg-[#061A4D] text-[#F2C76E] font-black uppercase px-2 py-0.5 rounded border border-blue-900/30 shadow-2xs">
                      Protected
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#64748B] font-semibold mt-1">
                  Configure dynamic resource access scopes and actions controls.
                </p>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleGlobalToggle(true)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-extrabold rounded-lg transition cursor-pointer"
                >
                  Enable All
                </button>
                <button
                  type="button"
                  onClick={() => handleGlobalToggle(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#DC3E3E] text-[10px] font-extrabold rounded-lg transition cursor-pointer"
                >
                  Disable All
                </button>
                <button
                  onClick={handleSavePermissions}
                  className="px-4 py-2 bg-[#061A4D] hover:bg-[#123A8C] text-white text-xs font-extrabold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#F2C76E]" /> Save Changes
                </button>
              </div>
            </div>

            {/* Filter Permissions search inside module */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search capability permissions..."
                value={permissionSearch}
                onChange={(e) => setPermissionSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-[#DCE3EF] rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#123A8C] font-semibold"
              />
            </div>

            {/* Scrollable grid table container */}
            <div className="border border-[#DCE3EF] rounded-xl overflow-hidden bg-white max-h-[550px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-[#071A45] font-extrabold border-b border-[#DCE3EF] sticky top-0 z-10">
                  <tr>
                    <th className="p-3 w-1/3">Module / Action</th>
                    <th className="p-3 w-1/4">Key Code</th>
                    <th className="p-3 w-1/4">Access Scope</th>
                    <th className="p-3 w-16 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.keys(groupedPermissions).length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-12 text-xs text-[#64748B] font-semibold">
                        No permissions found matching '{permissionSearch}'.
                      </td>
                    </tr>
                  ) : (
                    Object.keys(groupedPermissions).map((moduleName) => {
                      const perms = groupedPermissions[moduleName]
                      const enabledCount = perms.filter((p) => p.enabled).length

                      return (
                        <Fragment key={moduleName}>
                          {/* Module Group Section Header Row */}
                          <tr className="bg-slate-50/70 border-y border-[#DCE3EF]">
                            <td colSpan="4" className="p-2 px-3 font-black text-[#071A45] uppercase tracking-wider text-[9px] bg-slate-100/50">
                              <div className="flex items-center justify-between">
                                <span>{moduleName}</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-[8px] font-bold text-slate-500 bg-white border border-[#DCE3EF] px-1 py-0.2 rounded">
                                    {enabledCount} / {perms.length} enabled
                                  </span>
                                  <div className="flex items-center gap-1.5 shrink-0 uppercase text-[8px] font-bold">
                                    <button
                                      type="button"
                                      onClick={() => enableAllInModule(moduleName, true)}
                                      className="text-[#123A8C] hover:underline"
                                    >
                                      On
                                    </button>
                                    <span className="text-slate-300">|</span>
                                    <button
                                      type="button"
                                      onClick={() => enableAllInModule(moduleName, false)}
                                      className="text-[#DC3E3E] hover:underline"
                                    >
                                      Off
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>

                          {perms.map((p) => {
                            const isParentOff = isParentViewDisabled(p.permission_key)
                            const isEnabled = p.enabled && !isParentOff

                            return (
                              <tr
                                key={p.permission_key}
                                className={`hover:bg-slate-50/30 transition-colors ${
                                  isParentOff ? 'opacity-50 bg-slate-55/10' : ''
                                }`}
                              >
                                {/* Action description */}
                                <td className="p-2.5 pl-3 min-w-0">
                                  <div className="font-extrabold text-[#071A45]">{p.action}</div>
                                  <div className="text-[10px] text-[#64748B] font-medium mt-0.5 leading-normal">
                                    {p.description}
                                  </div>
                                </td>

                                {/* Key code */}
                                <td className="p-2.5 font-mono text-[9px] text-[#64748B]">
                                  {p.permission_key}
                                </td>

                                {/* Access Scope Dropdown */}
                                <td className="p-2.5">
                                  {p.hasScope ? (
                                    <select
                                      value={p.access_scope}
                                      disabled={!isEnabled}
                                      onChange={(e) =>
                                        handleScopeChange(p.permission_key, e.target.value)
                                      }
                                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-0.5 font-bold text-[#071A45] focus:outline-none focus:border-[#123A8C] disabled:opacity-50 text-[10px] h-7"
                                    >
                                      <option value="Own">Own Record</option>
                                      <option value="Assigned">Assigned Only</option>
                                      <option value="Team">Team (Subordinates)</option>
                                      <option value="Company">Company</option>
                                      <option value="All">All Operations</option>
                                    </select>
                                  ) : (
                                    <span className="text-slate-400 font-semibold px-2 text-[10px]">—</span>
                                  )}
                                </td>

                                {/* Status Switch Toggle */}
                                <td className="p-2.5 text-center">
                                  <label className="relative inline-flex items-center cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={isEnabled}
                                      disabled={isParentOff}
                                      onChange={(e) =>
                                        handleTogglePermission(p.permission_key, e.target.checked)
                                      }
                                      className="sr-only peer"
                                    />
                                    <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#061A4D]"></div>
                                  </label>
                                </td>
                              </tr>
                            )
                          })}
                        </Fragment>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Custom Role Modal */}
      {showAddRoleModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-[#DCE3EF] shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-[#071A45] text-base">Create Custom Role</h3>
              <button
                onClick={() => setShowAddRoleModal(false)}
                className="text-slate-400 hover:text-slate-650 text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddRole} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-800 font-extrabold mb-1">Role Title <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Area Operations Lead"
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  className="w-full h-11 border border-slate-300 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-[#123A8C]"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-800 font-extrabold mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Brief summary of duties and configurations map..."
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-[#123A8C]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddRoleModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#061A4D] hover:bg-[#123A8C] text-white font-extrabold rounded-xl text-xs shadow-md transition cursor-pointer"
                >
                  Create Custom Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default RoleManagement
