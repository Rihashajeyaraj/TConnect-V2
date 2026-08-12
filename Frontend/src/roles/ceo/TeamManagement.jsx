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

function TeamManagement() {
  const { showToast } = useToast()
  const [team, setTeam] = useState([])
  const [activeTab, setActiveTab] = useState('All') // 'All' | 'Admin' | 'Sales Manager' | 'Sales Executive' | 'hierarchy'
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  // Add/Edit modal state
  const [showModal, setShowModal] = useState(false)
  const [editingEmp, setEditingEmp] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Sales Executive',
    department: 'Sales & BD',
    manager: '',
    reporting_manager_id: '',
    reporting_manager_name: '',
    reporting_manager_email: '',
    status: 'Active',
  })

  // Load backend employees
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const res = await userAPI.getUsers().catch(() => null)
        const userList = res && res.data && Array.isArray(res.data) ? res.data : []
        
        // Build team with real reporting manager assignments
        const mapped = userList.map((e, idx) => {
          const eRole = e.role || 'Sales Executive'
          const eName = e.name || e.full_name || e.email?.split('@')[0] || 'Team Member'
          const eId = e.id || e.employee_id || `USR-${idx + 1}`
          
          // Find executives reporting to this user if they are a manager
          const myExecutives = userList
            .filter(u => u.reporting_manager_name === eName || u.reporting_manager_id === eId)
            .map(u => u.name || u.email)

          return {
            id: eId,
            name: eName,
            email: e.email || '',
            phone: e.phone || '',
            role: eRole,
            department: e.dept || e.department || 'Sales & BD',
            manager: e.reporting_manager_name || (eRole.includes('Manager') || eRole.includes('Admin') ? 'CEO Office' : 'Direct / Unassigned'),
            reporting_manager_id: e.reporting_manager_id || '',
            reporting_manager_name: e.reporting_manager_name || '',
            reporting_manager_email: e.reporting_manager_email || '',
            deals_won: 0,
            revenue: 0,
            status: e.status || 'Active',
            executives: myExecutives,
          }
        })
        setTeam(mapped)
      } catch (err) {
        console.warn('Error loading team roster:', err)
        setTeam([])
      } finally {
        setLoading(false)
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

    const matchesRole = activeTab === 'All' || activeTab === 'hierarchy' || (activeTab === 'Admin' ? (m.role === 'Admin' || m.role === 'Super Admin' || m.role === 'System Admin') : m.role === activeTab)

    return matchesSearch && matchesRole
  })

  // Counts
  const totalStaff = team.length
  const totalAdmins = team.filter((m) => m.role === 'Admin' || m.role === 'Super Admin' || m.role === 'System Admin').length
  const totalManagers = team.filter((m) => m.role === 'Sales Manager').length
  const totalExecutives = team.filter((m) => m.role === 'Sales Executive').length

  const handleOpenAdd = () => {
    setEditingEmp(null)
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'Sales Executive',
      department: 'Sales & BD',
      manager: '',
      reporting_manager_id: '',
      reporting_manager_name: '',
      reporting_manager_email: '',
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
      reporting_manager_id: emp.reporting_manager_id || '',
      reporting_manager_name: emp.reporting_manager_name || '',
      reporting_manager_email: emp.reporting_manager_email || '',
      status: emp.status,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name || !formData.email) {
      showToast('Please provide employee name and email', 'error')
      return
    }

    const mId = formData.reporting_manager_id || null
    const mName = formData.reporting_manager_name || null
    const mEmail = formData.reporting_manager_email || null

    if (editingEmp) {
      // Update local state optimistically
      setTeam((prev) =>
        prev.map((m) =>
          m.id === editingEmp.id
            ? {
                ...m,
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                role: formData.role,
                department: formData.department,
                manager: mName || (formData.role.includes('Manager') || formData.role.includes('Admin') ? 'CEO Office' : 'Direct / Unassigned'),
                reporting_manager_id: mId,
                reporting_manager_name: mName,
                reporting_manager_email: mEmail,
                status: formData.status,
              }
            : m
        )
      )
      setShowModal(false)

      try {
        await userAPI.updateUser(editingEmp.id, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          dept: formData.department,
          status: formData.status,
          reporting_manager_id: mId,
          reporting_manager_name: mName,
          reporting_manager_email: mEmail,
        })
        showToast(`Employee "${formData.name}" details updated successfully!`, 'success')
      } catch (err) {
        showToast('Updated employee details locally', 'info')
      }
    } else {
      const tempId = `EMP-TEMP-${Date.now()}`
      const newEmp = {
        id: tempId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        department: formData.department,
        manager: mName || (formData.role.includes('Manager') || formData.role.includes('Admin') ? 'CEO Office' : 'Direct / Unassigned'),
        reporting_manager_id: mId,
        reporting_manager_name: mName,
        reporting_manager_email: mEmail,
        status: formData.status,
        deals_won: 0,
        revenue: 0,
      }
      setTeam((prev) => [newEmp, ...prev])
      setShowModal(false)

      const autoEmpId = `EMP${String(team.length + 1).padStart(6, '0')}`

      try {
        await userAPI.createUser({
          employee_code: autoEmpId,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          dept: formData.department,
          status: formData.status,
          reporting_manager_id: mId,
          reporting_manager_name: mName,
          reporting_manager_email: mEmail,
        })
        showToast(`Employee "${formData.name}" onboarded and added to HRMS!`, 'success')

        // Reload fresh team data
        const freshRes = await userAPI.getUsers().catch(() => null)
        if (freshRes && freshRes.data) {
          const mapped = freshRes.data.map((e, idx) => {
            const eRole = e.role || 'Sales Executive'
            const eName = e.name || e.full_name || e.email?.split('@')[0] || 'Team Member'
            const eId = e.id || e.employee_id || `USR-${idx + 1}`
            const myExecutives = freshRes.data
              .filter(u => u.reporting_manager_name === eName || u.reporting_manager_id === eId)
              .map(u => u.name || u.email)
            return {
              id: eId,
              name: eName,
              email: e.email || '',
              phone: e.phone || '',
              role: eRole,
              department: e.dept || e.department || 'Sales & BD',
              manager: e.reporting_manager_name || (eRole.includes('Manager') || eRole.includes('Admin') ? 'CEO Office' : 'Direct / Unassigned'),
              reporting_manager_id: e.reporting_manager_id || '',
              reporting_manager_name: e.reporting_manager_name || '',
              reporting_manager_email: e.reporting_manager_email || '',
              deals_won: 0,
              revenue: 0,
              status: e.status || 'Active',
              executives: myExecutives,
            }
          })
          setTeam(mapped)
        }
      } catch (err) {
        showToast('Onboarded new employee locally', 'info')
      }
    }
  }

  const handleToggleDeactivate = async (emp) => {
    const nextStatus = emp.status === 'Active' ? 'Deactivated' : 'Active'
    
    // Update local state optimistically
    setTeam((prev) =>
      prev.map((m) => (m.id === emp.id ? { ...m, status: nextStatus } : m))
    )

    try {
      await userAPI.updateUser(emp.id, {
        status: nextStatus
      })
      showToast(`Employee "${emp.name}" status updated to ${nextStatus}!`, 'success')
    } catch (err) {
      showToast('Updated employee status locally', 'info')
    }
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
              (m) => m.role === 'Sales Executive' && (m.reporting_manager_id === mgr.id || m.manager === mgr.name)
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
              {filteredTeam.map((emp, idx) => (
                <tr key={`${emp.id}-${idx}`} className="hover:bg-slate-50/70 transition">
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
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black border ${
                      emp.status?.toLowerCase() === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpenEdit(emp)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                        title="Edit Employee"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleDeactivate(emp)}
                        className={`rounded-lg p-1.5 transition ${
                          emp.status === 'Active'
                            ? 'text-rose-500 hover:bg-rose-50 hover:text-rose-700'
                            : 'text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                        title={emp.status === 'Active' ? 'Deactivate Employee' : 'Activate Employee'}
                      >
                        {emp.status === 'Active' ? (
                          <XCircle className="size-3.5" />
                        ) : (
                          <CheckCircle2 className="size-3.5" />
                        )}
                      </button>
                    </div>
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
                    value={formData.reporting_manager_id || formData.manager}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === 'CEO Office') {
                        setFormData({
                          ...formData,
                          manager: 'CEO Office',
                          reporting_manager_id: 'CEO Office',
                          reporting_manager_name: 'CEO Office',
                          reporting_manager_email: '',
                        })
                      } else if (!val) {
                        setFormData({
                          ...formData,
                          manager: '',
                          reporting_manager_id: '',
                          reporting_manager_name: '',
                          reporting_manager_email: '',
                        })
                      } else {
                        const matched = team.find(m => m.id === val || m.name === val)
                        setFormData({
                          ...formData,
                          manager: matched?.name || val,
                          reporting_manager_id: matched?.id || val,
                          reporting_manager_name: matched?.name || val,
                          reporting_manager_email: matched?.email || '',
                        })
                      }
                    }}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-800 outline-none bg-slate-50"
                  >
                    <option value="">Select Manager / CEO Office</option>
                    <option value="CEO Office">CEO Office</option>
                    {managers.map(m => (
                      <option key={m.id || m.name} value={m.id}>{m.name}</option>
                    ))}
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
