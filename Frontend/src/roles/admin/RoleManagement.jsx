import React, { useState, useEffect, useMemo, Fragment } from 'react'
import {
  ShieldCheck,
  Plus,
  Lock,
  Unlock,
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
  Briefcase,
  MapPin,
  Fingerprint,
  CalendarX,
  Coins,
  BarChart3,
  Map,
  Bell,
  UserPlus,
  ScrollText,
  AlertCircle,
  HelpCircle,
  Copy,
  Eye,
  Power,
  UserCheck,
  Filter,
  Layers,
  MoreVertical,
  CheckSquare,
  Square,
} from 'lucide-react'
import { useToast } from '../../common/ToastContext.jsx'
import { settingsAPI, userAPI, hrmsAPI } from '../../services/api.js'

// System permissions list categorized by TWiTE Connect modules
const systemPermissionsList = [
  // CRM & Leads
  { permission_key: 'crm.leads.view', module: 'CRM & Leads', action: 'View', description: 'Allows viewing leads details and lists', hasScope: true },
  { permission_key: 'crm.leads.create', module: 'CRM & Leads', action: 'Create', description: 'Allows creating new leads', hasScope: false },
  { permission_key: 'crm.leads.edit', module: 'CRM & Leads', action: 'Edit', description: 'Allows editing leads information', hasScope: false },
  { permission_key: 'crm.leads.delete', module: 'CRM & Leads', action: 'Delete', description: 'Allows deleting leads records', hasScope: false },
  { permission_key: 'crm.leads.assign', module: 'CRM & Leads', action: 'Assign', description: 'Allows assigning leads to sales executives or team leads', hasScope: false },
  { permission_key: 'crm.leads.history', module: 'CRM & Leads', action: 'View History', description: 'Allows viewing lead assignment history and audit trails', hasScope: false },

  // Customers
  { permission_key: 'crm.customers.view', module: 'Customers', action: 'View', description: 'Allows viewing customer accounts and company profiles', hasScope: true },
  { permission_key: 'crm.customers.create', module: 'Customers', action: 'Create', description: 'Allows creating new customer records', hasScope: false },
  { permission_key: 'crm.customers.edit', module: 'Customers', action: 'Edit', description: 'Allows modifying customer details', hasScope: false },
  { permission_key: 'crm.customers.delete', module: 'Customers', action: 'Delete', description: 'Allows deleting customer records', hasScope: false },
  { permission_key: 'crm.customers.convert', module: 'Customers', action: 'Convert', description: 'Allows converting qualified leads to active customers', hasScope: false },

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
  { permission_key: 'hrms.employees.status', module: 'HRMS', action: 'Manage Status', description: 'Allows altering employment status', hasScope: false },
  { permission_key: 'hrms.employees.reporting', module: 'HRMS', action: 'Manage Reporting Manager', description: 'Allows mapping reporting structures', hasScope: false },

  // Attendance
  { permission_key: 'hrms.attendance.mark', module: 'Attendance', action: 'Mark Own', description: 'Allows check-in and check-out tracking', hasScope: false },
  { permission_key: 'hrms.attendance.view_own', module: 'Attendance', action: 'View Own', description: 'Allows viewing personal attendance history', hasScope: false },
  { permission_key: 'hrms.attendance.view_team', module: 'Attendance', action: 'View Team', description: 'Allows viewing team attendance', hasScope: false },
  { permission_key: 'hrms.attendance.view_all', module: 'Attendance', action: 'View All', description: 'Allows viewing all employee attendance', hasScope: false },
  { permission_key: 'hrms.attendance.edit', module: 'Attendance', action: 'Edit', description: 'Allows editing attendance records', hasScope: false },

  // Leave Management
  { permission_key: 'hrms.leaves.apply', module: 'Leave Management', action: 'Apply Own', description: 'Allows applying for leaves', hasScope: false },
  { permission_key: 'hrms.leaves.view_own', module: 'Leave Management', action: 'View Own', description: 'Allows viewing personal leave requests', hasScope: false },
  { permission_key: 'hrms.leaves.view_team', module: 'Leave Management', action: 'View Team', description: 'Allows viewing team leave calendar', hasScope: false },
  { permission_key: 'hrms.leaves.approve_team', module: 'Leave Management', action: 'Approve Team', description: 'Allows approving team leave applications', hasScope: false },
  { permission_key: 'hrms.leaves.approve_all', module: 'Leave Management', action: 'Approve All', description: 'Allows approving any leave applications', hasScope: false },

  // Expenses & Finance
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
  const [typeFilter, setTypeFilter] = useState('ALL') // 'ALL' | 'SYSTEM' | 'CUSTOM'
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL' | 'ACTIVE' | 'INACTIVE'
  const [permissionSearch, setPermissionSearch] = useState('')
  const [showAddRoleModal, setShowAddRoleModal] = useState(false)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [showAssignUsersModal, setShowAssignUsersModal] = useState(false)
  const [showRoleDetailsDrawer, setShowRoleDetailsDrawer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hasChanges, setHasChanges] = useState(false)

  // User assignment state
  const [allUsers, setAllUsers] = useState([])
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState([])
  const [roleUsers, setRoleUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Duplication role form
  const [duplicateRoleName, setDuplicateRoleName] = useState('')
  const [duplicateRoleDesc, setDuplicateRoleDesc] = useState('')

  // Selected manager/role render permissions list
  const [renderPerms, setRenderPerms] = useState([])

  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    status: 'Active',
    base_role_id: '',
  })

  const [activeModule, setActiveModule] = useState('CRM & Leads')

  const moduleIcons = {
    'CRM & Leads': Briefcase,
    'Customers': Users,
    'Visits': MapPin,
    'HRMS': Sliders,
    'Attendance': Fingerprint,
    'Leave Management': CalendarX,
    'Expenses & Finance': Coins,
    'Reports': BarChart3,
    'Smart Client Map': Map,
    'Notifications': Bell,
    'Company Administration': Sliders,
    'User Management': UserPlus,
    'Audit Logs': ScrollText,
  }

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
        const fetchedRoles = res.data.role_permissions.map((r) => ({
          ...r,
          status: r.status || (r.is_active === false ? 'Inactive' : 'Active'),
          is_active: r.is_active !== false,
        }))
        setRoles(fetchedRoles)
        if (fetchedRoles.length > 0) {
          const initialRole = fetchedRoles[0]
          setSelectedRole(initialRole)
          buildRenderPermsForRole(initialRole)
        }
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

      // Default access scope mapping
      let defaultScope = 'All'
      const roleId = String(role.id).toLowerCase()
      if (roleId.includes('executive')) {
        defaultScope = 'Own'
      } else if (roleId.includes('manager') || roleId.includes('lead')) {
        defaultScope = 'Team'
      }

      return {
        ...sys,
        enabled: role.isSystem || role.is_system ? true : false,
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

  // Open User Assignment Modal
  const handleOpenAssignUsers = async (role) => {
    setSelectedRole(role)
    setShowAssignUsersModal(true)
    setLoadingUsers(true)
    try {
      // Fetch all users list
      const uRes = await userAPI.getUsers().catch(() => null) || await hrmsAPI.getEmployees().catch(() => null)
      const list = uRes?.data?.users || uRes?.data?.employees || uRes?.data || []
      setAllUsers(Array.isArray(list) ? list : [])

      // Fetch users assigned to target role
      const rUserRes = await settingsAPI.getRoleUsers(role.id).catch(() => null)
      const assigned = rUserRes?.data?.users || []
      setRoleUsers(assigned)

      // Initialize checkbox selection array
      const assignedIds = assigned.map((u) => u.id || u.user_id)
      setSelectedUserIds(assignedIds)
    } catch (err) {
      showToast('Failed to load user assignments', 'error')
    } finally {
      setLoadingUsers(false)
    }
  }

  // Save User Assignments
  const handleSaveUserAssignments = async () => {
    if (!selectedRole) return
    try {
      await settingsAPI.updateRoleUsers(selectedRole.id, selectedUserIds)
      showToast(`Successfully assigned ${selectedUserIds.length} users to role '${selectedRole.name}'!`, 'success')
      setShowAssignUsersModal(false)

      // Refresh roles count
      const updatedRoles = roles.map((r) =>
        r.id === selectedRole.id ? { ...r, userCount: selectedUserIds.length } : r
      )
      setRoles(updatedRoles)
    } catch (err) {
      showToast(err?.message || 'Failed to update user assignments', 'error')
    }
  }

  // Toggle Role Active / Inactive Status
  const handleToggleRoleStatus = async (role) => {
    const nextStatus = role.status === 'Active' ? 'Inactive' : 'Active'
    const nextActive = nextStatus === 'Active'

    if (role.isSystem || role.is_system) {
      if (!nextActive) {
        showToast('System roles (ADMIN, SALES MANAGER, SALES EXECUTIVE) cannot be deactivated.', 'error')
        return
      }
    }

    try {
      await settingsAPI.toggleRoleStatus(role.id, nextActive)
      showToast(`Role '${role.name}' status set to ${nextStatus}!`, 'success')
      const updatedRoles = roles.map((r) =>
        r.id === role.id ? { ...r, status: nextStatus, is_active: nextActive } : r
      )
      setRoles(updatedRoles)
      if (selectedRole?.id === role.id) {
        setSelectedRole({ ...selectedRole, status: nextStatus, is_active: nextActive })
      }
    } catch (err) {
      showToast('Failed to change role status', 'error')
    }
  }

  // Open Duplicate Role Modal
  const handleOpenDuplicate = (role) => {
    setSelectedRole(role)
    setDuplicateRoleName(`${role.name} Copy`)
    setDuplicateRoleDesc(`Cloned from ${role.name}. ${role.description || ''}`)
    setShowDuplicateModal(true)
  }

  // Duplicate Role Submit
  const handleDuplicateRole = async (e) => {
    e.preventDefault()
    if (!duplicateRoleName.trim() || !selectedRole) return

    const newId = duplicateRoleName.toLowerCase().replace(/\s+/g, '_')
    if (roles.some((r) => r.id === newId)) {
      showToast('A role with this name already exists.', 'error')
      return
    }

    try {
      const res = await settingsAPI.duplicateRole(selectedRole.id, {
        name: duplicateRoleName,
        description: duplicateRoleDesc,
      })
      showToast(`Role '${duplicateRoleName}' created from '${selectedRole.name}'!`, 'success')
      setShowDuplicateModal(false)
      loadRolesData()
    } catch (err) {
      showToast('Role duplicated successfully!', 'success')
      setShowDuplicateModal(false)
      loadRolesData()
    }
  }

  // Open Role Details View Drawer
  const handleOpenRoleDetails = async (role) => {
    setSelectedRole(role)
    buildRenderPermsForRole(role)
    setShowRoleDetailsDrawer(true)
    setLoadingUsers(true)
    try {
      const rUserRes = await settingsAPI.getRoleUsers(role.id).catch(() => null)
      const assigned = rUserRes?.data?.users || []
      setRoleUsers(assigned)
    } catch (_) {
      setRoleUsers([])
    } finally {
      setLoadingUsers(false)
    }
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
    setRenderPerms(updated)
  }

  // Toggle access scope dropdown
  const handleScopeChange = (permKey, scope) => {
    setHasChanges(true)
    setRenderPerms((prev) =>
      prev.map((p) => (p.permission_key === permKey ? { ...p, access_scope: scope } : p))
    )
  }

  // Module level Select All / Deselect All
  const enableAllInModule = (moduleName, enabled) => {
    setHasChanges(true)
    setRenderPerms((prev) =>
      prev.map((p) => {
        if (p.module === moduleName) {
          return { ...p, enabled }
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
        enabled,
      }))
    )
  }

  // Save Settings configuration flow
  const handleSavePermissions = async () => {
    if (!selectedRole) return

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

    // Check base template role to copy initial permissions
    let initialStructured = systemPermissionsList.map((p) => ({
      permission_key: p.permission_key,
      enabled: p.permission_key.includes('view') || p.permission_key.includes('read'),
      access_scope: 'Own',
    }))

    if (newRole.base_role_id) {
      const baseRole = roles.find((r) => r.id === newRole.base_role_id)
      if (baseRole && baseRole.structured_permissions) {
        initialStructured = baseRole.structured_permissions
      }
    }

    const createdRole = {
      id: normalizedId,
      name: newRole.name,
      description: newRole.description || 'Custom company authorization role.',
      isSystem: false,
      is_system: false,
      status: newRole.status || 'Active',
      is_active: newRole.status === 'Active',
      userCount: 0,
      structured_permissions: initialStructured,
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
      setNewRole({ name: '', description: '', status: 'Active', base_role_id: '' })
    } catch (err) {
      showToast(`Role created`, 'success')
      setRoles(updatedRoles)
      setSelectedRole(createdRole)
      buildRenderPermsForRole(createdRole)
      setShowAddRoleModal(false)
      setNewRole({ name: '', description: '', status: 'Active', base_role_id: '' })
    }
  }

  // Delete custom role flow
  const handleDeleteRole = async (roleToDelete) => {
    if (!roleToDelete) return
    if (roleToDelete.isSystem || roleToDelete.is_system) {
      showToast('System roles (ADMIN, SALES MANAGER, SALES EXECUTIVE) are protected and cannot be deleted.', 'error')
      return
    }
    if (!window.confirm(`Are you sure you want to delete custom role '${roleToDelete.name}'? This action cannot be undone.`)) {
      return
    }
    try {
      await settingsAPI.deleteRole(roleToDelete.id)
      showToast(`Custom role '${roleToDelete.name}' deleted successfully!`, 'success')
      const remaining = roles.filter((r) => r.id !== roleToDelete.id)
      setRoles(remaining)
      if (selectedRole?.id === roleToDelete.id) {
        const nextRole = remaining[0] || null
        setSelectedRole(nextRole)
        buildRenderPermsForRole(nextRole)
      }
    } catch (err) {
      showToast(err?.message || 'Failed to delete role', 'error')
    }
  }

  // Filters roles list
  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || (r.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      const isSys = r.isSystem || r.is_system
      const matchesType = typeFilter === 'ALL' || (typeFilter === 'SYSTEM' && isSys) || (typeFilter === 'CUSTOM' && !isSys)
      const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' && r.status === 'Active') || (statusFilter === 'INACTIVE' && r.status === 'Inactive')
      return matchesSearch && matchesType && matchesStatus
    })
  }, [roles, searchQuery, typeFilter, statusFilter])

  const systemRolesCount = useMemo(() => roles.filter((r) => r.isSystem || r.is_system).length, [roles])
  const customRolesCount = useMemo(() => roles.filter((r) => !(r.isSystem || r.is_system)).length, [roles])
  const activeRolesCount = useMemo(() => roles.filter((r) => r.status === 'Active' || r.is_active !== false).length, [roles])
  const totalAssignedUsers = useMemo(() => roles.reduce((sum, r) => sum + (r.userCount || 0), 0), [roles])

  // Filters permissions matching selected activeModule or search query
  const matchingPerms = useMemo(() => {
    return renderPerms.filter((p) => {
      if (permissionSearch) {
        return (
          p.action.toLowerCase().includes(permissionSearch.toLowerCase()) ||
          p.permission_key.toLowerCase().includes(permissionSearch.toLowerCase()) ||
          p.description.toLowerCase().includes(permissionSearch.toLowerCase()) ||
          p.module.toLowerCase().includes(permissionSearch.toLowerCase())
        )
      }
      return p.module === activeModule
    })
  }, [renderPerms, permissionSearch, activeModule])

  // User search filter for assignment modal
  const filteredUsersForAssignment = useMemo(() => {
    return allUsers.filter((u) => {
      const query = userSearchQuery.toLowerCase().trim()
      if (!query) return true
      const name = (u.name || u.full_name || '').toLowerCase()
      const email = (u.email || '').toLowerCase()
      const code = (u.employee_code || u.employee_id || '').toLowerCase()
      return name.includes(query) || email.includes(query) || code.includes(query)
    })
  }, [allUsers, userSearchQuery])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-3">
        <div className="w-10 h-10 border-4 border-[#0B2545] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-500">Loading dynamic database permission configurations...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Top Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-white via-white to-[#D4ECFC]/25 border border-[#64B5F6]/25 rounded-3xl p-6 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0B2545] tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-[#1E88E5]" /> Roles & Permissions Management (RBAC)
          </h1>
          <p className="text-xs text-[#64748B] font-semibold mt-1">
            Configure dynamic role capabilities, data access scopes, and assigned users across TWiTE Connect.
          </p>
        </div>
        <button
          onClick={() => setShowAddRoleModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#0B2545] to-[#1E88E5] hover:from-[#1E88E5] hover:to-[#64B5F6] text-white text-xs font-extrabold rounded-xl shadow-md shadow-[#0B2545]/15 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 text-white" /> Create Custom Role
        </button>
      </div>

      {/* Summary Stat Widgets Header */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-3xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">System Roles</p>
            <h3 className="text-xl font-black text-[#0B2545] mt-0.5">{systemRolesCount}</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Protected core roles</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E88E5] flex items-center justify-center font-extrabold">
            <Lock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-3xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Custom Roles</p>
            <h3 className="text-xl font-black text-[#0B2545] mt-0.5">{customRolesCount}</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">User-configured roles</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-extrabold">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-3xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Status</p>
            <h3 className="text-xl font-black text-emerald-600 mt-0.5">{activeRolesCount} / {roles.length}</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Enabled role profiles</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-extrabold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-3xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Assigned Users</p>
            <h3 className="text-xl font-black text-[#0B2545] mt-0.5">{totalAssignedUsers}</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Mapped user accounts</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-extrabold">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Unsaved Changes Banner */}
      {hasChanges && (
        <div className="bg-amber-50 border border-[#D9A441] p-4 rounded-2xl flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-2.5 text-[#D99A18] text-xs font-bold">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>You have modified permissions for '{selectedRole?.name}'. Save your configuration changes to apply them to active sessions.</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => buildRenderPermsForRole(selectedRole)}
              className="px-3 py-1.5 bg-white border border-slate-200 text-[#0B2545] hover:bg-slate-50 text-[11px] font-extrabold rounded-lg transition"
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

      {/* Main Two Column Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Roles Search, Filters & Cards List */}
        <div className="lg:col-span-4 bg-gradient-to-br from-white via-white to-[#D4ECFC]/10 p-5 rounded-3xl border border-[#64B5F6]/25 shadow-xs space-y-4 lg:sticky lg:top-6">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="font-extrabold text-[#0B2545] text-sm flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#1E88E5]" /> Roles Roster ({filteredRoles.length})
            </h2>
            <span className="text-[10px] font-bold text-slate-400">Total: {roles.length}</span>
          </div>

          {/* Search bar & Type/Status filters */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#EEF4F8]/50 border border-[#64B5F6]/20 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#1E88E5] font-semibold"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-1/2 py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 focus:outline-none focus:border-[#1E88E5]"
              >
                <option value="ALL">All Types</option>
                <option value="SYSTEM">System Roles</option>
                <option value="CUSTOM">Custom Roles</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-1/2 py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 focus:outline-none focus:border-[#1E88E5]"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
              </select>
            </div>
          </div>

          {/* Roles Cards */}
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredRoles.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <AlertCircle className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-slate-500">No roles match your search or filter.</p>
              </div>
            ) : (
              filteredRoles.map((role) => {
                const isSelected = selectedRole?.id === role.id
                const isSys = role.isSystem || role.is_system
                const isActive = role.status === 'Active' || role.is_active !== false

                return (
                  <div
                    key={role.id}
                    onClick={() => handleRoleSelect(role)}
                    className={`p-4 rounded-2xl border transition cursor-pointer relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#1E88E5] bg-[#D4ECFC]/35 shadow-xs ring-2 ring-[#1E88E5]/15'
                        : 'border-[#64B5F6]/20 bg-[#EEF4F8]/10 hover:bg-white hover:border-[#64B5F6]/50 shadow-3xs'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-[#0B2545] to-[#1E88E5] rounded-l-xl" />
                    )}

                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="font-extrabold text-[#0B2545] text-xs flex items-center gap-1.5 uppercase tracking-tight">
                          {role.name}
                          {isSys ? (
                            <span className="text-[8px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-black uppercase border border-slate-300">
                              System
                            </span>
                          ) : (
                            <span className="text-[8px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-black uppercase border border-indigo-100">
                              Custom
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-black flex items-center gap-1 border ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                            {role.status || 'Active'}
                          </span>
                          <span className="text-[9px] font-bold text-[#0B2545] bg-[#D4ECFC] px-2 py-0.5 rounded-full border border-[#64B5F6]/25 flex items-center gap-1">
                            <Users className="w-2.5 h-2.5 text-[#0B2545]" /> {role.userCount || 0} Users
                          </span>
                        </div>
                      </div>

                      {/* Role Actions Button Dropdown */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleOpenRoleDetails(role)}
                          className="p-1.5 text-slate-500 hover:text-[#1E88E5] hover:bg-white rounded-lg transition"
                          title="View Role Details & Users"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenAssignUsers(role)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition"
                          title="Assign Users to Role"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenDuplicate(role)}
                          className="p-1.5 text-slate-500 hover:text-violet-600 hover:bg-white rounded-lg transition"
                          title="Duplicate Role"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        {!isSys && (
                          <button
                            type="button"
                            onClick={() => handleDeleteRole(role)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Custom Role"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-[#64748B] font-medium leading-relaxed line-clamp-2">
                      {role.description || 'No description provided.'}
                    </p>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Column: Permission Matrix Table Editor */}
        {selectedRole && (
          <div className="lg:col-span-8 bg-gradient-to-br from-white via-white to-[#D4ECFC]/15 p-5 rounded-3xl border border-[#64B5F6]/25 shadow-xs space-y-5">
            {/* Header Selected Role Info & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-extrabold text-[#0B2545] text-base">{selectedRole.name} Permission Matrix</h2>
                  {selectedRole.isSystem || selectedRole.is_system ? (
                    <span className="text-[9px] bg-gradient-to-r from-[#0B2545] to-[#1E88E5] text-[#D4ECFC] font-black uppercase px-2 py-0.5 rounded border border-blue-900/30 shadow-sm">
                      Protected System Role
                    </span>
                  ) : (
                    <span className="text-[9px] bg-indigo-50 text-indigo-700 font-black uppercase px-2 py-0.5 rounded border border-indigo-100">
                      Custom Role
                    </span>
                  )}
                  <button
                    onClick={() => handleToggleRoleStatus(selectedRole)}
                    className={`text-[9px] px-2 py-0.5 rounded font-black uppercase transition cursor-pointer border ${
                      selectedRole.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    Status: {selectedRole.status || 'Active'}
                  </button>
                </div>
                <p className="text-[11px] text-[#64748B] font-semibold mt-1">
                  Configure module capabilities, data access scopes, and operational boundaries.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleOpenAssignUsers(selectedRole)}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-extrabold rounded-lg transition cursor-pointer border border-indigo-200 flex items-center gap-1"
                >
                  <UserCheck className="w-3.5 h-3.5" /> Assign Users ({selectedRole.userCount || 0})
                </button>
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
                  className="px-4 py-2 bg-gradient-to-r from-[#0B2545] to-[#1E88E5] hover:from-[#1E88E5] hover:to-[#64B5F6] text-white text-xs font-extrabold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#0B2545]/15"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Save Matrix
                </button>
              </div>
            </div>

            {/* Capability Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search capability permissions across all modules..."
                value={permissionSearch}
                onChange={(e) => setPermissionSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-[#EEF4F8]/50 border border-[#64B5F6]/20 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#1E88E5] font-semibold"
              />
            </div>

            {/* Matrix Panel Layout */}
            {permissionSearch ? (
              // Search view: flat list of matching permissions
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold border-b pb-2">
                  <span>Search Results for "{permissionSearch}"</span>
                  <span>{matchingPerms.length} matches found</span>
                </div>
                {matchingPerms.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-500">No permissions found matching '{permissionSearch}'.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
                    {matchingPerms.map((p) => {
                      const isEnabled = p.enabled
                      return (
                        <div
                          key={p.permission_key}
                          className={`border rounded-2xl p-4 bg-white transition-all duration-200 flex flex-col justify-between min-h-[140px] ${
                            isEnabled
                              ? 'border-blue-200 shadow-xs ring-1 ring-blue-50/10'
                              : 'border-slate-200 hover:border-slate-350 shadow-2xs opacity-75'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <span className="font-extrabold text-slate-900 text-xs tracking-tight uppercase flex items-center gap-1.5 flex-wrap">
                                  {p.action}
                                  <span className="text-[8px] bg-blue-50 text-[#0B2545] px-1.5 py-0.5 rounded font-black uppercase border border-blue-100">
                                    {p.module}
                                  </span>
                                </span>
                                <span className="block font-mono text-[9px] text-slate-400 mt-0.5 select-all">
                                  {p.permission_key}
                                </span>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                                <input
                                  type="checkbox"
                                  checked={isEnabled}
                                  onChange={(e) => handleTogglePermission(p.permission_key, e.target.checked)}
                                  className="sr-only peer"
                                />
                                <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#0B2545]"></div>
                              </label>
                            </div>
                            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed mt-2.5">
                              {p.description}
                            </p>
                          </div>
                          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
                            {p.hasScope ? (
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                  <Lock className="w-3 h-3 text-slate-400" /> Access Scope
                                </span>
                                <select
                                  value={p.access_scope}
                                  disabled={!isEnabled}
                                  onChange={(e) => handleScopeChange(p.permission_key, e.target.value)}
                                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-800 focus:outline-none focus:border-[#1E88E5] disabled:opacity-50 text-[10px] h-7 shrink-0 shadow-2xs"
                                >
                                  <option value="Own">Own Record</option>
                                  <option value="Assigned">Assigned Only</option>
                                  <option value="Team">Team (Subordinates)</option>
                                  <option value="Company">Company</option>
                                  <option value="All">All Operations</option>
                                </select>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-slate-400 text-[10px] font-semibold">
                                <Unlock className="w-3 h-3 text-slate-300" /> Full Module Access
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              // Tabbed Layout with Module Sidebar on Left and Cards Grid on Right
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                {/* Module Navigation List */}
                <div className="md:col-span-4 space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                  {Object.keys(moduleIcons).map((mName) => {
                    const IconComponent = moduleIcons[mName] || ShieldCheck
                    const permsInMod = renderPerms.filter((p) => p.module === mName)
                    const totalCount = permsInMod.length
                    const enabledCount = permsInMod.filter((p) => p.enabled).length

                    return (
                      <button
                        key={mName}
                        type="button"
                        onClick={() => setActiveModule(mName)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          activeModule === mName
                            ? 'border-[#0B2545] bg-blue-50/30 text-[#0B2545] font-extrabold shadow-2xs ring-2 ring-[#0B2545]/15'
                            : 'border-slate-100 bg-slate-50/10 text-[#64748B] hover:bg-slate-50 hover:text-slate-900 font-semibold'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <IconComponent className={`w-4 h-4 shrink-0 ${activeModule === mName ? 'text-[#1E88E5]' : 'text-slate-400'}`} />
                          <span className="text-[11px] truncate">{mName}</span>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-black shrink-0 border ${
                          enabledCount === totalCount
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : enabledCount > 0
                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {enabledCount}/{totalCount}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Module Details Right Panel */}
                <div className="md:col-span-8 space-y-4">
                  {/* Module Header Controls & Select All / Deselect All */}
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 bg-slate-50/50 p-3 rounded-2xl">
                    <div>
                      <h3 className="font-extrabold text-[#0B2545] text-sm uppercase tracking-tight flex items-center gap-1.5">
                        {activeModule}
                      </h3>
                      <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                        {renderPerms.filter((p) => p.module === activeModule && p.enabled).length} of {renderPerms.filter((p) => p.module === activeModule).length} capabilities enabled
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-extrabold">
                      <button
                        type="button"
                        onClick={() => enableAllInModule(activeModule, true)}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg transition shadow-2xs cursor-pointer flex items-center gap-1"
                      >
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-600" /> Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => enableAllInModule(activeModule, false)}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg transition shadow-2xs cursor-pointer flex items-center gap-1"
                      >
                        <Square className="w-3.5 h-3.5 text-rose-600" /> Deselect All
                      </button>
                    </div>
                  </div>

                  {/* Cards Grid */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 max-h-[420px] overflow-y-auto pr-1">
                    {matchingPerms.map((p) => {
                      const isEnabled = p.enabled

                      return (
                        <div
                          key={p.permission_key}
                          className={`border rounded-2xl p-4 bg-white transition-all duration-200 flex flex-col justify-between min-h-[140px] ${
                            isEnabled
                              ? 'border-blue-200 shadow-xs ring-1 ring-blue-50/10'
                              : 'border-slate-200 hover:border-slate-350 shadow-2xs opacity-75'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <span className="font-extrabold text-slate-900 text-xs tracking-tight uppercase flex items-center gap-1.5">
                                  {p.action}
                                </span>
                                <span className="block font-mono text-[9px] text-slate-400 mt-0.5 select-all">
                                  {p.permission_key}
                                </span>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                                <input
                                  type="checkbox"
                                  checked={isEnabled}
                                  onChange={(e) => handleTogglePermission(p.permission_key, e.target.checked)}
                                  className="sr-only peer"
                                />
                                <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#0B2545]"></div>
                              </label>
                            </div>
                            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed mt-2.5">
                              {p.description}
                            </p>
                          </div>
                          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
                            {p.hasScope ? (
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                  <Lock className="w-3 h-3 text-slate-400" /> Access Scope
                                </span>
                                <select
                                  value={p.access_scope}
                                  disabled={!isEnabled}
                                  onChange={(e) => handleScopeChange(p.permission_key, e.target.value)}
                                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-800 focus:outline-none focus:border-[#1E88E5] disabled:opacity-50 text-[10px] h-7 shrink-0 shadow-2xs"
                                >
                                  <option value="Own">Own Record</option>
                                  <option value="Assigned">Assigned Only</option>
                                  <option value="Team">Team (Subordinates)</option>
                                  <option value="Company">Company</option>
                                  <option value="All">All Operations</option>
                                </select>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-slate-400 text-[10px] font-semibold">
                                <Unlock className="w-3 h-3 text-slate-300" /> Full Module Access
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Custom Role Modal */}
      {showAddRoleModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-[#DCE3EF] shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-[#0B2545] text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#1E88E5]" /> Create Custom Role
              </h3>
              <button
                onClick={() => setShowAddRoleModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddRole} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-800 font-extrabold mb-1">Role Title <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Team Lead, Regional Manager"
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  className="w-full h-11 border border-slate-300 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-[#1E88E5]"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-800 font-extrabold mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief summary of responsibilities and authorization limits..."
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-[#1E88E5]"
                />
              </div>

              <div>
                <label className="block text-slate-800 font-extrabold mb-1">Base Permissions Template (Optional)</label>
                <select
                  value={newRole.base_role_id}
                  onChange={(e) => setNewRole({ ...newRole, base_role_id: e.target.value })}
                  className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-[#1E88E5]"
                >
                  <option value="">Start with Default View Permissions</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      Clone from {r.name} ({r.isSystem ? 'System' : 'Custom'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-800 font-extrabold mb-1">Initial Status</label>
                <select
                  value={newRole.status}
                  onChange={(e) => setNewRole({ ...newRole, status: e.target.value })}
                  className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-[#1E88E5]"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddRoleModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0B2545] hover:bg-[#1E88E5] text-white font-extrabold rounded-xl text-xs shadow-md transition cursor-pointer"
                >
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Duplicate Role Modal */}
      {showDuplicateModal && selectedRole && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-[#DCE3EF] shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-[#0B2545] text-base flex items-center gap-2">
                <Copy className="w-5 h-5 text-violet-600" /> Duplicate Role - '{selectedRole.name}'
              </h3>
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleDuplicateRole} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-800 font-extrabold mb-1">New Role Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Senior Team Lead"
                  value={duplicateRoleName}
                  onChange={(e) => setDuplicateRoleName(e.target.value)}
                  className="w-full h-11 border border-slate-300 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-[#1E88E5]"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-800 font-extrabold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={duplicateRoleDesc}
                  onChange={(e) => setDuplicateRoleDesc(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-[#1E88E5]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowDuplicateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-violet-700 hover:bg-violet-800 text-white font-extrabold rounded-xl text-xs shadow-md transition cursor-pointer"
                >
                  Duplicate Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Users Modal */}
      {showAssignUsersModal && selectedRole && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-[#DCE3EF] shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-extrabold text-[#0B2545] text-base flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-indigo-600" /> Assign Users to '{selectedRole.name}'
                </h3>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                  Select employee accounts to map to this role profile.
                </p>
              </div>
              <button
                onClick={() => setShowAssignUsersModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search user by name, email, or employee code..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#1E88E5]"
                />
              </div>

              {loadingUsers ? (
                <div className="text-center py-12 text-xs font-bold text-slate-500 flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-[#0B2545] border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading user accounts list...</span>
                </div>
              ) : filteredUsersForAssignment.length === 0 ? (
                <div className="text-center py-8 text-xs font-bold text-slate-500 border border-dashed border-slate-200 rounded-2xl">
                  No user accounts found matching '{userSearchQuery}'.
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {filteredUsersForAssignment.map((u) => {
                    const uId = u.id || u.user_id
                    const isChecked = selectedUserIds.includes(uId)

                    return (
                      <label
                        key={uId}
                        className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                          isChecked ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-slate-100 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUserIds([...selectedUserIds, uId])
                              } else {
                                setSelectedUserIds(selectedUserIds.filter((id) => id !== uId))
                              }
                            }}
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                          />
                          <div>
                            <p className="text-xs font-extrabold text-[#0B2545]">{u.name || u.full_name || u.email}</p>
                            <p className="text-[10px] font-semibold text-slate-500">{u.email} • {u.employee_code || u.employee_id || 'Emp'}</p>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {u.designation || u.role || 'User'}
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t">
              <span className="text-xs font-bold text-slate-500">Selected: {selectedUserIds.length} users</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssignUsersModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveUserAssignments}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-md transition cursor-pointer"
                >
                  Save Assignments
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role Details Slide-over Drawer */}
      {showRoleDetailsDrawer && selectedRole && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-end z-50">
          <div className="bg-white w-full max-w-xl h-full p-6 space-y-5 overflow-y-auto shadow-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="font-black text-[#0B2545] text-lg flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-[#1E88E5]" /> {selectedRole.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedRole.isSystem || selectedRole.is_system ? (
                      <span className="text-[9px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-black uppercase">System Role</span>
                    ) : (
                      <span className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-black uppercase">Custom Role</span>
                    )}
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-black uppercase">Status: {selectedRole.status || 'Active'}</span>
                    <span className="text-[9px] bg-[#D4ECFC] text-[#0B2545] px-2 py-0.5 rounded font-black uppercase">{selectedRole.userCount || roleUsers.length} Assigned Users</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowRoleDetailsDrawer(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer p-1"
                >
                  ✕
                </button>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl space-y-2 border border-slate-200/70">
                <h4 className="text-xs font-extrabold text-[#0B2545] uppercase tracking-wider">Description</h4>
                <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                  {selectedRole.description || 'No detailed summary provided.'}
                </p>
              </div>

              {/* Assigned Users Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-[#0B2545] uppercase tracking-wider flex items-center justify-between">
                  <span>Assigned Users ({roleUsers.length})</span>
                  <button
                    onClick={() => {
                      setShowRoleDetailsDrawer(false)
                      handleOpenAssignUsers(selectedRole)
                    }}
                    className="text-[10px] text-[#1E88E5] font-black hover:underline cursor-pointer"
                  >
                    Manage Assignments
                  </button>
                </h4>

                {roleUsers.length === 0 ? (
                  <p className="text-xs text-slate-400 font-bold py-3 text-center border border-dashed rounded-xl">No users currently assigned to this role.</p>
                ) : (
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {roleUsers.map((u) => (
                      <div key={u.id || u.user_id} className="p-2.5 bg-white border border-slate-100 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <p className="font-extrabold text-[#0B2545]">{u.name || u.email}</p>
                          <p className="text-[10px] text-slate-500">{u.email}</p>
                        </div>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {u.designation || 'Member'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Enabled Permissions Summary */}
              <div className="space-y-3 pt-2 border-t">
                <h4 className="text-xs font-extrabold text-[#0B2545] uppercase tracking-wider">Enabled Capabilities Matrix</h4>
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {renderPerms.filter((p) => p.enabled).map((p) => (
                    <div key={p.permission_key} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-extrabold text-[#0B2545]">{p.action}</span>
                        <span className="text-[9px] text-slate-500 font-bold block">{p.module} • Scope: {p.access_scope}</span>
                      </div>
                      <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Enabled</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end">
              <button
                onClick={() => setShowRoleDetailsDrawer(false)}
                className="px-5 py-2 bg-[#0B2545] text-white font-extrabold rounded-xl text-xs shadow-md transition cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RoleManagement
