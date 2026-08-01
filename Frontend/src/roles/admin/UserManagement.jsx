import { useState, useEffect } from 'react'
import {
  Users,
  Search,
  Plus,
  ShieldCheck,
  Mail,
  Phone,
  Building,
  UserCheck,
  UserX,
  Key,
  Edit3,
  Trash2,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Info,
} from 'lucide-react'
import { hrmsAPI, userAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'

const defaultUsers = [
  {
    id: 'usr_001',
    name: 'Admin User',
    email: 'admin@tconnect.com',
    phone: '+91 98765 00001',
    role: 'Super Admin',
    dept: 'IT & System Admin',
    status: 'Active',
    lastLogin: '2 mins ago',
    accessPassword: 'AdminPassword2026#',
  },
  {
    id: 'usr_002',
    name: 'Vikram Singh',
    email: 'vikram.singh@tconnect.com',
    phone: '+91 98765 12345',
    role: 'Sales Manager',
    dept: 'Sales & Business Development',
    status: 'Active',
    lastLogin: '1 hour ago',
    accessPassword: 'ManagerPassword2026#',
  },
  {
    id: 'usr_003',
    name: 'Ananya Roy',
    email: 'ananya.roy@tconnect.com',
    phone: '+91 98765 23456',
    role: 'Sales Executive',
    dept: 'Sales & Business Development',
    status: 'Active',
    lastLogin: '3 hours ago',
    accessPassword: 'SalesPassword2026#',
  },
  {
    id: 'usr_004',
    name: 'Karthik Raja',
    email: 'karthik.raja@tconnect.com',
    phone: '+91 98765 34567',
    role: 'Sales Executive',
    dept: 'Sales & Business Development',
    status: 'Active',
    lastLogin: '1 day ago',
    accessPassword: 'SalesPassword2026#',
  },
  {
    id: 'usr_005',
    name: 'Priya Sharma',
    email: 'priya.sharma@tconnect.com',
    phone: '+91 98765 45678',
    role: 'Sales Executive',
    dept: 'Inside Sales',
    status: 'Inactive',
    lastLogin: '5 days ago',
    accessPassword: 'SalesPassword2026#',
  },
]

const ROLE_BADGE_CLASSES = {
  'Super Admin': 'bg-rose-50 text-rose-700 border-rose-200',
  'CEO / Founder': 'bg-purple-50 text-purple-700 border-purple-200',
  'Sales Manager': 'bg-blue-50 text-blue-700 border-blue-200',
  'Sales Executive': 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

const isProtectedRole = (roleName) => {
  return roleName === 'CEO / Founder' || roleName === 'Super Admin'
}

function UserManagement() {
  const { showToast } = useToast()
  const [users, setUsers] = useState(defaultUsers)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState('ALL')
  const [showAddModal, setShowAddModal] = useState(false)

  // Password visibility states
  const [showAddPassword, setShowAddPassword] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)

  // Credentials Generated Modal
  const [createdCredentialsModal, setCreatedCredentialsModal] = useState(null)

  const [newUser, setNewUser] = useState({
    first_name: '',
    last_name: '',
    name: '',
    gender: 'Male',
    date_of_birth: '',
    email: '',
    phone: '',
    emergency_contact: '',
    password: '',
    role: 'Sales Executive',
    dept: 'Sales & Business Development',
    status: 'Active',
  })

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [showCredentialsModal, setShowCredentialsModal] = useState(null)

  // Fetch users from backend / Supabase
  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await userAPI.getUsers()
        if (res && res.data && res.data.length > 0) {
          setUsers(res.data)
        }
      } catch (err) {
        console.warn('Using default initial users list:', err)
      }
    }
    loadUsers()
  }, [])

  const handleOpenEditModal = (user) => {
    setEditingUser({ ...user })
    setShowEditModal(true)
  }

  // Save Edited User Details & Password
  const handleSaveEditedUser = async (e) => {
    e.preventDefault()
    if (!editingUser || !editingUser.name || !editingUser.email) return

    setUsers((prev) =>
      prev.map((u) => (u.id === editingUser.id ? { ...editingUser } : u))
    )
    setShowEditModal(false)

    try {
      await userAPI.updateUser(editingUser.id, {
        name: editingUser.name,
        email: editingUser.email,
        phone: editingUser.phone,
        role: editingUser.role,
        dept: editingUser.dept,
        status: editingUser.status,
        accessPassword: editingUser.accessPassword,
      })
      showToast(`User profile and access credentials updated!`, 'success')
    } catch (err) {
      showToast(`User profile updated locally`, 'info')
    } finally {
      setEditingUser(null)
    }
  }

  // Add User Handler (Creates Access Email & Password for Employee Portal Login)
  const handleAddUser = async (e) => {
    e.preventDefault()
    const fullName = newUser.name || `${newUser.first_name} ${newUser.last_name}`.trim()
    if (!fullName || !newUser.email || !newUser.password) {
      showToast('Please provide Name, Access Email, and Portal Password!', 'error')
      return
    }

    const created = {
      id: `usr_${Date.now()}`,
      first_name: newUser.first_name || fullName.split(' ')[0],
      last_name: newUser.last_name || (' '.join(fullName.split(' ').slice(1))),
      name: fullName,
      gender: newUser.gender || 'Male',
      date_of_birth: newUser.date_of_birth,
      email: newUser.email,
      phone: newUser.phone || '+91 99999 99999',
      emergency_contact: newUser.emergency_contact,
      role: newUser.role,
      dept: newUser.dept,
      status: newUser.status,
      lastLogin: 'Just now',
      accessPassword: newUser.password,
    }

    setUsers([created, ...users])
    setShowAddModal(false)

    // Show Access Credentials Confirmation Modal for Admin
    setCreatedCredentialsModal(created)

    setNewUser({
      first_name: '',
      last_name: '',
      name: '',
      gender: 'Male',
      date_of_birth: '',
      email: '',
      phone: '',
      emergency_contact: '',
      password: '',
      role: 'Sales Executive',
      dept: 'Sales & Business Development',
      status: 'Active',
    })

    const autoEmpId = `EMP${String(users.length + 1).padStart(6, '0')}`

    try {
      const res = await userAPI.createUser({
        employee_code: autoEmpId,
        first_name: created.first_name,
        last_name: created.last_name,
        name: created.name,
        gender: created.gender,
        date_of_birth: created.date_of_birth,
        email: created.email,
        phone: created.phone,
        emergency_contact: created.emergency_contact,
        password: created.accessPassword,
        role: created.role,
        dept: created.dept,
      })
      showToast('User Created Successfully: ✓ Auth Account Created | ✓ Employee Profile Created | ✓ Added to HRMS', 'success')

      // Fetch fresh users list from backend API
      const freshRes = await userAPI.getUsers()
      if (freshRes && freshRes.data && freshRes.data.length > 0) {
        setUsers(freshRes.data)
      }
    } catch (err) {
      showToast('User portal account created locally', 'info')
    }
  }

  // Toggle User Status (Active / Inactive)
  const toggleUserStatus = async (userId) => {
    const target = users.find((u) => u.id === userId)
    if (target && isProtectedRole(target.role)) {
      showToast('Protected Account: Executive Board and Super Admin accounts cannot be deactivated.', 'error')
      return
    }

    const newStatus = target.status === 'Active' ? 'Inactive' : 'Active'
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
    )

    try {
      await userAPI.updateUser(userId, { status: newStatus })
      showToast(`User status changed to ${newStatus}`, 'info')
    } catch (err) {
      showToast(`User status updated to ${newStatus}`, 'info')
    }
  }

  // Delete User Account
  const handleDeleteUser = async (userId) => {
    const target = users.find((u) => u.id === userId)
    if (target && isProtectedRole(target.role)) {
      showToast('Protected Account: Executive Board and Super Admin accounts cannot be deleted.', 'error')
      return
    }

    if (window.confirm(`Are you sure you want to permanently delete account '${target?.name}'?`)) {
      setUsers((prev) => prev.filter((u) => u.id !== userId))
      try {
        await userAPI.deleteUser(userId)
        showToast('User account deleted from system', 'warning')
      } catch (err) {
        showToast('User account removed', 'warning')
      }
    }
  }

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text)
    showToast(`${label} copied to clipboard!`, 'success')
  }

  // Filter Users List
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.dept.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesRole = selectedRole === 'ALL' || u.role === selectedRole
    const matchesStatus = selectedStatus === 'ALL' || u.status === selectedStatus

    return matchesSearch && matchesRole && matchesStatus
  })

  // Role Statistics
  const activeCount = users.filter((u) => u.status === 'Active').length
  const inactiveCount = users.filter((u) => u.status === 'Inactive').length
  const salesManagersCount = users.filter((u) => u.role === 'Sales Manager').length
  const executivesCount = users.filter((u) => u.role === 'Sales Executive').length

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" /> Employee & User Account Management
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Create portal access emails and passwords for Sales Managers and Executives to log into their portals.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create New Employee Account
        </button>
      </div>

      {/* KPI Stats Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Users</p>
            <p className="text-2xl font-extrabold text-slate-900">{users.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Portal Users</p>
            <p className="text-2xl font-extrabold text-slate-900">{activeCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sales Managers</p>
            <p className="text-2xl font-extrabold text-slate-900">{salesManagersCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sales Executives</p>
            <p className="text-2xl font-extrabold text-slate-900">{executivesCount}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-semibold"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-600"
          >
            <option value="ALL">All Roles</option>
            <option value="Super Admin">Super Admin</option>
            <option value="Sales Manager">Sales Manager</option>
            <option value="Sales Executive">Sales Executive</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-600"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active Users</option>
            <option value="Inactive">Inactive Users</option>
          </select>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="p-4">User Details</th>
                <th className="p-4">Access Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Department</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Portal Access</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {filteredUsers.map((user) => {
                const isProtected = isProtectedRole(user.role)
                return (
                  <tr key={user.id} className="hover:bg-slate-50/70 transition">
                    {/* User Details */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs shrink-0">
                          {user.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                            {user.name}
                            {isProtected && (
                              <span title="Protected Account" className="text-amber-500">
                                <Lock className="w-3 h-3" />
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-400 font-medium">{user.phone}</p>
                        </div>
                      </div>
                    </td>

                    {/* Access Email */}
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 text-slate-800 font-bold">
                        <Mail className="w-3.5 h-3.5 text-blue-600" />
                        {user.email}
                      </span>
                    </td>

                    {/* Role */}
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-extrabold ${ROLE_BADGE_CLASSES[user.role] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {user.role}
                      </span>
                    </td>

                    {/* Department */}
                    <td className="p-4 text-slate-600 font-medium">
                      {user.dept}
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <button
                        onClick={() => toggleUserStatus(user.id)}
                        disabled={isProtected}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-extrabold transition cursor-pointer ${
                          user.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        } ${isProtected ? 'opacity-80 cursor-not-allowed' : ''}`}
                      >
                        {user.status === 'Active' ? (
                          <>
                            <UserCheck className="w-3 h-3" /> Active
                          </>
                        ) : (
                          <>
                            <UserX className="w-3 h-3" /> Inactive
                          </>
                        )}
                      </button>
                    </td>

                    {/* Portal Access Passwords */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setShowCredentialsModal(user)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition cursor-pointer"
                        title="View Portal Credentials"
                      >
                        <Key className="w-3 h-3 text-blue-600" /> Access Keys
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      {isProtected ? (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                          🔒 Protected
                        </span>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(user)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 rounded-lg transition cursor-pointer"
                            title="Edit User Account"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition cursor-pointer"
                            title="Delete Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400 font-semibold">
                    No employee accounts found matching the search or role criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal (Admin Creates Access Email & Password) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" /> Create Portal Access Account
              </span>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer">
                ✕
              </button>
            </h3>

            <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-[11px] font-semibold text-blue-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Enter the employee's <strong>Access Email</strong> and assign a <strong>Portal Access Password</strong>. The employee will use these exact credentials to log in to their Sales Manager or Executive portal.
              </span>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Employee ID (Auto-Generated)</label>
                <input
                  type="text"
                  value={`EMP${String(users.length + 1).padStart(6, '0')}`}
                  disabled
                  className="w-full h-10 border border-slate-200 bg-slate-100 rounded-xl px-3 text-slate-700 font-extrabold cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">First Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Arun"
                    value={newUser.first_name}
                    onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value, name: `${e.target.value} ${newUser.last_name}`.trim() })}
                    className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Last Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Kumar"
                    value={newUser.last_name}
                    onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value, name: `${newUser.first_name} ${e.target.value}`.trim() })}
                    className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Gender</label>
                  <select
                    value={newUser.gender}
                    onChange={(e) => setNewUser({ ...newUser, gender: e.target.value })}
                    className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={newUser.date_of_birth}
                    onChange={(e) => setNewUser({ ...newUser, date_of_birth: e.target.value })}
                    className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Access Email Address (Portal Login Email)</label>
                <input
                  type="email"
                  placeholder="e.g. arun.kumar@tconnect.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Portal Access Password</label>
                <div className="relative">
                  <input
                    type={showAddPassword ? 'text' : 'password'}
                    placeholder="Assign login password (e.g. Sales2026#)"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full h-10 border border-slate-300 rounded-xl pl-3 pr-10 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showAddPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98765 88990"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Emergency Contact</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98765 00000"
                    value={newUser.emergency_contact}
                    onChange={(e) => setNewUser({ ...newUser, emergency_contact: e.target.value })}
                    className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Assigned Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-blue-600 font-bold"
                  >
                    <option value="Sales Manager">Sales Manager</option>
                    <option value="Sales Executive">Sales Executive</option>
                    <option value="System Admin">System Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Department</label>
                  <select
                    value={newUser.dept}
                    onChange={(e) => setNewUser({ ...newUser, dept: e.target.value })}
                    className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-blue-600 font-bold"
                  >
                    <option value="Sales & Business Development">Sales & Business</option>
                    <option value="Inside Sales">Inside Sales</option>
                    <option value="Field Sales">Field Sales</option>
                    <option value="IT & System Admin">IT & Admin</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md mt-2 cursor-pointer"
              >
                Create Account & Generate Access Keys
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Credentials Confirmation Modal */}
      {createdCredentialsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              Employee Credentials Created!
            </h3>
            <p className="text-xs text-slate-600">
              Share the following login credentials with <strong>{createdCredentialsModal.name}</strong> to access their {createdCredentialsModal.role} portal:
            </p>

            <div className="space-y-2 bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-bold text-slate-500">Access Email:</span>
                <span className="font-extrabold text-blue-700 flex items-center gap-1">
                  {createdCredentialsModal.email}
                  <button onClick={() => copyToClipboard(createdCredentialsModal.email, 'Email')} className="text-slate-400 hover:text-blue-600">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="font-bold text-slate-500">Access Password:</span>
                <span className="font-extrabold text-emerald-700 flex items-center gap-1 font-mono">
                  {createdCredentialsModal.accessPassword}
                  <button onClick={() => copyToClipboard(createdCredentialsModal.accessPassword, 'Password')} className="text-slate-400 hover:text-emerald-600">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </span>
              </div>
            </div>

            <button
              onClick={() => setCreatedCredentialsModal(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer"
            >
              Done & Close
            </button>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center justify-between">
              <span>Edit Employee Account</span>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer">
                ✕
              </button>
            </h3>
            <form onSubmit={handleSaveEditedUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Full Name</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Access Email Address</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Portal Access Password</label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editingUser.accessPassword || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, accessPassword: e.target.value })}
                    className="w-full h-10 border border-slate-300 rounded-xl pl-3 pr-10 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editingUser.phone}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Role</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                    className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-blue-600"
                  >
                    <option value="Sales Manager">Sales Manager</option>
                    <option value="Sales Executive">Sales Executive</option>
                    <option value="System Admin">System Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Department</label>
                  <input
                    type="text"
                    value={editingUser.dept}
                    onChange={(e) => setEditingUser({ ...editingUser, dept: e.target.value })}
                    className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md mt-2 cursor-pointer"
              >
                Save Account & Password Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Show Credentials Inspection Modal */}
      {showCredentialsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" /> Portal Login Credentials
              </span>
              <button onClick={() => setShowCredentialsModal(null)} className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer">
                ✕
              </button>
            </h3>

            <div className="space-y-3 bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-bold text-slate-500">Employee Name:</span>
                <span className="font-extrabold text-slate-900">{showCredentialsModal.name}</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-bold text-slate-500">Access Email:</span>
                <span className="font-extrabold text-blue-700 flex items-center gap-1">
                  {showCredentialsModal.email}
                  <button onClick={() => copyToClipboard(showCredentialsModal.email, 'Email')} className="text-slate-400 hover:text-blue-600">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-500">Access Password:</span>
                <span className="font-extrabold text-emerald-700 flex items-center gap-1 font-mono">
                  {showCredentialsModal.accessPassword || 'TConnect2026#'}
                  <button onClick={() => copyToClipboard(showCredentialsModal.accessPassword || 'TConnect2026#', 'Password')} className="text-slate-400 hover:text-emerald-600">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowCredentialsModal(null)}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer"
            >
              Close Access Keys
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement
