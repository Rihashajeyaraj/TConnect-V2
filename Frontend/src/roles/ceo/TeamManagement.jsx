import React, { useState, useEffect } from 'react'
import { useToast } from '../../common/ToastContext.jsx'
import {
  Users,
  Users2,
  ShieldCheck,
  UserCheck,
  Search,
  Plus,
  Edit2,
  Trash2,
  Network,
  Activity,
  Award,
  ChevronRight,
  TrendingUp,
  Mail,
  Phone,
  Briefcase,
  CheckCircle2,
  XCircle,
  X,
  Building,
} from 'lucide-react'
import { hrmsAPI, userAPI } from '../../services/api.js'

const MOCK_TEAM = [
  {
    id: 'EMP-001',
    name: 'Priya Sharma',
    email: 'priya@tconnect.com',
    phone: '+91 98765 11111',
    role: 'Admin',
    department: 'Operations',
    manager: 'CEO Office',
    deals_won: 0,
    revenue: 0,
    status: 'Active',
  },
  {
    id: 'EMP-002',
    name: 'Vikram Singh',
    email: 'vikram@tconnect.com',
    phone: '+91 98765 22222',
    role: 'Sales Manager',
    department: 'Sales & BD',
    region: 'South Region',
    manager: 'CEO Office',
    deals_won: 14,
    revenue: 1650000,
    status: 'Active',
    executives: ['Ananya Roy', 'Robert Smith', 'Pooja Nair'],
  },
  {
    id: 'EMP-003',
    name: 'Suresh V',
    email: 'suresh@tconnect.com',
    phone: '+91 98765 33333',
    role: 'Sales Manager',
    department: 'Sales & BD',
    region: 'Western & Tech Hub',
    manager: 'CEO Office',
    deals_won: 10,
    revenue: 1190000,
    status: 'Active',
    executives: ['Karthik Raja', 'Mary Jane'],
  },
  {
    id: 'EMP-004',
    name: 'Ananya Roy',
    email: 'ananya@tconnect.com',
    phone: '+91 98765 44444',
    role: 'Sales Executive',
    department: 'Field Sales',
    manager: 'Vikram Singh',
    deals_won: 8,
    revenue: 940000,
    status: 'Active',
  },
  {
    id: 'EMP-005',
    name: 'Karthik Raja',
    email: 'karthik@tconnect.com',
    phone: '+91 98765 55555',
    role: 'Sales Executive',
    department: 'Field Sales',
    manager: 'Suresh V',
    deals_won: 6,
    revenue: 710000,
    status: 'Active',
  },
  {
    id: 'EMP-006',
    name: 'Robert Smith',
    email: 'robert@tconnect.com',
    phone: '+91 98765 66666',
    role: 'Sales Executive',
    department: 'Inside Sales',
    manager: 'Vikram Singh',
    deals_won: 5,
    revenue: 620000,
    status: 'Active',
  },
  {
    id: 'EMP-007',
    name: 'Mary Jane',
    email: 'mary@tconnect.com',
    phone: '+91 98765 77777',
    role: 'Sales Executive',
    department: 'Inside Sales',
    manager: 'Suresh V',
    deals_won: 4,
    revenue: 480000,
    status: 'Active',
  },
]

function TeamManagement() {
  const { showToast } = useToast()
  const [team, setTeam] = useState(MOCK_TEAM)
  const [activeTab, setActiveTab] = useState('All') // 'All' | 'Admin' | 'Sales Manager' | 'Sales Executive' | 'hierarchy'
  const [searchQuery, setSearchQuery] = useState('')

  // Add/Edit modal state
  const [showModal, setShowModal] = useState(false)
  const [editingEmp, setEditingEmp] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Sales Executive',
    department: 'Field Sales',
    manager: 'Vikram Singh',
    status: 'Active',
  })

  // Load backend employees
  useEffect(() => {
    async function loadData() {
      try {
        const res = await hrmsAPI.getEmployees().catch(() => null)
        if (res && res.data && res.data.length > 0) {
          const mapped = res.data.map((e, idx) => ({
            id: e.id || `EMP-00${idx + 1}`,
            name: e.name || e.full_name || 'Staff Member',
            email: e.email || 'employee@tconnect.com',
            phone: e.phone || '+91 98765 00000',
            role: e.role || (idx === 0 ? 'Admin' : idx < 3 ? 'Sales Manager' : 'Sales Executive'),
            department: e.department || 'Sales & BD',
            manager: e.manager_name || (idx < 3 ? 'CEO Office' : 'Vikram Singh'),
            deals_won: e.deals_won || (idx % 2 === 0 ? 6 : 4),
            revenue: e.revenue || (idx % 2 === 0 ? 650000 : 450000),
            status: e.status || 'Active',
            executives: idx === 1 ? ['Ananya Roy', 'Robert Smith'] : idx === 2 ? ['Karthik Raja', 'Mary Jane'] : [],
          }))
          setTeam(mapped)
        }
      } catch (err) {
        console.warn('Using standard executive roster:', err)
      }
    }
    loadData()
  }, [])

  // Filtered members
  const filteredTeam = team.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.manager || '').toLowerCase().includes(searchQuery.toLowerCase())

    const matchesRole = activeTab === 'All' || activeTab === 'hierarchy' || m.role === activeTab

    return matchesSearch && matchesRole
  })

  // Counts
  const totalStaff = team.length
  const totalAdmins = team.filter((m) => m.role === 'Admin').length
  const totalManagers = team.filter((m) => m.role === 'Sales Manager').length
  const totalExecutives = team.filter((m) => m.role === 'Sales Executive').length

  const handleOpenAdd = () => {
    setEditingEmp(null)
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'Sales Executive',
      department: 'Field Sales',
      manager: 'Vikram Singh',
      status: 'Active',
    })
    setShowModal(true)
  }

  const handleOpenEdit = (emp) => {
    setEditingEmp(emp)
    setFormData({
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      role: emp.role,
      department: emp.department,
      manager: emp.manager,
      status: emp.status,
    })
    setShowModal(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name || !formData.email) {
      showToast('Please provide employee name and email', 'error')
      return
    }

    if (editingEmp) {
      setTeam((prev) =>
        prev.map((m) => (m.id === editingEmp.id ? { ...m, ...formData } : m))
      )
      showToast(`Updated employee ${formData.name}`, 'success')
    } else {
      const newEmp = {
        id: `EMP-00${team.length + 1}`,
        ...formData,
        deals_won: 0,
        revenue: 0,
      }
      setTeam((prev) => [newEmp, ...prev])
      showToast(`Added new employee ${formData.name}`, 'success')
    }
    setShowModal(false)
  }

  // Managers with their respective executives for hierarchy tree
  const managers = team.filter((m) => m.role === 'Sales Manager')

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-[#F8CAE4]/20 text-[#832D51]">
              <Users2 className="size-4.5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Organizational Team Management
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-medium max-w-3xl">
            Executive control of Admins, Sales Managers, and Sales Executives. Manage reporting hierarchies, sales outputs, and role assignments.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 rounded-xl bg-[#832D51] hover:bg-[#6a2240] text-white px-4 py-2.5 text-xs font-black transition shadow-xs"
        >
          <Plus className="size-4" />
          Add Employee / Rep
        </button>
      </div>

      {/* Role Breakdown KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Workforce */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Workforce</span>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-900">{totalStaff}</p>
            <span className="text-xs font-bold text-emerald-600">100% Active</span>
          </div>
        </div>

        {/* Admins */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Admins</span>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-900">{totalAdmins}</p>
            <span className="text-xs font-bold text-slate-500">Operations Control</span>
          </div>
        </div>

        {/* Sales Managers */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Sales Managers</span>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-[#832D51]">{totalManagers}</p>
            <span className="text-xs font-bold text-[#EA6993]">Team Leaders</span>
          </div>
        </div>

        {/* Sales Executives */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Sales Executives</span>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-[#EA6993]">{totalExecutives}</p>
            <span className="text-xs font-bold text-amber-700">Field / Inside Sales</span>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {['All', 'hierarchy', 'Admin', 'Sales Manager', 'Sales Executive'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-[#832D51] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab === 'hierarchy' ? 'Manager → Executive Hierarchy' : tab}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search staff, designation, manager..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-xs font-semibold placeholder:text-slate-400 outline-none focus:border-[#832D51]"
          />
        </div>
      </div>

      {/* Hierarchy View OR Table View */}
      {activeTab === 'hierarchy' ? (
        /* Manager → Executive Hierarchy Cards Tree */
        <div className="grid gap-6 lg:grid-cols-2">
          {managers.map((mgr) => {
            const reportingExecs = team.filter(
              (m) => m.role === 'Sales Executive' && m.manager === mgr.name
            )
            const managerTotalRevenue = reportingExecs.reduce((acc, curr) => acc + curr.revenue, 0)
            const managerTotalDeals = reportingExecs.reduce((acc, curr) => acc + curr.deals_won, 0)

            return (
              <div
                key={mgr.id}
                className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4"
              >
                {/* Manager Node Header */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-12 place-items-center rounded-2xl bg-[#832D51] text-white font-black text-sm shadow-sm">
                      {mgr.name.split(' ').map((n) => n[0]).join('')}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-slate-900">{mgr.name}</h3>
                        <span className="rounded bg-[#F8CAE4]/20 px-2 py-0.5 text-[10px] font-black text-[#832D51]">
                          Sales Manager
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{mgr.email} · {mgr.phone}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Team Revenue</span>
                    <p className="text-sm font-black text-emerald-700">₹{(managerTotalRevenue / 100000).toFixed(1)}L</p>
                  </div>
                </div>

                {/* Direct Reports List */}
                <div className="space-y-2.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    Direct Sales Executive Reports ({reportingExecs.length})
                  </span>

                  <div className="space-y-2">
                    {reportingExecs.map((exec) => (
                      <div
                        key={exec.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/70 p-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="grid size-7 place-items-center rounded-lg bg-white text-slate-800 font-bold border border-slate-200">
                            {exec.name[0]}
                          </span>
                          <div>
                            <p className="font-extrabold text-slate-900">{exec.name}</p>
                            <p className="text-[10px] text-slate-400">{exec.department}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <span className="font-black text-slate-900">₹{exec.revenue.toLocaleString()}</span>
                            <p className="text-[10px] text-slate-400">{exec.deals_won} Deals</p>
                          </div>
                          <button
                            onClick={() => handleOpenEdit(exec)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                            title="Edit"
                          >
                            <Edit2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {reportingExecs.length === 0 && (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No executives assigned to this manager yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Team Table View */
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-3">Employee Name</th>
                <th className="pb-3">Designation / Role</th>
                <th className="pb-3">Department</th>
                <th className="pb-3">Reporting Manager</th>
                <th className="pb-3">Deals Won</th>
                <th className="pb-3">Revenue Output</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredTeam.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3">
                    <p className="font-extrabold text-slate-900">{emp.name}</p>
                    <p className="text-[10px] text-slate-400">{emp.email}</p>
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                        emp.role === 'Admin'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : emp.role === 'Sales Manager'
                          ? 'bg-[#F8CAE4]/20 text-[#832D51] border border-[#EA6993]/30'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {emp.role}
                    </span>
                  </td>
                  <td className="py-3 text-slate-700">{emp.department}</td>
                  <td className="py-3 text-slate-600 font-bold">{emp.manager || 'None'}</td>
                  <td className="py-3 font-extrabold text-slate-900">{emp.deals_won}</td>
                  <td className="py-3 font-black text-[#832D51]">
                    ₹{emp.revenue.toLocaleString()}
                  </td>
                  <td className="py-3">
                    <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 border border-emerald-200">
                      {emp.status}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => handleOpenEdit(emp)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                      title="Edit Employee"
                    >
                      <Edit2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">
                {editingEmp ? 'Edit Employee Details' : 'Add New Employee'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Rahul Verma"
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 outline-none focus:border-[#832D51]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@tconnect.com"
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 outline-none focus:border-[#832D51]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 99999 88888"
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 outline-none focus:border-[#832D51]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-800 outline-none bg-slate-50"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Sales Manager">Sales Manager</option>
                    <option value="Sales Executive">Sales Executive</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reporting Manager</label>
                  <select
                    value={formData.manager}
                    onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-800 outline-none bg-slate-50"
                  >
                    <option value="CEO Office">CEO Office</option>
                    <option value="Vikram Singh">Vikram Singh</option>
                    <option value="Suresh V">Suresh V</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#832D51] px-5 py-2 font-bold text-white hover:bg-[#6a2240]"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeamManagement
