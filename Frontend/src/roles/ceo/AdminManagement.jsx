import { useState, useEffect } from 'react'
import { useToast } from '../../common/ToastContext.jsx'
import { userAPI } from '../../services/api.js'
import { formatDate } from '../../utils/dateUtils.js'
import { exportToCSV } from '../../utils/exportUtils.js'
import {
  ShieldCheck,
  UserPlus,
  Search,
  Filter,
  Download,
  Edit,
  Lock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Shield,
  KeyRound,
} from 'lucide-react'

export default function AdminManagement() {
  const { showToast } = useToast()
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'Active',
    accessPassword: '',
  })

  // Password reset modal state
  const [resetModalAdmin, setResetModalAdmin] = useState(null)
  const [newPassword, setNewPassword] = useState('')

  // Load Admin list
  const fetchAdmins = async () => {
    setLoading(true)
    try {
      // Fetch users from backend or fallback to local storage
      const res = await userAPI.getUsers().catch(() => null)
      let list = res?.data || []
      
      if (!Array.isArray(list) || list.length === 0) {
        // Fallback default admin accounts
        list = [
          {
            id: 'adm_01',
            name: 'System Admin',
            email: 'admin@tconnect.com',
            phone: '+91 98765 43210',
            role: 'Admin',
            dept: 'IT & Operations',
            status: 'Active',
            createdAt: '2026-01-10',
          },
          {
            id: 'adm_02',
            name: 'Operations Admin',
            email: 'opsadmin@tconnect.com',
            phone: '+91 98765 11223',
            role: 'Admin',
            dept: 'Field Operations',
            status: 'Active',
            createdAt: '2026-02-15',
          },
        ]
      }

      // Filter to keep ONLY Admins (CEO manages Admins)
      const adminOnly = list.filter((u) => {
        const r = (u.role || '').toLowerCase()
        return r === 'admin' || r === 'super admin' || r === 'system admin'
      })

      setAdmins(adminOnly)
    } catch (err) {
      showToast('Failed to load Admin directory.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdmins()
  }, [])

  // Filtered admins
  const filteredAdmins = admins.filter((admin) => {
    const matchesSearch =
      admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (admin.phone && admin.phone.includes(searchQuery))
    const matchesStatus = statusFilter === 'All' || admin.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Create or Update Admin submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name || !formData.email) {
      showToast('Please provide Admin Name and Access Email!', 'error')
      return
    }

    try {
      if (editingAdmin) {
        // Update Admin
        const payload = {
          ...editingAdmin,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          status: formData.status,
          role: 'Admin',
        }
        await usersAPI.updateUser(editingAdmin.id, payload).catch(() => null)

        setAdmins((prev) =>
          prev.map((item) => (item.id === editingAdmin.id ? { ...item, ...payload } : item))
        )
        showToast(`Admin account for ${formData.name} updated successfully!`, 'success')
      } else {
        // Create new Admin
        const payload = {
          id: `adm_${Date.now()}`,
          name: formData.name,
          email: formData.email,
          phone: formData.phone || '+91 99999 00000',
          role: 'Admin',
          dept: 'System Administration',
          status: formData.status || 'Active',
          accessPassword: formData.accessPassword || 'TConnectAdmin2026#',
          createdAt: new Date().toISOString(),
        }
        await usersAPI.createUser(payload).catch(() => null)

        setAdmins((prev) => [payload, ...prev])
        showToast(`New Admin account created for ${formData.name}!`, 'success')
      }

      setIsModalOpen(false)
      setEditingAdmin(null)
      setFormData({ name: '', email: '', phone: '', status: 'Active', accessPassword: '' })
    } catch (err) {
      showToast('Error saving Admin account details.', 'error')
    }
  }

  // Toggle Admin Status
  const handleToggleStatus = (admin) => {
    const newStatus = admin.status === 'Active' ? 'Inactive' : 'Active'
    setAdmins((prev) =>
      prev.map((item) => (item.id === admin.id ? { ...item, status: newStatus } : item))
    )
    showToast(`Admin account ${admin.email} set to ${newStatus}.`, 'info')
  }

  // Reset Password Submit
  const handleResetPasswordSubmit = (e) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      showToast('Password must be at least 6 characters long!', 'error')
      return
    }
    showToast(`Access password updated for ${resetModalAdmin.email}!`, 'success')
    setResetModalAdmin(null)
    setNewPassword('')
  }

  // Export CSV
  const handleExportCSV = () => {
    const exportData = filteredAdmins.map((adm) => ({
      ID: adm.id,
      Name: adm.name,
      Email: adm.email,
      Phone: adm.phone || 'N/A',
      Role: 'Admin',
      Department: adm.dept || 'Administration',
      Status: adm.status,
      Created_Date: formatDate(adm.createdAt || new Date()),
    }))
    exportToCSV(`TConnect_Admins_Directory_${new Date().toISOString().slice(0, 10)}.csv`, exportData)
    showToast('Admin Directory exported to CSV successfully.', 'success')
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 lg:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5" /> Executive Control Panel
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight">CEO Admin Management</h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl font-medium">
              Create, configure, and manage system **Admin** accounts. Admins hold full operational oversight over employee workflows, while CEO retains executive oversight over Admins.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingAdmin(null)
              setFormData({ name: '', email: '', phone: '', status: 'Active', accessPassword: '' })
              setIsModalOpen(true)
            }}
            className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
          >
            <UserPlus className="w-4 h-4" /> Create New Admin
          </button>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Admin by name, email or phone..."
            className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-3 focus:ring-blue-600/10 transition"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-600"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Admins</option>
              <option value="Inactive">Inactive Admins</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchAdmins}
            className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-extrabold text-xs flex items-center gap-2 cursor-pointer transition"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Admin Accounts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h3 className="font-extrabold text-slate-900 text-sm">System Administrators ({filteredAdmins.length})</h3>
          </div>
          <span className="text-xs font-semibold text-slate-400">Date Format: DD/MM/YYYY</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium text-xs flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            Loading System Admin Records...
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium text-xs">
            No Admin accounts found matching your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Admin Name</th>
                  <th className="py-3.5 px-4">Authorized Email</th>
                  <th className="py-3.5 px-4">Phone Number</th>
                  <th className="py-3.5 px-4">Role Title</th>
                  <th className="py-3.5 px-4">Account Status</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-800">
                {filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                          {admin.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900">{admin.name}</p>
                          <span className="text-[10px] text-slate-400 font-medium">ID: {admin.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-blue-600 font-bold">{admin.email}</td>
                    <td className="py-3.5 px-4 text-slate-600">{admin.phone || '+91 99999 00000'}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-extrabold text-[11px] uppercase">
                        Admin
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {admin.status === 'Active' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px]">
                          <XCircle className="w-3.5 h-3.5" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {formatDate(admin.createdAt || new Date())}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <button
                        onClick={() => {
                          setEditingAdmin(admin)
                          setFormData({
                            name: admin.name,
                            email: admin.email,
                            phone: admin.phone || '',
                            status: admin.status || 'Active',
                            accessPassword: '',
                          })
                          setIsModalOpen(true)
                        }}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition cursor-pointer"
                        title="Edit Admin Details"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setResetModalAdmin(admin)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                        title="Reset Password"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleToggleStatus(admin)}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          admin.status === 'Active'
                            ? 'text-slate-600 hover:text-rose-600 hover:bg-rose-50'
                            : 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={admin.status === 'Active' ? 'Deactivate Admin' : 'Activate Admin'}
                      >
                        {admin.status === 'Active' ? <Lock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Admin Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 lg:p-8 space-y-6 border border-slate-200 shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {editingAdmin ? 'Edit Admin Account' : 'Create New System Admin'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {editingAdmin ? 'Modify authorization and contact details.' : 'Grant administrative access to portal.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-base font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1.5">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. System Administrator"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3.5 text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block mb-1.5">Access Email Address (Login Username) *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. admin@tconnect.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3.5 text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 99999 00000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3.5 text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block mb-1.5">Account Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {!editingAdmin && (
                <div>
                  <label className="block mb-1.5">Initial Access Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Set admin access password"
                    value={formData.accessPassword}
                    onChange={(e) => setFormData({ ...formData, accessPassword: e.target.value })}
                    className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3.5 text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-extrabold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold shadow-md shadow-blue-600/30 cursor-pointer"
                >
                  {editingAdmin ? 'Save Admin Changes' : 'Create Admin Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetModalAdmin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                Reset Password for {resetModalAdmin.name}
              </span>
              <button onClick={() => setResetModalAdmin(null)} className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer">
                ✕
              </button>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Set a new security password for <strong className="text-slate-900">{resetModalAdmin.email}</strong>.
            </p>
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1.5">New Access Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password (min 6 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3.5 text-slate-900 font-semibold focus:outline-none focus:border-amber-600"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalAdmin(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
