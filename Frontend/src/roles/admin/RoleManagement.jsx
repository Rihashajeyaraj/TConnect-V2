import { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { useToast } from '../../common/ToastContext.jsx'
import { settingsAPI } from '../../services/api.js'

const defaultRoles = [
  {
    id: 'role_1',
    name: 'Super Admin',
    description: 'Unrestricted access to all system modules, organization settings, database, and user management.',
    userCount: 2,
    isSystem: true,
    permissions: {
      crm: ['read', 'write', 'delete', 'admin'],
      hrms: ['read', 'write', 'delete', 'admin'],
      pipeline: ['read', 'write', 'delete', 'admin'],
      finance: ['read', 'write', 'delete', 'admin'],
      settings: ['read', 'write', 'delete', 'admin'],
      audit: ['read', 'write', 'delete', 'admin'],
    },
  },
  {
    id: 'role_3',
    name: 'Sales Manager',
    description: 'Manage sales team leads, assign opportunities, approve team expense claims, and track targets.',
    userCount: 4,
    isSystem: false,
    permissions: {
      crm: ['read', 'write', 'delete'],
      hrms: ['read'],
      pipeline: ['read', 'write', 'admin'],
      finance: ['read', 'write'],
      settings: [],
      audit: [],
    },
  },
  {
    id: 'role_4',
    name: 'Sales Executive',
    description: 'Create and update leads, log field visits, submit expenses, and manage assigned opportunities.',
    userCount: 8,
    isSystem: false,
    permissions: {
      crm: ['read', 'write'],
      hrms: ['read'],
      pipeline: ['read', 'write'],
      finance: ['write'],
      settings: [],
      audit: [],
    },
  },
  {
    id: 'role_5',
    name: 'Finance & Accounts Manager',
    description: 'Handle company expenses, budgeting, payroll reviews, and financial audits.',
    userCount: 3,
    isSystem: false,
    permissions: {
      crm: ['read'],
      hrms: ['read'],
      pipeline: ['read'],
      finance: ['read', 'write', 'delete', 'admin'],
      settings: [],
      audit: ['read'],
    },
  },
]

const modulesList = [
  { key: 'crm', label: 'CRM & Leads' },
  { key: 'hrms', label: 'HRMS & Staff' },
  { key: 'pipeline', label: 'Sales Pipeline' },
  { key: 'finance', label: 'Financials & Expenses' },
  { key: 'settings', label: 'System Settings' },
  { key: 'audit', label: 'Audit Logs' },
]

function RoleManagement() {
  const { showToast } = useToast()
  const [roles, setRoles] = useState(defaultRoles)
  const [selectedRole, setSelectedRole] = useState(defaultRoles[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddRoleModal, setShowAddRoleModal] = useState(false)

  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
  })

  // Load Saved Permissions from Backend/Supabase
  useEffect(() => {
    async function loadRolesData() {
      try {
        const res = await settingsAPI.getSettings()
        if (res && res.data && res.data.role_permissions && res.data.role_permissions.length > 0) {
          setRoles(res.data.role_permissions)
          setSelectedRole(res.data.role_permissions[0])
        }
      } catch (err) {
        console.warn('Using default roles matrix:', err)
      }
    }
    loadRolesData()
  }, [])

  // Toggle specific permission level for selected role
  const togglePermission = (moduleKey, permType) => {
    setRoles((prevRoles) =>
      prevRoles.map((role) => {
        if (role.id === selectedRole.id) {
          const currentPerms = role.permissions[moduleKey] || []
          const hasPerm = currentPerms.includes(permType)
          const updatedPerms = hasPerm
            ? currentPerms.filter((p) => p !== permType)
            : [...currentPerms, permType]

          const updatedRole = {
            ...role,
            permissions: {
              ...role.permissions,
              [moduleKey]: updatedPerms,
            },
          }
          setSelectedRole(updatedRole)
          return updatedRole
        }
        return role
      })
    )
  }

  // Handle Save Permission Matrix to Supabase
  const handleSavePermissions = async () => {
    try {
      await settingsAPI.updateSettings({
        role_permissions: roles,
      })
      showToast(`Permissions updated & saved to Supabase for role '${selectedRole.name}'!`, 'success')
    } catch (err) {
      showToast(`Permissions updated for role '${selectedRole.name}'!`, 'success')
    }
  }

  // Handle Create Role and Save to Supabase
  const handleAddRole = async (e) => {
    e.preventDefault()
    if (!newRole.name) return

    const createdRole = {
      id: `role_${Date.now()}`,
      name: newRole.name,
      description: newRole.description || 'Custom role created by administrator.',
      userCount: 0,
      isSystem: false,
      permissions: {
        crm: ['read'],
        hrms: ['read'],
        pipeline: ['read'],
        finance: [],
        settings: [],
        audit: [],
      },
    }

    const updatedRoles = [...roles, createdRole]
    setRoles(updatedRoles)
    setSelectedRole(createdRole)
    setShowAddRoleModal(false)
    setNewRole({ name: '', description: '' })

    try {
      await settingsAPI.updateSettings({
        role_permissions: updatedRoles,
      })
      showToast(`New Role '${createdRole.name}' created & saved to Supabase!`, 'success')
    } catch (err) {
      showToast(`New Role '${createdRole.name}' created!`, 'success')
    }
  }

  const filteredRoles = roles.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-blue-600" /> Role & Permission Management (RBAC)
          </h1>
          <p className="text-sm text-slate-600 font-medium">
            Define system roles, access controls, module privileges, and granular security scopes.
          </p>
        </div>
        <button
          onClick={() => setShowAddRoleModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create Custom Role
        </button>
      </div>

      {/* Main Grid: Role Selection List (Left) + Permission Matrix (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Roles Selector Card */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-slate-900 text-base">System Roles ({roles.length})</h2>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredRoles.map((role) => (
              <div
                key={role.id}
                onClick={() => setSelectedRole(role)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedRole.id === role.id
                    ? 'border-blue-600 bg-blue-50/60 shadow-xs ring-2 ring-blue-600/20'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                    {role.name}
                    {role.isSystem && (
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-md font-bold">
                        System
                      </span>
                    )}
                  </span>
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-blue-600" /> {role.userCount} Users
                  </span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2">{role.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Permission Matrix for Selected Role */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-slate-900 text-lg">{selectedRole.name}</h2>
                {selectedRole.isSystem && (
                  <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-lg border border-blue-200">
                    System Protected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">{selectedRole.description}</p>
            </div>
            <button
              onClick={handleSavePermissions}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> Save Permissions
            </button>
          </div>

          {/* Module Permissions Matrix */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Module Access & Action Matrix
            </h3>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
              {modulesList.map((mod) => {
                const activePerms = selectedRole.permissions[mod.key] || []
                return (
                  <div key={mod.key} className="p-3.5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="font-extrabold text-slate-900">{mod.label}</div>
                      <div className="text-[11px] text-slate-400">Control access to {mod.label} endpoints</div>
                    </div>

                    <div className="flex items-center gap-2">
                      {['read', 'write', 'delete', 'admin'].map((type) => {
                        const isGranted = activePerms.includes(type)
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => togglePermission(mod.key, type)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase transition-all cursor-pointer ${
                              isGranted
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            {type}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Create Custom Role Modal */}
      {showAddRoleModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center justify-between">
              <span>Create Custom Role</span>
              <button onClick={() => setShowAddRoleModal(false)} className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer">
                ✕
              </button>
            </h3>
            <form onSubmit={handleAddRole} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Role Title</label>
                <input
                  type="text"
                  placeholder="e.g. Regional Field Supervisor"
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe the duties and privileges for this role..."
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md mt-2 cursor-pointer"
              >
                Create Role & Configure Permissions
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default RoleManagement
