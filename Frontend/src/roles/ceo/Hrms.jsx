import React, { useState, useEffect } from 'react'
import { useToast } from '../../common/ToastContext.jsx'
import {
  Briefcase,
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
  Plus,
  ShieldCheck,
  Check,
  X,
  FileText,
  UserCheck,
  History,
  MessageSquare,
} from 'lucide-react'
import { hrmsAPI, attendanceAPI, userAPI } from '../../services/api.js'
import { exportToCSV } from '../../utils/exportUtils.js'

function CeoHrms({ initialTab = 'employees' }) {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState(initialTab) // 'employees' | 'leaves' | 'permissions' | 'attendance' | 'approval_history'
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // 1. Employees Directory State
  const [employees, setEmployees] = useState([
    { id: 'EMP-001', name: 'Vikram Singh', email: 'vikram@tconnect.com', role: 'Sales Manager', department: 'Sales & BD', status: 'Active', checkin: '09:05 AM' },
    { id: 'EMP-002', name: 'Suresh V', email: 'suresh@tconnect.com', role: 'Sales Manager', department: 'Sales & BD', status: 'Active', checkin: '08:55 AM' },
    { id: 'EMP-003', name: 'Ananya Roy', email: 'ananya@tconnect.com', role: 'Sales Executive', department: 'Field Sales', status: 'Active', checkin: '09:12 AM' },
    { id: 'EMP-004', name: 'Karthik Raja', email: 'karthik@tconnect.com', role: 'Sales Executive', department: 'Field Sales', status: 'Active', checkin: '09:18 AM' },
    { id: 'EMP-005', name: 'Priya Sharma', email: 'priya@tconnect.com', role: 'Admin', department: 'Operations', status: 'Active', checkin: '08:50 AM' },
    { id: 'EMP-006', name: 'Robert Smith', email: 'robert@tconnect.com', role: 'Sales Executive', department: 'Inside Sales', status: 'Active', checkin: '09:02 AM' },
  ])

  // 2. Leave Requests State
  const [leaveRequests, setLeaveRequests] = useState([
    {
      id: 'LV-501',
      employee_name: 'Vikram Singh',
      role: 'Sales Manager',
      leave_type: 'Sick Leave',
      duration: '1 Day (Aug 9, 2026)',
      reason: 'Severe Migraine and medical checkup',
      status: 'Pending',
      submitted_at: '2026-08-08 08:30 AM',
    },
    {
      id: 'LV-502',
      employee_name: 'Robert Smith',
      role: 'Sales Executive',
      leave_type: 'Casual Leave',
      duration: '2 Days (Aug 12-13, 2026)',
      reason: 'Family Event in native town',
      status: 'Pending',
      submitted_at: '2026-08-07 04:15 PM',
    },
    {
      id: 'LV-503',
      employee_name: 'Ananya Roy',
      role: 'Sales Executive',
      leave_type: 'Paid Leave',
      duration: '1 Day (Aug 05, 2026)',
      reason: 'Personal work',
      status: 'Approved',
      submitted_at: '2026-08-04 10:00 AM',
      reviewed_by: 'CEO Office',
    },
  ])

  // 3. Permission Requests State
  const [permissionRequests, setPermissionRequests] = useState([
    {
      id: 'PM-701',
      employee_name: 'Ananya Roy',
      role: 'Sales Executive',
      type: 'Early Departure / Field Call',
      timing: '04:30 PM to 06:30 PM (2 Hours)',
      reason: 'Urgent key account closing demo at client HQ in OMR',
      status: 'Pending',
      submitted_at: 'Today, 09:15 AM',
    },
    {
      id: 'PM-702',
      employee_name: 'Karthik Raja',
      role: 'Sales Executive',
      type: 'Late In-time Permission',
      timing: '09:00 AM to 10:30 AM (1.5 Hours)',
      reason: 'Vehicle breakdown on way to morning field visit',
      status: 'Approved',
      submitted_at: 'Yesterday, 08:45 AM',
      reviewed_by: 'CEO Office',
    },
  ])

  // 4. Attendance Summary State
  const [attendanceSummary, setAttendanceSummary] = useState({
    totalEmployees: 18,
    presentToday: 15,
    lateArrivals: 2,
    onLeave: 1,
    absent: 0,
    dailyLogs: [
      { id: 'ATT-1', name: 'Vikram Singh', clockIn: '09:05 AM', clockOut: 'In Progress', mode: 'Biometric', status: 'Present' },
      { id: 'ATT-2', name: 'Suresh V', clockIn: '08:55 AM', clockOut: 'In Progress', mode: 'Biometric', status: 'Present' },
      { id: 'ATT-3', name: 'Ananya Roy', clockIn: '09:12 AM', clockOut: 'In Progress', mode: 'Mobile GPS', status: 'Present' },
      { id: 'ATT-4', name: 'Karthik Raja', clockIn: '09:18 AM', clockOut: 'In Progress', mode: 'Mobile GPS', status: 'Present (Late)' },
      { id: 'ATT-5', name: 'Priya Sharma', clockIn: '08:50 AM', clockOut: 'In Progress', mode: 'Biometric', status: 'Present' },
      { id: 'ATT-6', name: 'Robert Smith', clockIn: '09:02 AM', clockOut: 'In Progress', mode: 'Biometric', status: 'Present' },
    ],
  })

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [reviewRemarks, setReviewRemarks] = useState('')
  const [reviewAction, setReviewAction] = useState('Approved')

  // Load real data from backend
  useEffect(() => {
    async function fetchHrmsData() {
      setLoading(true)
      try {
        const empRes = await hrmsAPI.getEmployees().catch(() => null)
        if (empRes && empRes.data && empRes.data.length > 0) {
          setEmployees(
            empRes.data.map((e, idx) => ({
              id: e.id || `EMP-${100 + idx}`,
              name: e.name || e.full_name || 'Staff Member',
              email: e.email || 'employee@tconnect.com',
              role: e.role || (idx === 0 ? 'Admin' : idx < 3 ? 'Sales Manager' : 'Sales Executive'),
              department: e.department || 'Sales',
              status: e.status || 'Active',
              checkin: '09:00 AM',
            }))
          )
        }

        const leaveRes = await attendanceAPI.getLeaveRequests().catch(() => null)
        if (leaveRes && leaveRes.data && leaveRes.data.length > 0) {
          setLeaveRequests(
            leaveRes.data.map((l, idx) => ({
              id: l.id || `LV-${500 + idx}`,
              employee_name: l.employee_name || l.name || 'Team Member',
              role: l.role || 'Sales Executive',
              leave_type: l.leave_type || 'Leave',
              duration: l.duration || '1 Day',
              reason: l.reason || 'Personal necessity',
              status: l.status || 'Pending',
              submitted_at: l.created_at || 'Recent',
              reviewed_by: l.reviewed_by,
            }))
          )
        }

        const attRes = await attendanceAPI.getLogs().catch(() => null)
        if (attRes && attRes.data && attRes.data.length > 0) {
          const logs = attRes.data
          const loggedInCount = logs.filter(l => l.status === 'Logged in' || !l.clockOut || l.clockOut === '—').length
          const loggedOffCount = logs.filter(l => l.status === 'Logged off' || (l.clockOut && l.clockOut !== '—')).length

          setAttendanceSummary(prev => ({
            ...prev,
            presentToday: logs.length,
            dailyLogs: logs.map((l, idx) => ({
              id: l.id || `ATT-${idx + 1}`,
              name: l.name || l.employee_name || 'Staff Member',
              clockIn: l.clockIn || l.check_in_time || '09:00 AM',
              clockOut: l.clockOut || l.check_out_time || '—',
              workHours: l.workHours || l.total_working_hours || (l.clockOut && l.clockOut !== '—' ? '8.5 hrs' : 'In Progress'),
              mode: l.mode || 'Biometric',
              status: l.status || (l.clockOut && l.clockOut !== '—' ? 'Logged off' : 'Logged in'),
            }))
          }))
        }
      } catch (err) {
        console.warn('HRMS loaded standard dataset:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchHrmsData()
  }, [])

  // Action handlers
  const handleOpenReview = (req, defaultAction = 'Approved') => {
    setSelectedRequest(req)
    setReviewAction(defaultAction)
    setReviewRemarks('')
    setReviewModalOpen(true)
  }

  const handleConfirmDecision = async () => {
    if (!selectedRequest) return
    const isLeave = selectedRequest.leave_type !== undefined

    try {
      if (isLeave) {
        await attendanceAPI.updateLeaveStatus(selectedRequest.id, reviewAction, reviewRemarks)
        setLeaveRequests((prev) =>
          prev.map((l) =>
            l.id === selectedRequest.id
              ? { ...l, status: reviewAction, reviewed_by: 'Chief Executive Officer', remarks: reviewRemarks }
              : l
          )
        )
      } else {
        await attendanceAPI.updateLeaveStatus(selectedRequest.id, reviewAction, reviewRemarks)
        setPermissionRequests((prev) =>
          prev.map((p) =>
            p.id === selectedRequest.id
              ? { ...p, status: reviewAction, reviewed_by: 'Chief Executive Officer', remarks: reviewRemarks }
              : p
          )
        )
      }

      showToast(
        `${isLeave ? 'Leave Request' : 'Permission Request'} for ${selectedRequest.employee_name} has been ${reviewAction}`,
        reviewAction === 'Approved' ? 'success' : 'info'
      )
      setReviewModalOpen(false)
    } catch (err) {
      showToast(`Failed to update leave status: ${err?.message || 'Server Error'}`, 'error')
    }
  }

  // Filtered queries
  const filteredEmployees = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.department.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const pendingLeaves = leaveRequests.filter((l) => l.status === 'Pending')
  const pendingPermissions = permissionRequests.filter((p) => p.status === 'Pending')

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-teal-50 text-[#004749]">
              <Briefcase className="size-4.5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Executive HRMS & Clearances
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-medium max-w-3xl">
            Direct CEO management of organizational staff, leave approvals, field permission requests, and daily attendance logs.
          </p>
        </div>

        {/* Quick Pending Counter */}
        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-bold text-amber-800">
            {pendingLeaves.length + pendingPermissions.length} Pending Clearances
          </span>
        </div>
      </div>

      {/* Primary HRMS Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
        {[
          { id: 'employees', label: 'Employees Directory', icon: Users, badge: employees.length },
          { id: 'leaves', label: 'Leave Requests', icon: Calendar, badge: pendingLeaves.length, alert: pendingLeaves.length > 0 },
          { id: 'permissions', label: 'Permission Requests', icon: Clock, badge: pendingPermissions.length, alert: pendingPermissions.length > 0 },
          { id: 'attendance', label: 'Attendance Summary', icon: UserCheck },
          { id: 'approval_history', label: 'Approval Status & Audit', icon: History },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${isActive
                  ? 'bg-[#004749] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
            >
              <Icon className="size-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`rounded-full px-2 py-0.2 text-[10px] font-black ${isActive
                      ? 'bg-white text-[#004749]'
                      : tab.alert
                        ? 'bg-[#540000] text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── TAB 1: EMPLOYEES DIRECTORY ────────────────────────── */}
      {activeTab === 'employees' && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Corporate Employee Directory
              </h2>
              <p className="text-xs text-slate-500 font-medium">All registered corporate personnel</p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff, role, department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-xs font-semibold placeholder:text-slate-400 outline-none focus:border-[#004749]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3">Employee</th>
                  <th className="pb-3">Designation</th>
                  <th className="pb-3">Department</th>
                  <th className="pb-3">Today's Check-in</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3">
                      <p className="font-extrabold text-slate-900">{emp.name}</p>
                      <p className="text-[10px] text-slate-400">{emp.email}</p>
                    </td>
                    <td className="py-3">
                      <span className="inline-flex rounded-md bg-teal-50 px-2 py-0.5 text-[10px] font-black text-[#004749]">
                        {emp.role}
                      </span>
                    </td>
                    <td className="py-3 text-slate-700">{emp.department}</td>
                    <td className="py-3 text-slate-600 font-bold">{emp.checkin}</td>
                    <td className="py-3">
                      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black text-emerald-700 border border-emerald-200">
                        {emp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: LEAVE REQUESTS ─────────────────────────────── */}
      {activeTab === 'leaves' && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Leave Requests & Approval Queue
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Review and approve/reject staff leave applications
              </p>
            </div>
            <span className="rounded-full bg-[#540000]/10 px-3 py-1 text-xs font-black text-[#540000]">
              {pendingLeaves.length} Pending Actions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3">Applicant & Role</th>
                  <th className="pb-3">Leave Type</th>
                  <th className="pb-3">Duration & Dates</th>
                  <th className="pb-3">Reason</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">CEO Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {leaveRequests.map((leave) => (
                  <tr key={leave.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5">
                      <p className="font-extrabold text-slate-900">{leave.employee_name}</p>
                      <p className="text-[10px] text-slate-400">{leave.role}</p>
                    </td>
                    <td className="py-3.5 font-bold text-slate-800">{leave.leave_type}</td>
                    <td className="py-3.5 text-slate-700">{leave.duration}</td>
                    <td className="py-3.5 text-slate-600 max-w-xs truncate">{leave.reason}</td>
                    <td className="py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black ${leave.status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : leave.status === 'Rejected'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                      >
                        {leave.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      {leave.status === 'Pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenReview(leave, 'Rejected')}
                            className="rounded-lg px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleOpenReview(leave, 'Approved')}
                            className="rounded-lg bg-[#004749] text-white px-3 py-1 text-xs font-bold hover:bg-[#013b3f]"
                          >
                            Approve
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-semibold">
                          Processed by {leave.reviewed_by || 'CEO'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: PERMISSION REQUESTS ────────────────────────── */}
      {activeTab === 'permissions' && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Permission Requests & Field Permissions
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Review early exits, half-days, and on-duty customer field permissions
              </p>
            </div>
            <span className="rounded-full bg-[#540000]/10 px-3 py-1 text-xs font-black text-[#540000]">
              {pendingPermissions.length} Pending Actions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3">Staff Member</th>
                  <th className="pb-3">Permission Type</th>
                  <th className="pb-3">Time Window</th>
                  <th className="pb-3">Justification</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">CEO Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {permissionRequests.map((perm) => (
                  <tr key={perm.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5">
                      <p className="font-extrabold text-slate-900">{perm.employee_name}</p>
                      <p className="text-[10px] text-slate-400">{perm.role}</p>
                    </td>
                    <td className="py-3.5 font-bold text-slate-800">{perm.type}</td>
                    <td className="py-3.5 text-slate-700">{perm.timing}</td>
                    <td className="py-3.5 text-slate-600 max-w-xs truncate">{perm.reason}</td>
                    <td className="py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black ${perm.status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : perm.status === 'Rejected'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                      >
                        {perm.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      {perm.status === 'Pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenReview(perm, 'Rejected')}
                            className="rounded-lg px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleOpenReview(perm, 'Approved')}
                            className="rounded-lg bg-[#004749] text-white px-3 py-1 text-xs font-bold hover:bg-[#013b3f]"
                          >
                            Approve
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-semibold">
                          Processed by {perm.reviewed_by || 'CEO'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: ATTENDANCE SUMMARY ─────────────────────────── */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Summary Counters */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase">Present Today</span>
              <p className="text-2xl font-black text-emerald-600 mt-2">{attendanceSummary.presentToday}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase">Late Arrivals</span>
              <p className="text-2xl font-black text-amber-600 mt-2">{attendanceSummary.lateArrivals}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase">On Approved Leave</span>
              <p className="text-2xl font-black text-blue-600 mt-2">{attendanceSummary.onLeave}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase">Absent</span>
              <p className="text-2xl font-black text-slate-400 mt-2">{attendanceSummary.absent}</p>
            </div>
          </div>

          {/* Daily Logs Table */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Today's Real-time Check-in & Check-out Log
              </h2>
              <span className="text-xs font-bold text-slate-400">Live Telemetry from HRMS</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="pb-3">Employee</th>
                    <th className="pb-3">Clock In (Logged In)</th>
                    <th className="pb-3">Clock Out (Logged Off)</th>
                    <th className="pb-3">Total Working Hours</th>
                    <th className="pb-3">Mode</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {attendanceSummary.dailyLogs.map((log) => {
                    const isLoggedOut = log.status === 'Logged off' || (log.clockOut && log.clockOut !== '—')
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 font-extrabold text-slate-900">{log.name}</td>
                        <td className="py-3 font-bold text-[#004749]">{log.clockIn}</td>
                        <td className="py-3 font-bold text-slate-600">{log.clockOut || '—'}</td>
                        <td className="py-3 font-semibold text-slate-700">{log.workHours || 'In Progress'}</td>
                        <td className="py-3 text-slate-500">{log.mode || 'Biometric'}</td>
                        <td className="py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black border ${isLoggedOut
                                ? 'bg-slate-100 text-slate-700 border-slate-300'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                          >
                            {isLoggedOut ? 'Logged off' : 'Logged in'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: APPROVAL STATUS & AUDIT ─────────────────────── */}
      {activeTab === 'approval_history' && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
            CEO Clearances & Approvals Audit Trail
          </h2>
          <div className="space-y-3">
            {[...leaveRequests, ...permissionRequests]
              .filter((r) => r.status !== 'Pending')
              .map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 text-xs"
                >
                  <div>
                    <p className="font-extrabold text-slate-900">{item.employee_name}</p>
                    <p className="text-[11px] text-slate-500">
                      {item.leave_type || item.type} · {item.duration || item.timing}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black ${item.status === 'Approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                    >
                      {item.status}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Reviewed by Chief Executive Officer</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                {reviewAction} Request for {selectedRequest.employee_name}
              </h3>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/70">
                <span className="font-bold text-slate-500 uppercase text-[10px]">Details</span>
                <p className="font-black text-slate-900 mt-1">
                  {selectedRequest.leave_type || selectedRequest.type}
                </p>
                <p className="text-slate-600 mt-0.5">{selectedRequest.reason}</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">CEO Remarks / Instructions (Optional)</label>
                <textarea
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  placeholder="e.g. Approved. Ensure critical deals are handed over."
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 outline-none focus:border-[#004749]"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setReviewModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDecision}
                className={`rounded-xl px-5 py-2 text-xs font-bold text-white shadow-xs ${reviewAction === 'Approved' ? 'bg-[#004749] hover:bg-[#013b3f]' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
              >
                Confirm {reviewAction}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CeoHrms
