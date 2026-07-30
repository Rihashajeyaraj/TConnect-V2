import { useState } from 'react'
import { useToast } from '../../common/ToastContext.jsx'
import {
  Users,
  Search,
  ArrowUpRight,
  TrendingUp,
  Percent,
  CheckCircle,
  MoreVertical,
  Activity,
  Award,
  Calendar,
  Clock,
  Briefcase,
  User,
  ShieldCheck,
  XCircle,
  Mail,
  Phone,
  Building,
} from 'lucide-react'

const initialEmployees = [
  {
    id: '1',
    name: 'John Doe',
    role: 'Sales Executive',
    dept: 'Field Sales',
    leads: 42,
    visits: 28,
    target: 92,
    conversion: 14,
    status: 'On Field',
    email: 'john.doe@twiteconnect.in',
    phone: '+91 98765 43210',
    attendance: [
      { id: 'a1', date: '28 Apr 2026', checkin: '09:05 AM', checkout: '06:15 PM', status: 'Present', device: 'Mobile', ip: '192.168.1.12' },
      { id: 'a2', date: '27 Apr 2026', checkin: '08:58 AM', checkout: '06:05 PM', status: 'Present', device: 'Mobile', ip: '192.168.1.12' },
      { id: 'a3', date: '26 Apr 2026', checkin: '09:02 AM', checkout: '06:10 PM', status: 'Present', device: 'Mobile', ip: '192.168.1.12' }
    ],
    leaves: [
      { id: 'l1', type: 'Sick Leave', start: '30 Apr 2026', end: '01 May 2026', days: 2, reason: 'High fever', status: 'Pending' }
    ]
  },
  {
    id: '2',
    name: 'Mary Jane',
    role: 'Sales Executive',
    dept: 'Inside Sales',
    leads: 56,
    visits: 12,
    target: 110,
    conversion: 18,
    status: 'Active',
    email: 'mary.jane@twiteconnect.in',
    phone: '+91 87654 32109',
    attendance: [
      { id: 'a1', date: '28 Apr 2026', checkin: '08:55 AM', checkout: '05:45 PM', status: 'Present', device: 'Mobile', ip: '192.168.1.10' },
      { id: 'a2', date: '27 Apr 2026', checkin: '09:00 AM', checkout: '05:50 PM', status: 'Present', device: 'Mobile', ip: '192.168.1.10' }
    ],
    leaves: [
      { id: 'l2', type: 'Casual Leave', start: '10 May 2026', end: '12 May 2026', days: 3, reason: 'Family function', status: 'Approved' }
    ]
  },
  {
    id: '3',
    name: 'Robert Smith',
    role: 'Sales Specialist',
    dept: 'Enterprise Sales',
    leads: 24,
    visits: 15,
    target: 85,
    conversion: 22,
    status: 'Active',
    email: 'robert.smith@twiteconnect.in',
    phone: '+91 76543 21098',
    attendance: [
      { id: 'a1', date: '28 Apr 2026', checkin: '09:15 AM', checkout: '06:30 PM', status: 'Present', device: 'Mobile', ip: '192.168.1.11' },
      { id: 'a2', date: '27 Apr 2026', checkin: '09:05 AM', checkout: '06:15 PM', status: 'Present', device: 'Mobile', ip: '192.168.1.11' }
    ],
    leaves: [
      { id: 'l3', type: 'Paid Leave', start: '05 May 2026', end: '05 May 2026', days: 1, reason: 'Personal work', status: 'Approved' }
    ]
  },
  {
    id: '4',
    name: 'David Brown',
    role: 'Sales Executive',
    dept: 'Field Sales',
    leads: 38,
    visits: 32,
    target: 98,
    conversion: 12,
    status: 'On Field',
    email: 'david.brown@twiteconnect.in',
    phone: '+91 65432 10987',
    attendance: [
      { id: 'a1', date: '28 Apr 2026', checkin: '09:00 AM', checkout: '06:00 PM', status: 'Present', device: 'Mobile', ip: '192.168.1.14' }
    ],
    leaves: []
  },
  {
    id: '5',
    name: 'Karthik R',
    role: 'Sales Executive',
    dept: 'Field Sales',
    leads: 40,
    visits: 24,
    target: 102,
    conversion: 15,
    status: 'On Field',
    email: 'karthik.r@twiteconnect.in',
    phone: '+91 94440 12345',
    attendance: [
      { id: 'a1', date: '28 Apr 2026', checkin: '08:50 AM', checkout: '05:40 PM', status: 'Present', device: 'Mobile', ip: '192.168.1.16' }
    ],
    leaves: []
  },
  {
    id: '6',
    name: 'Priya S',
    role: 'Sales Executive',
    dept: 'Inside Sales',
    leads: 48,
    visits: 8,
    target: 90,
    conversion: 10,
    status: 'Active',
    email: 'priya.s@twiteconnect.in',
    phone: '+91 98840 54321',
    attendance: [
      { id: 'a1', date: '28 Apr 2026', checkin: '08:45 AM', checkout: '05:30 PM', status: 'Present', device: 'Mobile', ip: '192.168.1.15' }
    ],
    leaves: []
  },
  {
    id: '7',
    name: 'Vikram Singh',
    role: 'Sales Executive',
    dept: 'Field Sales',
    leads: 35,
    visits: 20,
    target: 95,
    conversion: 11,
    status: 'Inactive',
    email: 'vikram.singh@twiteconnect.in',
    phone: '+91 90030 98765',
    attendance: [
      { id: 'a1', date: '28 Apr 2026', checkin: '--', checkout: '--', status: 'Absent', device: '--', ip: '--' }
    ],
    leaves: [
      { id: 'l4', type: 'Sick Leave', start: '20 Apr 2026', end: '21 Apr 2026', days: 2, reason: 'Doctor checkup', status: 'Approved' }
    ]
  }
]

const STATUS_CLASSES = {
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'On Field': 'bg-blue-50 text-blue-700 border-blue-200',
  Inactive: 'bg-slate-50 text-slate-400 border-slate-200',
}

const LEAVE_STATUS_COLORS = {
  Pending: 'text-amber-600 bg-amber-50 border-amber-100',
  Approved: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  Rejected: 'text-rose-600 bg-rose-50 border-rose-100',
}

function Hrms() {
  const { showToast } = useToast()
  const [employees, setEmployees] = useState(initialEmployees)
  const [selectedId, setSelectedId] = useState('1')
  const [searchQuery, setSearchQuery] = useState('')
  const [deptFilter, setDeptFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [activeTab, setActiveTab] = useState('overview') // overview, attendance, leaves

  // Filtered list of employees for the left master sidebar
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          emp.role.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDept = deptFilter === 'All' || emp.dept === deptFilter
    const matchesStatus = statusFilter === 'All' || emp.status === statusFilter
    return matchesSearch && matchesDept && matchesStatus
  })

  // Selected Employee object
  const selectedEmp = employees.find(emp => emp.id === selectedId) || filteredEmployees[0] || employees[0]

  // Summary Metrics
  const totalReps = employees.length
  const activeReps = employees.filter(e => e.status !== 'Inactive').length
  const avgConversion = Math.round(employees.reduce((sum, e) => sum + e.conversion, 0) / employees.length)
  const pendingLeavesCount = employees.reduce(
    (sum, e) => sum + e.leaves.filter(l => l.status === 'Pending').length,
    0
  )

  // Handle Leave Status Changes
  const handleLeaveStatus = (empId, leaveId, newStatus) => {
    setEmployees(prev =>
      prev.map(emp => {
        if (emp.id === empId) {
          const updatedLeaves = emp.leaves.map(l => {
            if (l.id === leaveId) {
              if (newStatus === 'Approved') {
                showToast(`Approved ${emp.name}'s ${l.type} request.`, 'success')
              } else {
                showToast(`Rejected ${emp.name}'s ${l.type} request.`, 'warning')
              }
              return { ...l, status: newStatus }
            }
            return l
          })
          return { ...emp, leaves: updatedLeaves }
        }
        return emp
      })
    )
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">HRMS Directory</h2>
          <p className="mt-1 text-xs font-semibold text-slate-400">Home &gt; HRMS</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-3.5 py-1.5 text-xs font-bold text-blue-700">
          <Activity className="size-4 animate-pulse text-blue-600" />
          {activeReps} of {totalReps} Representatives Active Today
        </div>
      </div>

      {/* Summary KPI Panel */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="grid size-12 place-items-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <Users className="size-6" />
          </span>
          <div>
            <p className="text-2xl font-extrabold text-slate-900">{totalReps}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Headcount</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="grid size-12 place-items-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Percent className="size-6" />
          </span>
          <div>
            <p className="text-2xl font-extrabold text-slate-900">{avgConversion}%</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Conversion Rate</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="grid size-12 place-items-center rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
            <Clock className="size-6" />
          </span>
          <div>
            <p className="text-2xl font-extrabold text-slate-900">{activeReps}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Present Executives</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="grid size-12 place-items-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <Calendar className="size-6" />
          </span>
          <div>
            <p className="text-2xl font-extrabold text-slate-900">{pendingLeavesCount}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Leave Applications</p>
          </div>
        </div>
      </div>

      {/* Main Split Interface */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Panel: Master Employee List (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
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

          {/* Employee Row Item Cards */}
          <div className="space-y-2 overflow-y-auto max-h-[500px] pr-1">
            {filteredEmployees.map((emp) => {
              const initials = emp.name.split(' ').map(n => n[0]).join('')
              const isSelected = emp.id === selectedEmp.id
              return (
                <button
                  key={emp.id}
                  onClick={() => {
                    setSelectedId(emp.id)
                    setActiveTab('overview')
                  }}
                  className={`w-full flex items-center justify-between text-left p-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-blue-50/50 border-blue-200 shadow-sm ring-1 ring-blue-200'
                      : 'border-slate-100 bg-white hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`grid size-9 place-items-center rounded-full text-xs font-bold border transition ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      {initials}
                    </span>
                    <div>
                      <p className="m-0 text-sm font-bold text-slate-900 leading-none">{emp.name}</p>
                      <p className="m-0 mt-1 text-[11px] font-medium text-slate-400">{emp.role}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold ${STATUS_CLASSES[emp.status]}`}>
                    {emp.status}
                  </span>
                </button>
              )
            })}
            {filteredEmployees.length === 0 && (
              <p className="text-center text-xs font-semibold text-slate-400 py-8">No employees match filters</p>
            )}
          </div>
        </div>

        {/* Right Panel: Detail Panel (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
          {/* Employee Header Profile */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
            <div className="flex items-center gap-4">
              <span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-[#A8C2FF] to-[#3B82F6] text-lg font-black text-black border border-white/20 shadow-md">
                {selectedEmp.name.split(' ').map(n => n[0]).join('')}
              </span>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 leading-none">{selectedEmp.name}</h3>
                <p className="m-0 mt-1.5 text-xs font-bold text-slate-450 uppercase leading-none">
                  {selectedEmp.role} &middot; <span className="text-blue-600">{selectedEmp.dept}</span>
                </p>
                <p className="m-0 mt-2 text-[10px] font-bold text-slate-400">ID: #TC-00{selectedEmp.id}</p>
              </div>
            </div>

            <div className="flex flex-col gap-1 text-xs font-bold text-slate-500 sm:text-right">
              <span className="flex items-center gap-1.5 justify-start sm:justify-end">
                <Mail className="size-3.5 text-slate-400" />
                {selectedEmp.email}
              </span>
              <span className="flex items-center gap-1.5 justify-start sm:justify-end mt-1">
                <Phone className="size-3.5 text-slate-400" />
                {selectedEmp.phone}
              </span>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex gap-2 border-b border-slate-100 pb-3">
            {[
              { id: 'overview', label: 'Overview & Performance' },
              { id: 'attendance', label: 'Attendance History' },
              { id: 'leaves', label: 'Leave Applications' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Overview & Performance */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lead Management</span>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1">{selectedEmp.leads}</p>
                  <p className="text-[10px] font-semibold text-slate-500 mt-1">Total active leads currently managed</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Client Visits</span>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1">{selectedEmp.visits}</p>
                  <p className="text-[10px] font-semibold text-slate-500 mt-1">Visits completed in the current cycle</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Conversion Rate</span>
                  <p className="text-2xl font-extrabold text-blue-600 mt-1">{selectedEmp.conversion}%</p>
                  <p className="text-[10px] font-semibold text-slate-500 mt-1">Leads successfully converted to customers</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Achievement</span>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden max-w-[150px]">
                      <div
                        className={`h-full rounded-full ${
                          selectedEmp.target >= 100 ? 'bg-emerald-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(selectedEmp.target, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-black text-slate-800">{selectedEmp.target}%</span>
                  </div>
                  <p className="text-[10px] font-semibold text-slate-500 mt-2">Rep progress against monthly KPIs</p>
                </div>
              </div>

              {/* Status Section */}
              <div className="rounded-2xl border border-slate-150 p-5 bg-white space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Representative Deployment</h4>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-bold ${STATUS_CLASSES[selectedEmp.status]}`}>
                    {selectedEmp.status}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {selectedEmp.status === 'On Field'
                      ? 'Executive is actively handling client visits outside the main hub.'
                      : selectedEmp.status === 'Active'
                      ? 'Executive is logged in and managing internal workspace pipelines.'
                      : 'Executive is currently inactive or off-duty.'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Attendance History */}
          {activeTab === 'attendance' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full border-collapse text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Check-In</th>
                      <th className="px-5 py-3">Check-Out</th>
                      <th className="px-5 py-3">Device</th>
                      <th className="px-5 py-3">IP Address</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {selectedEmp.attendance.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-5 py-3.5 flex items-center gap-1.5 text-slate-900 font-bold"><Calendar className="size-3.5 text-slate-400" />{log.date}</td>
                        <td className="px-5 py-3.5"><span className="flex items-center gap-1 text-slate-900"><Clock className="size-3.5 text-emerald-500" />{log.checkin}</span></td>
                        <td className="px-5 py-3.5"><span className="flex items-center gap-1 text-slate-900"><Clock className="size-3.5 text-rose-500" />{log.checkout}</span></td>
                        <td className="px-5 py-3.5 text-slate-500 font-medium">{log.device}</td>
                        <td className="px-5 py-3.5 text-slate-500 font-medium">{log.ip}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold ${log.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {selectedEmp.attendance.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-5 py-8 text-center text-slate-400 font-semibold">No attendance log available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Leave Management */}
          {activeTab === 'leaves' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full border-collapse text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-3">Leave Type</th>
                      <th className="px-5 py-3">Dates</th>
                      <th className="px-5 py-3 text-center">Days</th>
                      <th className="px-5 py-3">Reason</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Approval Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {selectedEmp.leaves.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-5 py-3.5 text-slate-900 font-bold">{l.type}</td>
                        <td className="px-5 py-3.5"><span className="flex items-center gap-1 text-slate-900"><Calendar className="size-3.5 text-slate-400" />{l.start} to {l.end}</span></td>
                        <td className="px-5 py-3.5 text-center font-bold text-slate-900">{l.days}</td>
                        <td className="px-5 py-3.5 text-slate-500 font-medium max-w-xs truncate">{l.reason}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold ${LEAVE_STATUS_COLORS[l.status]}`}>
                            {l.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {l.status === 'Pending' ? (
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleLeaveStatus(selectedEmp.id, l.id, 'Approved')}
                                className="flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[10px] font-black text-emerald-700 hover:bg-emerald-100/70 transition"
                              >
                                <ShieldCheck className="size-3" /> Approve
                              </button>
                              <button
                                onClick={() => handleLeaveStatus(selectedEmp.id, l.id, 'Rejected')}
                                className="flex items-center gap-1 rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-[10px] font-black text-rose-700 hover:bg-rose-100/70 transition"
                              >
                                <XCircle className="size-3" /> Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-400">Decision logged</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {selectedEmp.leaves.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-5 py-8 text-center text-slate-400 font-semibold">No leave applications filed</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Hrms
