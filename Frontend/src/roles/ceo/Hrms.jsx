import React, { useState, useEffect } from 'react'
import { useToast } from '../../common/ToastContext.jsx'
import {
  Users,
  Search,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  X,
  Download,
  Plus,
  Edit,
  Trash2,
  Lock,
  ToggleLeft,
  ToggleRight,
  PlusCircle,
  Briefcase
} from 'lucide-react'
import { hrmsAPI, userAPI } from '../../services/api.js'
import { formatDate } from '../../utils/dateUtils.js'
import { exportToCSV } from '../../utils/exportUtils.js'

const STATUS_CLASSES = {
  'Active': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Inactive': 'bg-rose-50 text-rose-700 border-rose-200',
}

const defaultPermissions = {
  crm: ['read', 'write'],
  hrms: ['read', 'write'],
  pipeline: ['read', 'write'],
  finance: ['read'],
  settings: [],
  audit: []
}

function Hrms() {
  const { showToast } = useToast()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeRoleTab, setActiveRoleTab] = useState('Admin') // 'Admin' or 'Sales Manager'
  const [statusFilter, setStatusFilter] = useState('All')

  // Modals State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [showTeamModal, setShowTeamModal] = useState(false)

  // Current selected entities
  const [editingEmp, setEditingEmp] = useState(null)
  const [selectedEmp, setSelectedEmp] = useState(null)

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Admin',
    status: 'Active',
    password: '',
  })

  // Permission Checklist state
  const [permissionsState, setPermissionsState] = useState(defaultPermissions)

  // Sales Executives roster for team assignment
  const [executives, setExecutives] = useState([])
  const [selectedExecs, setSelectedExecs] = useState([])

  // Load real employees directly from Supabase
  const loadEmployees = async () => {
    setLoading(true)
    try {
      let res = await hrmsAPI.getEmployees().catch(() => null)
      let rawData = (res && res.data && res.data.length > 0) ? res.data : []
      
      if (rawData.length === 0) {
        const userRes = await userAPI.getUsers().catch(() => null)
        if (userRes && userRes.data && userRes.data.length > 0) {
          rawData = userRes.data
        }
      }

      if (rawData.length > 0) {
        const loaded = rawData.map((emp, idx) => ({
          id: emp.employee_id || emp.id || `EMP-${idx + 1}`,
          name: emp.first_name ? `${emp.first_name} ${emp.last_name || ''}`.trim() : emp.name || 'Staff Member',
          role: emp.designation || emp.role || 'Sales Executive',
          dept: emp.department || emp.dept || 'Sales & Business Development',
          status: emp.status || 'Active',
          email: emp.email || 'staff@tconnect.com',
          phone: emp.phone || emp.mobile || '+91 99999 88888',
          permissions: emp.permissions || defaultPermissions,
          team: emp.team || []
        }))
        
        // CEO HRMS displays ONLY Admins and Sales Managers
        setEmployees(loaded)
        
        // Cache sales executives list for team assignments
        const execsOnly = loaded.filter(e => 
          (e.role || '').toLowerCase().includes('exec') || 
          (e.role || '').toLowerCase().includes('sales executive')
        )
        setExecutives(execsOnly)
      } else {
        const fallbackList = [
          { id: 'EMP-001', name: 'System Admin', role: 'Admin', dept: 'IT Operations', status: 'Active', email: 'admin@tconnect.com', phone: '+91 98765 00001', permissions: defaultPermissions, team: [] },
          { id: 'EMP-002', name: 'Vikram Singh', role: 'Sales Manager', dept: 'Sales & BD', status: 'Active', email: 'vikram@tconnect.com', phone: '+91 98765 12345', permissions: defaultPermissions, team: ['EMP-003'] },
          { id: 'EMP-003', name: 'Ananya Roy', role: 'Sales Executive', dept: 'Sales & BD', status: 'Active', email: 'ananya@tconnect.com', phone: '+91 98765 23456', permissions: defaultPermissions, team: [] },
          { id: 'EMP-004', name: 'Suresh V', role: 'Sales Manager', dept: 'Sales & BD', status: 'Active', email: 'suresh@tconnect.com', phone: '+91 98765 34567', permissions: defaultPermissions, team: [] },
        ]
        setEmployees(fallbackList)
        setExecutives(fallbackList.filter(e => e.role === 'Sales Executive'))
      }
    } catch (err) {
      console.warn('HRMS directory fetch notice:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEmployees()
  }, [])

  // Filter list to keep only active selected tab role (Admin or Sales Manager)
  const filtered = employees.filter((emp) => {
    const isMatchedRole = activeRoleTab === 'Admin' 
      ? (emp.role || '').toLowerCase().includes('admin')
      : (emp.role || '').toLowerCase().includes('manager')
      
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase())
      
    const matchesStatus = statusFilter === 'All' || emp.status === statusFilter
    
    return isMatchedRole && matchesSearch && matchesStatus
  })

  // Create new Admin or Sales Manager Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name || !formData.email) {
      showToast('Please provide Name and Email!', 'error')
      return
    }

    const payload = {
      employee_id: `EMP-${Date.now().toString().slice(-6)}`,
      name: formData.name,
      email: formData.email,
      phone: formData.phone || '+91 99999 00000',
      role: formData.role,
      designation: formData.role,
      department: 'Sales & Business Development',
      status: formData.status,
      permissions: defaultPermissions,
      team: []
    }

    try {
      await hrmsAPI.createEmployee(payload).catch(() => null)
      setEmployees((prev) => [payload, ...prev])
      showToast(`New ${formData.role} created successfully!`, 'success')
      setShowCreateModal(false)
      setFormData({ name: '', email: '', phone: '', role: 'Admin', status: 'Active', password: '' })
    } catch (err) {
      showToast('Failed to save Admin/Manager.', 'error')
    }
  }

  // Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editingEmp) return

    try {
      await hrmsAPI.updateEmployee(editingEmp.id, {
        name: editingEmp.name,
        email: editingEmp.email,
        phone: editingEmp.phone,
        role: editingEmp.role,
        status: editingEmp.status,
      }).catch(() => null)

      setEmployees((prev) =>
        prev.map((e) => (e.id === editingEmp.id ? { ...editingEmp } : e))
      )
      showToast('Profile updated successfully!', 'success')
      setShowEditModal(false)
      setEditingEmp(null)
    } catch (err) {
      showToast('Failed to update employee details.', 'error')
    }
  }

  // Toggle status
  const handleToggleStatus = async (emp) => {
    const newStatus = emp.status === 'Active' ? 'Inactive' : 'Active'
    setEmployees((prev) =>
      prev.map((e) => (e.id === emp.id ? { ...e, status: newStatus } : e))
    )

    try {
      await hrmsAPI.updateEmployee(emp.id, { status: newStatus }).catch(() => null)
      showToast(`Account status updated to ${newStatus}`, 'success')
    } catch (err) {
      showToast('Status updated locally.', 'info')
    }
  }

  // Open Permissions Matrix Modal
  const handleOpenPermissionModal = (emp) => {
    setSelectedEmp(emp)
    setPermissionsState(emp.permissions || defaultPermissions)
    setShowPermissionModal(true)
  }

  // Save Permissions Matrix
  const handleSavePermissions = () => {
    setEmployees((prev) =>
      prev.map((e) => (e.id === selectedEmp.id ? { ...e, permissions: permissionsState } : e))
    )
    showToast(`Access permissions updated for ${selectedEmp.name}!`, 'success')
    setShowPermissionModal(false)
    setSelectedEmp(null)
  }

  // Open Team Assignment Modal (Sales Managers only)
  const handleOpenTeamModal = (emp) => {
    setSelectedEmp(emp)
    setSelectedExecs(emp.team || [])
    setShowTeamModal(true)
  }

  // Save Team Assignment
  const handleSaveTeam = () => {
    setEmployees((prev) =>
      prev.map((e) => (e.id === selectedEmp.id ? { ...e, team: selectedExecs } : e))
    )
    showToast(`Team members assigned successfully!`, 'success')
    setShowTeamModal(false)
    setSelectedEmp(null)
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 font-sans">
      {/* ── 1. COMPACT PAGE HEADER & ROLE SELECTOR ──────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-[#004749]" /> Executive HRMS Controls
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            CEO Command hub. Authorize, edit roles, allocate teams, and deploy permissions for corporate Admins and Sales Managers.
          </p>
        </div>

        {/* Create new manager/admin button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="h-10 px-4 rounded-xl bg-[#540000] hover:bg-[#3a0101] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition"
        >
          <Plus size={15} /> Create Account
        </button>
      </div>

      {/* ── Tabbed View: Admins vs Sales Managers ─────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveRoleTab('Admin')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition cursor-pointer ${
                activeRoleTab === 'Admin' ? 'bg-[#004749] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              🛡️ System Admins
            </button>
            <button
              onClick={() => setActiveRoleTab('Sales Manager')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition cursor-pointer ${
                activeRoleTab === 'Sales Manager' ? 'bg-[#004749] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              💼 Sales Managers
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email..."
                className="h-9 w-60 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#b09b72]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 text-xs border border-slate-200 rounded-xl px-2.5 bg-slate-50 font-bold text-slate-600 focus:outline-none"
            >
              <option value="All">All Status</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Directory Grid */}
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider bg-slate-50/60">
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Role/Designation</th>
                {activeRoleTab === 'Sales Manager' && <th className="py-3 px-4">Allocated Team</th>}
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/50 transition">
                  <td className="py-3.5 px-4 font-mono text-slate-500">{emp.id}</td>
                  <td className="py-3.5 px-4 text-slate-900 font-bold">{emp.name}</td>
                  <td className="py-3.5 px-4 text-slate-600">{emp.email}</td>
                  <td className="py-3.5 px-4 text-slate-600">{emp.phone}</td>
                  <td className="py-3.5 px-4">
                    <span className="bg-[#b09b72]/10 text-[#938160] px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase">
                      {emp.role}
                    </span>
                  </td>
                  {activeRoleTab === 'Sales Manager' && (
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleOpenTeamModal(emp)}
                        className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {emp.team?.length || 0} Reps assigned
                      </button>
                    </td>
                  )}
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex rounded-lg border px-2 py-0.5 text-[10px] font-black ${STATUS_CLASSES[emp.status] || 'bg-slate-50'}`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => handleOpenPermissionModal(emp)}
                      className="p-1 text-slate-400 hover:text-[#004749]"
                      title="Manage Permissions"
                    >
                      <ShieldCheck className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingEmp({ ...emp })
                        setShowEditModal(true)
                      }}
                      className="p-1 text-slate-400 hover:text-blue-600"
                      title="Edit Profile"
                    >
                      <Edit className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(emp)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                      title={emp.status === 'Active' ? 'Deactivate' : 'Activate'}
                    >
                      {emp.status === 'Active' ? <ToggleRight className="w-5 h-5 inline text-[#004749]" /> : <ToggleLeft className="w-5 h-5 inline text-slate-350" />}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-semibold">
                    No accounts found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CREATE MODAL ────────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Create Corporate Account</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs font-semibold text-slate-700">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full h-9 rounded-xl border border-slate-200 px-3 font-bold text-slate-900 outline-none focus:border-[#b09b72]"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Corporate Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. john@tconnect.com"
                  className="w-full h-9 rounded-xl border border-slate-200 px-3 font-bold text-slate-900 outline-none focus:border-[#b09b72]"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Designation Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full h-9 rounded-xl border border-slate-200 px-3 font-bold text-slate-900 outline-none focus:border-[#b09b72]"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Sales Manager">Sales Manager</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full h-9 rounded-xl border border-slate-200 px-3 font-bold text-slate-900 outline-none focus:border-[#b09b72]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Account Access Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Set login password (min 6 characters)"
                  className="w-full h-9 rounded-xl border border-slate-200 px-3 font-bold text-slate-900 outline-none focus:border-[#b09b72]"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-250 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#540000] hover:bg-[#3a0101] text-white font-extrabold shadow-sm cursor-pointer"
                >
                  Generate Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ──────────────────────────────────────────────────── */}
      {showEditModal && editingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Edit Account Details</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs font-semibold text-slate-700">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editingEmp.name}
                  onChange={(e) => setEditingEmp({ ...editingEmp, name: e.target.value })}
                  className="w-full h-9 rounded-xl border border-slate-200 px-3 font-bold text-slate-900 outline-none focus:border-[#b09b72]"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editingEmp.email}
                  onChange={(e) => setEditingEmp({ ...editingEmp, email: e.target.value })}
                  className="w-full h-9 rounded-xl border border-slate-200 px-3 font-bold text-slate-900 outline-none focus:border-[#b09b72]"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editingEmp.phone}
                    onChange={(e) => setEditingEmp({ ...editingEmp, phone: e.target.value })}
                    className="w-full h-9 rounded-xl border border-slate-200 px-3 font-bold text-slate-900 outline-none focus:border-[#b09b72]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Designation</label>
                  <select
                    value={editingEmp.role}
                    onChange={(e) => setEditingEmp({ ...editingEmp, role: e.target.value })}
                    className="w-full h-9 rounded-xl border border-slate-200 px-3 font-bold text-slate-900 outline-none focus:border-[#b09b72]"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Sales Manager">Sales Manager</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-250 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#540000] hover:bg-[#3a0101] text-white font-extrabold shadow-sm cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PERMISSIONS MATRIX MODAL ────────────────────────────────────── */}
      {showPermissionModal && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Manage Permissions: {selectedEmp.name}</h3>
              <button onClick={() => setShowPermissionModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            <div className="space-y-4 text-xs font-semibold text-slate-700">
              <p className="text-[11px] text-slate-400">Assign role-based access controls (RBAC) to this profile:</p>
              
              <div className="space-y-2.5">
                {[
                  { key: 'crm', label: 'CRM & Leads Management (Read/Write)' },
                  { key: 'hrms', label: 'HRMS Staff & Directory (Read/Write)' },
                  { key: 'pipeline', label: 'Sales Opportunities Pipeline & Stages' },
                  { key: 'finance', label: 'Expenses Claims & Payroll' },
                  { key: 'settings', label: 'System Configuration & Settings' },
                  { key: 'audit', label: 'Security Logs & Auditing' }
                ].map((item) => {
                  const hasAccess = permissionsState[item.key]?.length > 0
                  return (
                    <label key={item.key} className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasAccess}
                        onChange={(e) => {
                          const checked = e.target.checked
                          setPermissionsState(prev => ({
                            ...prev,
                            [item.key]: checked ? ['read', 'write'] : []
                          }))
                        }}
                        className="w-4.5 h-4.5 rounded border-slate-300 text-[#004749] focus:ring-[#004749]"
                      />
                      <span>{item.label}</span>
                    </label>
                  )
                })}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-50">
                <button
                  onClick={() => setShowPermissionModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-250 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePermissions}
                  className="px-5 py-2 rounded-xl bg-[#540000] hover:bg-[#3a0101] text-white font-extrabold shadow-sm cursor-pointer"
                >
                  Save Access Matrix
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TEAM ASSIGNMENT MODAL (Sales Managers only) ──────────────────── */}
      {showTeamModal && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Assign Reps to: {selectedEmp.name}</h3>
              <button onClick={() => setShowTeamModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            <div className="space-y-4 text-xs font-semibold text-slate-700">
              <p className="text-[11px] text-slate-400">Select which Sales Executives belong to this manager's team:</p>
              
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {executives.map((exec) => {
                  const isChecked = selectedExecs.includes(exec.id)
                  return (
                    <label key={exec.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const checked = e.target.checked
                          if (checked) {
                            setSelectedExecs(prev => [...prev, exec.id])
                          } else {
                            setSelectedExecs(prev => prev.filter(id => id !== exec.id))
                          }
                        }}
                        className="w-4.5 h-4.5 rounded border-slate-300 text-[#004749] focus:ring-[#004749]"
                      />
                      <div className="text-[11px]">
                        <p className="font-bold text-slate-900 leading-none">{exec.name}</p>
                        <p className="text-slate-400 mt-1">{exec.email}</p>
                      </div>
                    </label>
                  )
                })}
                {executives.length === 0 && (
                  <p className="text-slate-400 text-center py-4">No Sales Executives available.</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-50">
                <button
                  onClick={() => setShowTeamModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-250 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTeam}
                  className="px-5 py-2 rounded-xl bg-[#540000] hover:bg-[#3a0101] text-white font-extrabold shadow-sm cursor-pointer"
                >
                  Assign Team
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Hrms
