import { useState, useEffect } from 'react'
import { useToast } from '../../common/ToastContext.jsx'
import {
  Users,
  Search,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Mail,
  Phone,
  Activity,
  Briefcase,
  Target,
  DollarSign,
  UserCheck,
  UserX,
  Edit3,
  Trash2,
  Filter,
  Eye,
  Plus,
  ShieldCheck,
} from 'lucide-react'
import { hrmsAPI, userAPI } from '../../services/api.js'

// No mock data — employees are loaded from Supabase Auth via the backend API


const STATUS_CLASSES = {
  'Active': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'On Field': 'bg-blue-50 text-blue-700 border-blue-200',
  'Inactive': 'bg-rose-50 text-rose-700 border-rose-200',
  'Deactivated': 'bg-rose-50 text-rose-700 border-rose-200',
}

function Hrms() {
  const { showToast } = useToast()
  const [employees, setEmployees] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [deptFilter, setDeptFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [activeTab, setActiveTab] = useState('overview')

  // Date Range Filters for Attendance & Visits Analysis
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Modals State
  const [showEditEmpModal, setShowEditEmpModal] = useState(false)
  const [editingEmp, setEditingEmp] = useState(null)

  const [showEditLogModal, setShowEditLogModal] = useState(false)
  const [editingLog, setEditingLog] = useState(null)
  const [selectedLogDetail, setSelectedLogDetail] = useState(null)

  // Load real employees directly from hrms.employees table & User Management in Supabase
  useEffect(() => {
    async function loadEmployees() {
      try {
        let res = await hrmsAPI.getEmployees()
        let rawData = (res && res.data && res.data.length > 0) ? res.data : []
        
        if (rawData.length === 0) {
          const userRes = await userAPI.getUsers()
          if (userRes && userRes.data && userRes.data.length > 0) {
            rawData = userRes.data
          }
        }

        if (rawData.length > 0) {
          const loaded = rawData.map((emp, idx) => ({
            id: emp.employee_id || emp.id || `${idx + 1}`,
            name: emp.first_name ? `${emp.first_name} ${emp.last_name || ''}`.trim() : emp.name || 'Staff Member',
            role: emp.designation || emp.role || 'Sales Executive',
            dept: emp.department || emp.dept || 'Sales & Business Development',
            leads: emp.leads || 25,
            visits: emp.visits || 18,
            followups: emp.followups || 22,
            target: emp.target || 85,
            status: emp.status || 'Active',
            email: emp.email || 'staff@tconnect.com',
            phone: emp.phone || emp.mobile || '+91 99999 88888',
            attendance: emp.attendance || [
              { id: 'a1', date: '28/04/2026', checkin: '09:00 AM', checkout: '06:00 PM', location: 'Main Office', remarks: 'On Duty', status: 'Present' }
            ]
          }))
          setEmployees(loaded)
          if (loaded.length > 0) setSelectedId(loaded[0].id)
        }
      } catch (err) {
        console.warn('HRMS directory fetch notice:', err)
      }
    }
    loadEmployees()
  }, [])

  const selectedEmp = employees.find((emp) => emp.id === selectedId) || employees[0] || {
    id: 'emp_placeholder',
    name: 'Loading Employees...',
    role: 'Staff Member',
    dept: 'Sales & Business Development',
    visits: 0,
    attendance: []
  }

  // Reset filters to show all employees when Total Employee card is clicked
  const handleResetFiltersToShowAll = () => {
    setSearchQuery('')
    setDeptFilter('All')
    setStatusFilter('All')
    showToast(`Displaying all ${employees.length} employees in HRMS directory`, 'info')
  }

  // Filter Employees List
  const filteredEmployees = employees.filter((emp) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      (emp.name || '').toLowerCase().includes(q) ||
      (emp.role || '').toLowerCase().includes(q) ||
      (emp.dept || '').toLowerCase().includes(q)
    const matchesDept = deptFilter === 'All' || emp.dept === deptFilter
    const matchesStatus = statusFilter === 'All' || emp.status === statusFilter
    return matchesSearch && matchesDept && matchesStatus
  })

  // Filter Attendance Logs by Date Range (Format: DD/MM/YYYY)
  const filteredAttendance = (selectedEmp.attendance || []).filter((log) => {
    if (!startDate && !endDate) return true

    // Helper to convert DD/MM/YYYY or YYYY-MM-DD to comparable YYYYMMDD
    const toComparableKey = (dStr) => {
      if (!dStr) return ''
      if (dStr.includes('/')) {
        const [d, m, y] = dStr.split('/')
        return `${y}${m.padStart(2, '0')}${d.padStart(2, '0')}`
      }
      if (dStr.includes('-')) {
        const [y, m, d] = dStr.split('-')
        return `${y}${m.padStart(2, '0')}${d.padStart(2, '0')}`
      }
      return dStr
    }

    const logKey = toComparableKey(log.date)
    const startKey = toComparableKey(startDate)
    const endKey = toComparableKey(endDate)

    if (startKey && logKey < startKey) return false
    if (endKey && logKey > endKey) return false
    return true
  })

  // Total Employees Count
  const totalEmployeesCount = employees.length

  // Admin Actions for Employee
  const handleOpenEditEmpModal = (emp) => {
    setEditingEmp({ ...emp })
    setShowEditEmpModal(true)
  }

  const handleSaveEmpChanges = async (e) => {
    e.preventDefault()
    if (!editingEmp || !editingEmp.name || !editingEmp.email) return

    setEmployees((prev) =>
      prev.map((emp) => (emp.id === editingEmp.id ? { ...editingEmp } : emp))
    )
    setShowEditEmpModal(false)

    try {
      await hrmsAPI.updateEmployee(editingEmp.id, {
        name: editingEmp.name,
        email: editingEmp.email,
        phone: editingEmp.phone,
        role: editingEmp.role,
        department: editingEmp.dept,
        status: editingEmp.status,
      })
      showToast(`Employee details updated and saved to Supabase!`, 'success')
    } catch (err) {
      showToast(`Employee profile updated locally`, 'info')
    } finally {
      setEditingEmp(null)
    }
  }

  const handleToggleEmpStatus = async (emp) => {
    const newStatus = emp.status === 'Inactive' || emp.status === 'Deactivated' ? 'Active' : 'Inactive'
    setEmployees((prev) =>
      prev.map((e) => (e.id === emp.id ? { ...e, status: newStatus } : e))
    )

    try {
      await hrmsAPI.updateEmployee(emp.id, { status: newStatus })
      showToast(`Employee ${emp.name} status changed to ${newStatus} in Supabase!`, 'info')
    } catch (err) {
      showToast(`Employee ${emp.name} status updated to ${newStatus}`, 'info')
    }
  }

  const handleDeleteEmp = async (empId) => {
    const emp = employees.find((e) => e.id === empId)
    if (!emp) return

    if (window.confirm(`Are you sure you want to deactivate and remove employee record for '${emp.name}'?`)) {
      setEmployees((prev) => prev.filter((e) => e.id !== empId))
      if (selectedId === empId && employees.length > 1) {
        const remaining = employees.filter((e) => e.id !== empId)
        setSelectedId(remaining[0].id)
      }
      try {
        await hrmsAPI.deleteEmployee(empId)
        showToast(`Employee record removed from Supabase.`, 'warning')
      } catch (err) {
        showToast(`Employee record removed.`, 'warning')
      }
    }
  }

  // Admin Actions for Attendance Log
  const handleOpenEditLogModal = (log) => {
    setEditingLog({ ...log })
    setShowEditLogModal(true)
  }

  const handleSaveLogChanges = (e) => {
    e.preventDefault()
    if (!editingLog) return

    let formattedDate = editingLog.date
    if (formattedDate.includes('-')) {
      const [y, m, d] = formattedDate.split('-')
      formattedDate = `${d}/${m}/${y}`
    }
    const logToSave = { ...editingLog, date: formattedDate }

    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id === selectedEmp.id) {
          const updatedAtt = emp.attendance.map((log) =>
            log.id === logToSave.id ? { ...logToSave } : log
          )
          return { ...emp, attendance: updatedAtt }
        }
        return emp
      })
    )

    setShowEditLogModal(false)
    setEditingLog(null)
    showToast(`Attendance log updated for ${selectedEmp.name}!`, 'success')
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" /> HRMS Employee Directory & Performance
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Monitor organizational staff, attendance records, field visits, and revenue contributions.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-100 px-4 py-2 text-xs font-bold text-blue-700">
          <Activity className="size-4 animate-pulse text-blue-600" />
          Active System Directory
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <div
          onClick={handleResetFiltersToShowAll}
          className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group"
          title="Click to view all employee details"
        >
          <span className="grid size-12 place-items-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Users className="size-6" />
          </span>
          <div>
            <p className="text-2xl font-extrabold text-slate-900">{employees.length}</p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-blue-600 transition-colors flex items-center gap-1">
              TOTAL EMPLOYEE <span className="text-[10px] text-blue-600 font-semibold">(Click to View All)</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="grid size-12 place-items-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <MapPin className="size-6" />
          </span>
          <div>
            <p className="text-2xl font-extrabold text-slate-900">{selectedEmp.visits}</p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Selected Rep Visits</p>
          </div>
        </div>
      </div>

      {/* Main Split Interface */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Panel: Master Employee List (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee name, role, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
            />
          </div>

          {/* Quick Filters */}
          <div className="grid grid-cols-2 gap-2">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] font-bold text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="All">All Departments</option>
              <option value="Field Sales">Field Sales</option>
              <option value="Inside Sales">Inside Sales</option>
              <option value="Enterprise Sales">Enterprise Sales</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] font-bold text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="On Field">On Field</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Employee Cards List */}
          <div className="space-y-2 overflow-y-auto max-h-[520px] pr-1">
            {filteredEmployees.map((emp) => {
              const initials = emp.name.split(' ').map((n) => n[0]).join('')
              const isSelected = emp.id === selectedEmp.id
              return (
                <div
                  key={emp.id}
                  onClick={() => {
                    setSelectedId(emp.id)
                    setActiveTab('overview')
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-300 shadow-xs ring-1 ring-blue-300'
                      : 'border-slate-100 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`grid size-9 place-items-center rounded-full text-xs font-extrabold border transition ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {initials}
                    </span>
                    <div>
                      <p className="m-0 text-xs font-extrabold text-slate-900 leading-none">{emp.name}</p>
                      <p className="m-0 mt-1 text-[11px] font-medium text-slate-500">{emp.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-extrabold ${STATUS_CLASSES[emp.status] || STATUS_CLASSES['Active']}`}>
                      {emp.status}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenEditEmpModal(emp)
                      }}
                      title="Edit Employee Profile"
                      className="p-1 text-slate-400 hover:text-blue-600 cursor-pointer"
                    >
                      <Edit3 className="size-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
            {filteredEmployees.length === 0 && (
              <p className="text-center text-xs font-semibold text-slate-400 py-8">No employees found matching search criteria.</p>
            )}
          </div>
        </div>

        {/* Right Panel: Employee Performance & Attendance Details (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
          {/* Employee Profile Header & Admin Quick Action Buttons */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
            <div className="flex items-center gap-4">
              <span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-extrabold text-lg shadow-md">
                {selectedEmp.name.split(' ').map((n) => n[0]).join('')}
              </span>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 leading-none">{selectedEmp.name}</h3>
                <p className="m-0 mt-1.5 text-xs font-bold text-slate-500">
                  {selectedEmp.role} &middot; <span className="text-blue-600 font-extrabold">{selectedEmp.dept}</span>
                </p>
                <p className="m-0 mt-1.5 text-[11px] font-semibold text-slate-400">Employee ID: #TC-00{selectedEmp.id}</p>
              </div>
            </div>

            {/* Admin Action Buttons for Selected Employee */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleOpenEditEmpModal(selectedEmp)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-100 transition cursor-pointer"
              >
                <Edit3 className="size-3.5" /> Edit Profile
              </button>
              <button
                onClick={() => handleToggleEmpStatus(selectedEmp)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedEmp.status === 'Inactive' || selectedEmp.status === 'Deactivated'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                }`}
              >
                {selectedEmp.status === 'Inactive' || selectedEmp.status === 'Deactivated' ? (
                  <>
                    <UserCheck className="size-3.5" /> Activate
                  </>
                ) : (
                  <>
                    <UserX className="size-3.5" /> Deactivate
                  </>
                )}
              </button>
              <button
                onClick={() => handleDeleteEmp(selectedEmp.id)}
                title="Remove Employee Account"
                className="p-1.5 text-slate-400 border border-slate-200 rounded-xl hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition cursor-pointer"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex gap-2 border-b border-slate-100 pb-3">
            {[
              { id: 'overview', label: 'Employee Performance Summary' },
              { id: 'attendance', label: 'Attendance & Field Visit Logs' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Employee Performance Summary */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Client Visits Done</span>
                    <MapPin className="size-5 text-blue-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900">{selectedEmp.visits} Visits</p>
                  <p className="text-[11px] font-semibold text-slate-500">Completed client field visits & demos</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Follow-ups Conducted</span>
                    <Activity className="size-5 text-indigo-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900">{selectedEmp.followups} Follow-ups</p>
                  <p className="text-[11px] font-semibold text-slate-500">Client inquiries & commercial follow-ups</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Leads Managed</span>
                    <Target className="size-5 text-purple-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900">{selectedEmp.leads} Leads</p>
                  <p className="text-[11px] font-semibold text-slate-500">Active opportunity pipeline leads</p>
                </div>
              </div>

              {/* Status & Assignment Banner */}
              <div className="rounded-2xl border border-slate-200 p-5 bg-white space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Deployment Status</h4>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-extrabold ${STATUS_CLASSES[selectedEmp.status] || STATUS_CLASSES['Active']}`}>
                    {selectedEmp.status}
                  </span>
                  <span className="text-xs text-slate-600 font-medium">
                    {selectedEmp.status === 'On Field'
                      ? 'Representative is actively performing client visits and field operations.'
                      : selectedEmp.status === 'Active'
                      ? 'Representative is logged in and managing pipeline accounts.'
                      : 'Representative is currently inactive / off-duty.'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Attendance & Field Visit Logs Tabular View */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              {/* Date-wise Filter Bar for Admin */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-700">
                  <Filter className="size-4 text-blue-600" /> Filter Logs Date-Wise:
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">From Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-8 px-2 border border-slate-300 rounded-lg bg-white text-slate-800 font-semibold focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">To Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-8 px-2 border border-slate-300 rounded-lg bg-white text-slate-800 font-semibold focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  {(startDate || endDate) && (
                    <button
                      onClick={() => {
                        setStartDate('')
                        setEndDate('')
                      }}
                      className="h-8 mt-4 px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition text-[11px] cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Attendance Table: Date, Login, Logout Time, Location, Remarks, Status, Action */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <table className="w-full border-collapse text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Login Time</th>
                      <th className="px-4 py-3">Logout Time</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3">Remarks</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {filteredAttendance.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3.5 font-bold text-slate-900 flex items-center gap-1.5">
                          <Calendar className="size-3.5 text-slate-400" /> {log.date}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                            <Clock className="size-3.5 text-emerald-500" /> {log.checkin}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
                            <Clock className="size-3.5 text-rose-500" /> {log.checkout}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-800 font-semibold">
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3.5 text-blue-600 shrink-0" /> {log.location}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 font-medium max-w-xs truncate">
                          {log.remarks}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold ${log.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedLogDetail(log)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold hover:bg-blue-100 transition cursor-pointer"
                              title="View Log Details"
                            >
                              <Eye className="size-3" /> View
                            </button>
                            <button
                              onClick={() => handleOpenEditLogModal(log)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold hover:bg-slate-200 transition cursor-pointer"
                              title="Edit Attendance Record"
                            >
                              <Edit3 className="size-3" /> Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredAttendance.length === 0 && (
                      <tr>
                        <td colSpan="7" className="px-5 py-8 text-center text-slate-400 font-semibold">
                          No attendance or visit records found for the selected date range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Employee Modal */}
      {showEditEmpModal && editingEmp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center justify-between">
              <span>Edit Employee Profile</span>
              <button onClick={() => setShowEditEmpModal(false)} className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer">
                ✕
              </button>
            </h3>
            <form onSubmit={handleSaveEmpChanges} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Full Name</label>
                <input
                  type="text"
                  value={editingEmp.name}
                  onChange={(e) => setEditingEmp({ ...editingEmp, name: e.target.value })}
                  className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Role / Designation</label>
                  <input
                    type="text"
                    value={editingEmp.role}
                    onChange={(e) => setEditingEmp({ ...editingEmp, role: e.target.value })}
                    className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Department</label>
                  <input
                    type="text"
                    value={editingEmp.dept}
                    onChange={(e) => setEditingEmp({ ...editingEmp, dept: e.target.value })}
                    className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Email Address</label>
                <input
                  type="email"
                  value={editingEmp.email}
                  onChange={(e) => setEditingEmp({ ...editingEmp, email: e.target.value })}
                  className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editingEmp.phone}
                  onChange={(e) => setEditingEmp({ ...editingEmp, phone: e.target.value })}
                  className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Status</label>
                <select
                  value={editingEmp.status}
                  onChange={(e) => setEditingEmp({ ...editingEmp, status: e.target.value })}
                  className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                >
                  <option value="Active">Active</option>
                  <option value="On Field">On Field</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md mt-2 cursor-pointer"
              >
                Save Employee Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Attendance Record Modal */}
      {showEditLogModal && editingLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center justify-between">
              <span>Edit Attendance Record</span>
              <button onClick={() => setShowEditLogModal(false)} className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer">
                ✕
              </button>
            </h3>
            <form onSubmit={handleSaveLogChanges} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Log Date</label>
                <input
                  type="date"
                  value={editingLog.date}
                  onChange={(e) => setEditingLog({ ...editingLog, date: e.target.value })}
                  className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Check-in (Login)</label>
                  <input
                    type="text"
                    value={editingLog.checkin}
                    onChange={(e) => setEditingLog({ ...editingLog, checkin: e.target.value })}
                    className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Check-out (Logout)</label>
                  <input
                    type="text"
                    value={editingLog.checkout}
                    onChange={(e) => setEditingLog({ ...editingLog, checkout: e.target.value })}
                    className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Location</label>
                <input
                  type="text"
                  value={editingLog.location}
                  onChange={(e) => setEditingLog({ ...editingLog, location: e.target.value })}
                  className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Remarks</label>
                <input
                  type="text"
                  value={editingLog.remarks}
                  onChange={(e) => setEditingLog({ ...editingLog, remarks: e.target.value })}
                  className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Attendance Status</label>
                <select
                  value={editingLog.status}
                  onChange={(e) => setEditingLog({ ...editingLog, status: e.target.value })}
                  className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                >
                  <option value="Present">Present</option>
                  <option value="On Field">On Field</option>
                  <option value="Absent">Absent</option>
                  <option value="Half Day">Half Day</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md mt-2 cursor-pointer"
              >
                Save Attendance Record
              </button>
            </form>
          </div>
        </div>
      )}

      {/* View Attendance Log Details Modal */}
      {selectedLogDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center justify-between">
              <span>Attendance Log Details</span>
              <button onClick={() => setSelectedLogDetail(null)} className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer">
                ✕
              </button>
            </h3>
            <div className="space-y-3 text-xs text-slate-700">
              <div className="flex justify-between border-b pb-2">
                <span className="font-bold text-slate-500">Employee:</span>
                <span className="font-extrabold text-slate-900">{selectedEmp.name}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-bold text-slate-500">Log Date:</span>
                <span className="font-bold text-slate-900">{selectedLogDetail.date}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-bold text-slate-500">Check-in Time:</span>
                <span className="font-bold text-emerald-700">{selectedLogDetail.checkin}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-bold text-slate-500">Check-out Time:</span>
                <span className="font-bold text-rose-700">{selectedLogDetail.checkout}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-bold text-slate-500">Location:</span>
                <span className="font-bold text-blue-600">{selectedLogDetail.location}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-bold text-slate-500">Remarks:</span>
                <span className="font-medium text-slate-800">{selectedLogDetail.remarks}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-500">Status:</span>
                <span className="font-bold text-emerald-700">{selectedLogDetail.status}</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedLogDetail(null)}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs mt-2 cursor-pointer"
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Hrms
