import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  CalendarOff,
  CalendarDays,
  TrendingUp,
  BookOpen,
  Activity,
  Phone,
  Users,
  UserCheck,
  MapPin,
  Target,
  CheckCircle2,
  Clock3,
  Send,
  Medal,
  Upload,
  X,
  Eye,
  FileUp,
  ShieldCheck,
  Award,
  Building2,
  Briefcase,
  Mail,
  PhoneCall,
  Star,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  PlusCircle,
} from 'lucide-react'
import useCurrentUser from '../../hooks/useCurrentUser.js'
import { useToast } from '../../common/ToastContext.jsx'
import { attendanceAPI } from '../../services/api.js'
import { calculateWorkHours } from '../sales/Attendance.jsx'

const NAV_ITEMS = [
  { key: 'dashboard',   label: 'My Dashboard',        icon: LayoutDashboard },
  { key: 'team_leave',  label: 'Team Leave Approval', icon: UserCheck      },
  { key: 'leave',       label: 'My Leave',            icon: CalendarOff    },
  { key: 'calendar',    label: 'Holiday Calendar',    icon: CalendarDays   },
  { key: 'handbook',    label: 'Manager Handbook',    icon: BookOpen       },
  { key: 'activity',    label: 'Activity Logs',       icon: Activity       },
]

const HOLIDAYS = [
  { date: '15 Aug 2026', name: 'Independence Day',    type: 'National' },
  { date: '02 Oct 2026', name: 'Gandhi Jayanti',      type: 'National' },
  { date: '24 Oct 2026', name: 'Diwali',              type: 'Festival' },
  { date: '25 Dec 2026', name: 'Christmas',           type: 'Festival' },
  { date: '01 Jan 2027', name: 'New Year',            type: 'Festival' },
  { date: '14 Jan 2027', name: 'Pongal',              type: 'Regional' },
]

const HANDBOOK = [
  { title: 'Team Management',     icon: '👥', content: 'Conduct weekly 1-on-1 sessions with each SE. Review daily EOD reports by 7 PM. Flag blockers immediately.' },
  { title: 'Lead Oversight',      icon: '🎯', content: 'Review all new leads within 24 hours. Reassign stale leads (no contact > 3 days). Approve lead category changes from SE.' },
  { title: 'Visit Audit Process', icon: '🗺️', content: 'Review GPS check-in/out for each SE. Flag visits without selfie or GPS location. Audit visit quality monthly.' },
  { title: 'Expense Approvals',   icon: '💰', content: 'Review all expense claims within 48 hours. Reject without receipt. Approve only field visit related expenses. Max ₹5,000/claim without MD approval.' },
  { title: 'Leave Policy',        icon: '📅', content: 'Manager must approve or reject leave in 24 hours. Max 2 team members on leave simultaneously. Manager leave requires MD approval.' },
  { title: 'Performance Targets', icon: '📊', content: 'Team Monthly Revenue Target: ₹25L. Each SE minimum 3 field visits/week. Weekly conversion rate target: 35%+.' },
  { title: 'Escalation Protocol', icon: '⚠️', content: 'Escalate large deals >₹10L to Regional Manager. Client complaints must be resolved within 48 hours. Escalate absentees >2 consecutive days.' },
  { title: 'Ethics & Compliance', icon: '🛡️', content: 'No unauthorized discounts beyond approved slabs. All deals must be logged in TwiteConnect. Confidential client data not to be shared externally.' },
]

const DEFAULT_TEAM_LEAVE_REQUESTS = [
  {
    id: 'LR-001',
    executive: 'Ashwini E',
    employeeCode: 'EMP-105',
    leaveType: 'Sick Leave',
    fromDate: '08/08/2026',
    toDate: '09/08/2026',
    days: 2,
    reason: 'Fever & medical rest as per doctor advice.',
    status: 'Pending',
    appliedOn: '05/08/2026',
  },
  {
    id: 'LR-002',
    executive: 'Suresh Raina',
    employeeCode: 'EMP-106',
    leaveType: 'Casual Leave',
    fromDate: '10/08/2026',
    toDate: '10/08/2026',
    days: 1,
    reason: 'Family function attendance.',
    status: 'Pending',
    appliedOn: '05/08/2026',
  },
  {
    id: 'LR-003',
    executive: 'Abi hastro',
    employeeCode: 'EMP000012',
    leaveType: 'Earned Leave',
    fromDate: '15/08/2026',
    toDate: '16/08/2026',
    days: 2,
    reason: 'Personal work and Independence Day trip.',
    status: 'Approved',
    appliedOn: '04/08/2026',
    managerRemark: 'Approved. Ensure leads are followed up before leave.',
  },
]

const LEAVE_TYPES = ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Emergency Leave', 'Half Day', 'Work From Home']

const LEAVE_BALANCE = [
  { type: 'Casual Leave',   total: 12, used: 3,  remaining: 9  },
  { type: 'Sick Leave',     total: 10, used: 1,  remaining: 9  },
  { type: 'Earned Leave',   total: 20, used: 5,  remaining: 15 },
  { type: 'Emergency Leave',total: 5,  used: 0,  remaining: 5  },
]

export default function ManagerHrms() {
  const currentUser = useCurrentUser()
  const { showToast } = useToast()

  const managerName  = currentUser.name || currentUser.full_name || 'Sales Manager'
  const managerEmail = (currentUser.email || '').toLowerCase().trim()
  const empCode      = currentUser.employee_code || currentUser.employee_id || 'MGR-001'
  const [activeSection, setActiveSection] = useState('dashboard')

  // ── Attendance State for My Dashboard ─────────────────────────────────────
  const [realAttendanceLogs, setRealAttendanceLogs] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("tc_attendance_logs") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [reportFilterMode, setReportFilterMode] = useState("THIS MONTH");
  const [customDateFilter, setCustomDateFilter] = useState("");

  useEffect(() => {
    attendanceAPI.getLogs()
      .then((res) => {
        if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
          setRealAttendanceLogs(res.data);
        }
      })
      .catch(() => null);
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getArr = (key) => { try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] } }

  // ── Team Leave Approval State ──────────────────────────────────────────────
  const [teamLeaveRequests, setTeamLeaveRequests] = useState(() => {
    const saved = getArr('tc_leave_requests')
    const map = new Map()
    DEFAULT_TEAM_LEAVE_REQUESTS.forEach((d) => map.set(d.id, d))
    saved.forEach((s) => { if (s.id) map.set(s.id, s) })
    return Array.from(map.values())
  })
  const [leaveRemarkInputs, setLeaveRemarkInputs] = useState({})

  // ── Manager's Own Leave State ──────────────────────────────────────────────
  const [myLeaveForm, setMyLeaveForm] = useState({
    leaveType: 'Casual Leave',
    fromDate: '',
    toDate: '',
    reason: '',
  })
  const [myLeaveRequests, setMyLeaveRequests] = useState(() => {
    return getArr('tc_manager_leave_requests')
  })
  const [leaveSubmitted, setLeaveSubmitted] = useState(false)

  // ── Documents State ────────────────────────────────────────────────────────
  const [documentsList, setDocumentsList] = useState(() => {
    const saved = getArr('tc_manager_documents')
    return saved.length > 0 ? saved : [
      { id: 'doc_m1', name: 'Aadhar Card',    status: 'pending', fileUrl: null, fileName: '' },
      { id: 'doc_m2', name: 'Offer Letter',   status: 'pending', fileUrl: null, fileName: '' },
      { id: 'doc_m3', name: 'PAN Card',       status: 'pending', fileUrl: null, fileName: '' },
      { id: 'doc_m4', name: 'Manager Agreement', status: 'pending', fileUrl: null, fileName: '' },
    ]
  })
  const [previewDoc, setPreviewDoc] = useState(null)

  useEffect(() => {
    try { localStorage.setItem('tc_manager_documents', JSON.stringify(documentsList)) } catch (e) {}
  }, [documentsList])

  useEffect(() => {
    try { localStorage.setItem('tc_manager_leave_requests', JSON.stringify(myLeaveRequests)) } catch (e) {}
  }, [myLeaveRequests])

  // ── EOD Reports Reviewed ───────────────────────────────────────────────────
  const eodReviewed = getArr('tc_eod_reports').filter((r) => !!r.managerAck)

  // ── Activity Log ──────────────────────────────────────────────────────────
  const activityLog = [
    ...teamLeaveRequests.filter((r) => r.status !== 'Pending').slice(0, 2).map((r) => ({
      icon: r.status === 'Approved' ? '✅' : '❌',
      text: `${r.status} leave for ${r.executive} (${r.leaveType})`,
      time: 'Recently',
    })),
    ...eodReviewed.slice(0, 3).map((r) => ({
      icon: '📋',
      text: `Acknowledged EOD report from ${r.executive} [${r.employee_code || 'EMP000012'}]`,
      time: r.date || 'Recently',
    })),
    { icon: '👔', text: 'Logged in to TwiteConnect Manager Portal', time: 'Today' },
  ].slice(0, 8)

  // ── Team Leave Actions ─────────────────────────────────────────────────────
  const handleLeaveDecision = (id, decision) => {
    const remark = leaveRemarkInputs[id] || (decision === 'Approved' ? 'Leave approved by Manager.' : 'Leave rejected. Please reconsider dates.')
    const updated = teamLeaveRequests.map((r) =>
      r.id === id ? { ...r, status: decision, managerRemark: remark } : r
    )
    setTeamLeaveRequests(updated)
    try { localStorage.setItem('tc_leave_requests', JSON.stringify(updated)) } catch (e) {}
    showToast(`Leave request ${decision.toLowerCase()} for ${updated.find((r) => r.id === id)?.executive}!`, decision === 'Approved' ? 'success' : 'error')
  }

  // ── Manager's Own Leave Submit ─────────────────────────────────────────────
  const handleMyLeaveSubmit = (e) => {
    e.preventDefault()
    if (!myLeaveForm.fromDate || !myLeaveForm.toDate || !myLeaveForm.reason.trim()) {
      showToast('Please fill all leave request fields!', 'error'); return
    }
    const from = new Date(myLeaveForm.fromDate)
    const to   = new Date(myLeaveForm.toDate)
    const days = Math.max(1, Math.round((to - from) / (1000 * 60 * 60 * 24)) + 1)
    const newReq = {
      id: `MGR_LR_${Date.now()}`,
      leaveType: myLeaveForm.leaveType,
      fromDate: myLeaveForm.fromDate,
      toDate: myLeaveForm.toDate,
      days,
      reason: myLeaveForm.reason,
      status: 'Pending MD Approval',
      appliedOn: new Date().toLocaleDateString('en-GB').replace(/\//g, '/'),
    }
    const updated = [newReq, ...myLeaveRequests]
    setMyLeaveRequests(updated)
    setLeaveSubmitted(true)
    setMyLeaveForm({ leaveType: 'Casual Leave', fromDate: '', toDate: '', reason: '' })
    showToast('Leave request submitted to MD for approval!', 'success')
  }

  // ── Team Stats derived from localStorage ──────────────────────────────────
  const allTeamLeads  = getArr('tc_sm_leads').length
  const allVisits     = getArr('tc_sales_visits').length
  const allExpenses   = getArr('tc_sm_expenses').length
  const pendingLeave  = teamLeaveRequests.filter((r) => r.status === 'Pending').length

  // ── Dashboard Stats ────────────────────────────────────────────────────────
  const dashStats = [
    { label: 'Team Members',       value: 4,              icon: Users,       color: 'blue'   },
    { label: 'Team Leads Pipeline',value: allTeamLeads,   icon: Target,      color: 'violet' },
    { label: 'Total Field Visits', value: allVisits,      icon: MapPin,      color: 'emerald'},
    { label: 'Pending Leave Reqs', value: pendingLeave,   icon: CalendarOff, color: 'amber'  },
  ]

  return (
    <div className="space-y-4 font-sans text-slate-900 min-w-0 w-full p-2 sm:p-4 pb-12">

      {/* ── TOP HEADER ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-[#b45309]" /> TwiteHRMS Manager Portal
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm font-semibold mt-0.5">
              {managerName} · Employee Code: <strong className="text-slate-800">{empCode}</strong> · Sales Manager &nbsp;✅ Active
            </p>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Department</span>
            <span className="text-xs font-black text-[#b45309]">Sales & Business Development</span>
          </div>
        </div>

        {/* HORIZONTAL NAV TABS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-slate-100 pt-3">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition shrink-0 cursor-pointer ${
                activeSection === key ? 'bg-[#ca8a04] text-white shadow-md shadow-yellow-600/20' : 'text-slate-600 hover:bg-amber-50 hover:text-amber-900'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ────────────────────────────────────────────── */}

      {/* 1. MY DASHBOARD */}
      {activeSection === 'dashboard' && (
        <div className="space-y-6 max-w-5xl">
          <div>
            <h2 className="text-2xl font-black text-slate-900">{managerName}'s HR Dashboard</h2>
            <p className="text-slate-500 text-sm mt-0.5 font-semibold">Employee Code: <strong>{empCode}</strong> · Sales Manager ✅ Active</p>
          </div>

          {/* ── 1. LEAVE SUMMARY CARDS (ALLOWED, USED, REMAINING) ── */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <CalendarOff className="w-5 h-5 text-[#b45309]" /> My Leave Summary (2026)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-center space-y-1">
                <span className="text-xs font-black text-blue-800 uppercase tracking-wider block">Leave Allowed</span>
                <div className="text-4xl font-black text-blue-600">47 Days</div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center space-y-1">
                <span className="text-xs font-black text-amber-800 uppercase tracking-wider block">Leave Used</span>
                <div className="text-4xl font-black text-amber-600">9 Days</div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-1">
                <span className="text-xs font-black text-emerald-800 uppercase tracking-wider block">Remaining Leave</span>
                <div className="text-4xl font-black text-emerald-600">38 Days</div>
              </div>
            </div>

            {/* Leave Type Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              {LEAVE_BALANCE.map((lb) => (
                <div key={lb.type} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <span className="text-[10px] font-black text-slate-500 uppercase block">{lb.type}</span>
                  <div className="flex items-end justify-between">
                    <span className="text-xl font-black text-slate-900">{lb.remaining}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">/ {lb.total} left</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full bg-[#b45309]" style={{ width: `${Math.round((lb.remaining / lb.total) * 100)}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-400">{lb.used} days used</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── 2. ATTENDANCE HISTORY TABLE WITH TODAY | TOMORROW | THIS MONTH | CUSTOM TOGGLES ── */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">Attendance History</h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Live check-in, check-out, locations, remarks, and work duration.</p>
              </div>

              <button
                type="button"
                onClick={() => window.location.href = "/manager/attendance"}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                📹 Mark Attendance Now
              </button>
            </div>

            {/* Filter Toggle Controls: TODAY | YESTERDAY | THIS MONTH | CUSTOM */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-0.5 bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/80 flex-wrap">
                {["TODAY", "YESTERDAY", "THIS MONTH", "CUSTOM"].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setReportFilterMode(mode)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wide transition cursor-pointer ${
                      reportFilterMode === mode ? "bg-[#0b3c5d] text-white shadow-2xs" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {mode === "CUSTOM" ? "CUSTOM DATE" : mode}
                  </button>
                ))}
              </div>

              {/* Custom Date Input */}
              {reportFilterMode === "CUSTOM" && (
                <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-1 bg-white text-xs font-bold text-slate-700">
                  <span className="text-slate-400 font-medium">Select Target Date:</span>
                  <input
                    type="date"
                    value={customDateFilter}
                    onChange={(e) => setCustomDateFilter(e.target.value)}
                    className="text-xs font-bold bg-transparent focus:outline-none cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Attendance History Table */}
            <div className="overflow-x-auto">
              {(() => {
                const todayStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                const todayISO = new Date().toISOString().slice(0, 10);

                const yesterdayObj = new Date();
                yesterdayObj.setDate(yesterdayObj.getDate() - 1);
                const yesterdayStr = yesterdayObj.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                const yesterdayISO = yesterdayObj.toISOString().slice(0, 10);

                const filteredLogs = realAttendanceLogs.filter((log) => {
                  const dStr = String(log.date || log.attendance_date || "");
                  if (reportFilterMode === "TODAY") {
                    return dStr.includes(todayStr) || dStr.includes(todayISO);
                  }
                  if (reportFilterMode === "YESTERDAY") {
                    return dStr.includes(yesterdayStr) || dStr.includes(yesterdayISO);
                  }
                  if (reportFilterMode === "CUSTOM" && customDateFilter) {
                    return dStr.includes(customDateFilter);
                  }
                  // THIS MONTH (Default)
                  return true;
                });

                if (filteredLogs.length === 0) {
                  return (
                    <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-500 space-y-2">
                      <p className="font-extrabold text-slate-700 text-sm">No attendance history logged for this filter mode ({reportFilterMode}).</p>
                      <p>Switch filter to <b>THIS MONTH</b> or mark a new check-in with camera!</p>
                    </div>
                  );
                }

                return (
                  <table className="w-full text-left font-semibold text-xs text-slate-800">
                    <thead className="border-b border-slate-200 text-slate-400 font-black text-[10px] uppercase tracking-wider bg-slate-50">
                      <tr>
                        <th className="py-3 px-4">DATE</th>
                        <th className="py-3 px-4">LOGIN TIME</th>
                        <th className="py-3 px-4">LOGOUT TIME</th>
                        <th className="py-3 px-4 min-w-[200px]">LOGIN LOCATION</th>
                        <th className="py-3 px-4 min-w-[200px]">LOGOUT LOCATION</th>
                        <th className="py-3 px-4 min-w-[160px]">REMARKS</th>
                        <th className="py-3 px-4">DURATION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLogs.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition">
                          <td className="py-4 px-4 font-bold text-slate-900 whitespace-nowrap">{row.date || row.attendance_date}</td>
                          <td className="py-4 px-4 font-bold text-slate-800 whitespace-nowrap">{row.loginTime || row.check_in_time || "—"}</td>
                          <td className="py-4 px-4 font-bold text-slate-800 whitespace-nowrap">{row.logoutTime || row.check_out_time || "—"}</td>
                          <td className="py-4 px-4 text-slate-600 font-semibold text-[11px] leading-snug">{row.loginLocation || row.check_in_address || "—"}</td>
                          <td className="py-4 px-4 text-slate-600 font-semibold text-[11px] leading-snug">{row.logoutLocation || row.check_out_address || "—"}</td>
                          <td className="py-4 px-4 text-teal-700 font-bold text-xs truncate max-w-[180px]">{row.remarks || row.notes || "—"}</td>
                          <td className="py-4 px-4 font-black text-slate-900 whitespace-nowrap">
                            {calculateWorkHours(row.loginTime || row.check_in_time, row.logoutTime || row.check_out_time) !== "—"
                              ? calculateWorkHours(row.loginTime || row.check_in_time, row.logoutTime || row.check_out_time)
                              : (row.workHours && row.workHours !== "9:46:13" ? row.workHours : "—")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* 2. MY LEAVE */}
      {activeSection === 'leave' && (
        <div className="max-w-3xl space-y-5">
          <div>
            <h2 className="text-2xl font-black text-slate-900">My Leave Management</h2>
            <p className="text-slate-500 text-sm mt-0.5 font-semibold">Apply for leave — your request will be sent to MD for approval.</p>
          </div>

          {/* Leave Balance */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {LEAVE_BALANCE.map((lb) => (
              <div key={lb.type} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1.5 text-xs">
                <span className="text-[10px] font-black text-slate-400 uppercase block">{lb.type}</span>
                <div className="flex items-end gap-1">
                  <span className="text-2xl font-black text-slate-900">{lb.remaining}</span>
                  <span className="text-[11px] text-slate-400 font-semibold mb-0.5">days left</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full rounded-full bg-[#b45309]" style={{ width: `${Math.round((lb.remaining / lb.total) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Leave Application Form */}
          {leaveSubmitted ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center space-y-3">
              <CheckCircle2 size={40} className="text-emerald-600 mx-auto" />
              <h2 className="text-xl font-black text-emerald-900">Leave Request Submitted!</h2>
              <p className="text-emerald-700 font-semibold text-sm">Your leave has been forwarded to MD for approval.</p>
              <button onClick={() => setLeaveSubmitted(false)} className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer">
                Apply Another Leave
              </button>
            </div>
          ) : (
            <form onSubmit={handleMyLeaveSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
              <h3 className="text-sm font-black text-slate-900">Apply for Leave</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-extrabold text-slate-600 uppercase block mb-1">Leave Type</label>
                  <select
                    value={myLeaveForm.leaveType}
                    onChange={(e) => setMyLeaveForm({ ...myLeaveForm, leaveType: e.target.value })}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white font-bold text-slate-800 focus:outline-none focus:border-[#b45309]"
                  >
                    {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-extrabold text-slate-600 uppercase block mb-1">From Date</label>
                    <input
                      type="date" required value={myLeaveForm.fromDate}
                      onChange={(e) => setMyLeaveForm({ ...myLeaveForm, fromDate: e.target.value })}
                      className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white font-medium focus:outline-none focus:border-[#b45309]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-extrabold text-slate-600 uppercase block mb-1">To Date</label>
                    <input
                      type="date" required value={myLeaveForm.toDate}
                      onChange={(e) => setMyLeaveForm({ ...myLeaveForm, toDate: e.target.value })}
                      className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white font-medium focus:outline-none focus:border-[#b45309]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-600 uppercase block mb-1">Reason for Leave</label>
                <textarea
                  rows={3} required value={myLeaveForm.reason}
                  onChange={(e) => setMyLeaveForm({ ...myLeaveForm, reason: e.target.value })}
                  placeholder="Describe your reason for leave..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#b45309] resize-none bg-slate-50"
                />
              </div>

              <button type="submit" className="w-full py-3 rounded-xl bg-[#b45309] hover:bg-amber-700 text-white font-black text-sm flex items-center justify-center gap-2 transition cursor-pointer">
                <Send size={16} /> Submit Leave Request to MD
              </button>
            </form>
          )}

          {/* My Past Leave Requests */}
          {myLeaveRequests.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-black text-slate-900 text-sm">My Leave History</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {myLeaveRequests.map((r) => (
                  <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-black text-slate-900">{r.leaveType} · {r.days} day(s)</p>
                      <p className="text-slate-500 font-semibold">{r.fromDate} → {r.toDate}</p>
                      <p className="text-slate-400 italic">{r.reason}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border whitespace-nowrap ${
                      r.status === 'Approved'         ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                      r.status === 'Rejected'         ? 'bg-rose-100 text-rose-800 border-rose-300' :
                                                        'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>{r.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. TEAM LEAVE APPROVAL */}
      {activeSection === 'team_leave' && (
        <div className="max-w-4xl space-y-5">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Team Leave Approval</h2>
            <p className="text-slate-500 text-sm mt-0.5 font-semibold">
              Review and approve or reject leave requests from your Sales Executives.
            </p>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Pending',  count: teamLeaveRequests.filter(r=>r.status==='Pending').length,   color: 'amber'   },
              { label: 'Approved', count: teamLeaveRequests.filter(r=>r.status==='Approved').length,  color: 'emerald' },
              { label: 'Rejected', count: teamLeaveRequests.filter(r=>r.status==='Rejected').length,  color: 'rose'    },
            ].map(({ label, count, color }) => (
              <div key={label} className={`bg-${color}-50 border border-${color}-200 rounded-2xl p-4 text-center`}>
                <h2 className={`text-3xl font-black text-${color}-700`}>{count}</h2>
                <p className={`text-xs font-extrabold text-${color}-600 mt-0.5`}>{label}</p>
              </div>
            ))}
          </div>

          {/* Leave Cards */}
          <div className="space-y-4">
            {teamLeaveRequests.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400 font-semibold text-xs">
                No team leave requests found.
              </div>
            ) : (
              teamLeaveRequests.map((req) => (
                <div key={req.id} className={`bg-white border rounded-2xl p-5 shadow-xs space-y-3 ${
                  req.status === 'Pending' ? 'border-amber-300' :
                  req.status === 'Approved' ? 'border-emerald-300' : 'border-rose-300'
                }`}>
                  {/* Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-black text-[#b45309] bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                          [{req.employeeCode}]
                        </span>
                        <h3 className="font-black text-slate-900 text-sm">{req.executive}</h3>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Applied: {req.appliedOn}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                      req.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                      req.status === 'Rejected' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                                                   'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>{req.status}</span>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Leave Type</span>
                      <span className="font-black text-slate-900">{req.leaveType}</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">From</span>
                      <span className="font-black text-slate-900">{req.fromDate}</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">To</span>
                      <span className="font-black text-slate-900">{req.toDate}</span>
                    </div>
                    <div className="p-2 bg-amber-50 rounded-xl border border-amber-200">
                      <span className="text-[10px] font-bold text-amber-700 uppercase block">Days</span>
                      <span className="font-black text-amber-900">{req.days} Day(s)</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Reason</span>
                    <p className="text-slate-700 font-medium mt-0.5">{req.reason}</p>
                  </div>

                  {req.managerRemark && (
                    <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs">
                      <span className="text-[10px] font-extrabold text-emerald-700 uppercase block">Manager Remark</span>
                      <p className="text-emerald-800 font-medium mt-0.5 italic">"{req.managerRemark}"</p>
                    </div>
                  )}

                  {/* Approve / Reject Actions */}
                  {req.status === 'Pending' && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <input
                        type="text"
                        value={leaveRemarkInputs[req.id] || ''}
                        onChange={(e) => setLeaveRemarkInputs({ ...leaveRemarkInputs, [req.id]: e.target.value })}
                        placeholder="Add remark (optional) before approving or rejecting..."
                        className="w-full h-9 border border-slate-200 rounded-xl px-3 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#b45309] bg-slate-50"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleLeaveDecision(req.id, 'Approved')}
                          className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
                        >
                          <CheckCircle size={14} /> Approve Leave
                        </button>
                        <button
                          onClick={() => handleLeaveDecision(req.id, 'Rejected')}
                          className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
                        >
                          <XCircle size={14} /> Reject Leave
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. MY DOCUMENTS */}
      {activeSection === 'documents' && (
        <div className="max-w-2xl space-y-5">
          <h2 className="text-2xl font-black text-slate-900">My Documents</h2>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 divide-y divide-slate-100">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider pb-3">Mandatory Documents</p>
            {documentsList.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-black text-slate-900">{doc.name}</p>
                  <p className={`text-[11px] font-semibold ${doc.status === 'uploaded' ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {doc.status === 'uploaded' ? `✅ Uploaded: ${doc.fileName}` : '📄 Required document'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="file" id={`file_m_${doc.id}`} className="hidden" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0]; if (!file) return
                      const reader = new FileReader()
                      reader.onload = (ev) => {
                        setDocumentsList((prev) => prev.map((item) =>
                          item.id === doc.id ? { ...item, status: 'uploaded', fileName: file.name, fileUrl: ev.target.result } : item
                        ))
                        showToast(`${file.name} uploaded successfully!`, 'success')
                      }
                      reader.readAsDataURL(file)
                    }}
                  />
                  {doc.status === 'uploaded' ? (
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setPreviewDoc(doc)} className="text-xs font-extrabold px-3 py-1.5 rounded-xl bg-amber-50 text-[#b45309] border border-amber-300 cursor-pointer flex items-center gap-1">
                        <Eye size={13} /> View
                      </button>
                      <button onClick={() => document.getElementById(`file_m_${doc.id}`)?.click()} className="text-xs font-extrabold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer flex items-center gap-1">
                        <Upload size={13} /> Re-upload
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => document.getElementById(`file_m_${doc.id}`)?.click()} className="text-xs font-extrabold px-4 py-1.5 rounded-xl bg-slate-900 text-white cursor-pointer flex items-center gap-1">
                      <Upload size={13} /> Upload
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Custom Doc Upload */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Upload Other Document</p>
            <input type="file" id="file_manager_custom" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
              onChange={(e) => {
                const file = e.target.files?.[0]; if (!file) return
                const reader = new FileReader()
                reader.onload = (ev) => {
                  const newDoc = {
                    id: `doc_m_${Date.now()}`,
                    name: file.name.split('.')[0],
                    status: 'uploaded',
                    fileName: file.name,
                    fileUrl: ev.target.result,
                  }
                  setDocumentsList((prev) => [...prev, newDoc])
                  showToast(`${file.name} uploaded!`, 'success')
                }
                reader.readAsDataURL(file)
              }}
            />
            <div onClick={() => document.getElementById('file_manager_custom')?.click()}
              className="border-2 border-dashed border-[#b45309]/40 hover:border-[#b45309] bg-amber-50/30 hover:bg-amber-50/60 rounded-2xl p-8 text-center transition cursor-pointer group"
            >
              <FileUp size={32} className="text-[#b45309] group-hover:scale-110 transition mx-auto mb-2" />
              <p className="text-sm font-black text-slate-900">Click to upload any document</p>
              <p className="text-[11px] font-bold text-slate-500 mt-1">PDF, JPG, PNG, Word, Excel supported</p>
            </div>
          </div>

          {/* Document Preview Modal */}
          {previewDoc && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-black text-slate-900">{previewDoc.name}</h3>
                    <p className="text-xs text-slate-400">{previewDoc.fileName}</p>
                  </div>
                  <button onClick={() => setPreviewDoc(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"><X size={20} /></button>
                </div>
                {previewDoc.fileUrl?.startsWith('data:image') ? (
                  <img src={previewDoc.fileUrl} alt={previewDoc.name} className="w-full max-h-96 object-contain rounded-xl border border-slate-200" />
                ) : previewDoc.fileUrl?.startsWith('data:application/pdf') ? (
                  <iframe src={previewDoc.fileUrl} title={previewDoc.name} className="w-full h-96 rounded-xl border border-slate-200" />
                ) : (
                  <div className="bg-slate-50 rounded-xl p-6 text-center text-slate-400 text-sm">Preview not available for this file type.</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. EOD REPORTS REVIEWED */}
      {activeSection === 'reports' && (
        <div className="max-w-4xl space-y-5">
          <div>
            <h2 className="text-2xl font-black text-slate-900">EOD Reports Reviewed by Me</h2>
            <p className="text-slate-500 text-sm mt-0.5 font-semibold">All daily work reports you have acknowledged from your team.</p>
          </div>

          {eodReviewed.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400 font-semibold text-xs">
              No acknowledged EOD reports yet. Go to Team & EOD Reports to review your team's daily submissions.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 min-w-[700px]">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200 text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">SE Code</th>
                      <th className="px-4 py-3">Executive</th>
                      <th className="px-4 py-3">Calls</th>
                      <th className="px-4 py-3">Visits</th>
                      <th className="px-4 py-3">Leads</th>
                      <th className="px-4 py-3">Deals</th>
                      <th className="px-4 py-3">Manager Feedback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {eodReviewed.map((r, idx) => (
                      <tr key={r.id || idx} className="hover:bg-amber-50/20">
                        <td className="px-4 py-3 font-mono font-bold text-slate-700">{r.date}</td>
                        <td className="px-4 py-3">
                          <span className="bg-amber-50 text-amber-950 border border-amber-300 px-1.5 py-0.5 rounded text-[10px] font-mono font-black">
                            [{r.employee_code || 'EMP000012'}]
                          </span>
                        </td>
                        <td className="px-4 py-3 font-extrabold text-slate-900">{r.executive}</td>
                        <td className="px-4 py-3 font-black text-slate-800">{r.callsMade}</td>
                        <td className="px-4 py-3 font-black text-emerald-700">{r.visitsCompleted}</td>
                        <td className="px-4 py-3 font-black text-indigo-700">{r.leadsGenerated}</td>
                        <td className="px-4 py-3 font-black text-amber-900">{r.dealsClosed}</td>
                        <td className="px-4 py-3 italic text-slate-500 max-w-[200px]">
                          <p className="line-clamp-1">"{r.managerComment || 'Acknowledged'}"</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. HOLIDAY CALENDAR */}
      {activeSection === 'calendar' && (
        <div className="max-w-2xl space-y-5">
          <h2 className="text-2xl font-black text-slate-900">Holiday Calendar 2026–27</h2>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100">
            {HOLIDAYS.map((h) => (
              <div key={h.date} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div>
                  <p className="font-black text-slate-900 text-sm">{h.name}</p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{h.date}</p>
                </div>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                  h.type === 'National' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                  h.type === 'Festival' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                          'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}>{h.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. MANAGER HANDBOOK */}
      {activeSection === 'handbook' && (
        <div className="max-w-3xl space-y-4">
          <h2 className="text-2xl font-black text-slate-900">Manager Handbook</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {HANDBOOK.map((item) => (
              <div key={item.title} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{item.icon}</span>
                  <h3 className="font-black text-slate-900 text-sm">{item.title}</h3>
                </div>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">{item.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. ACTIVITY LOGS */}
      {activeSection === 'activity' && (
        <div className="max-w-2xl space-y-5">
          <h2 className="text-2xl font-black text-slate-900">My Activity Log</h2>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100">
            {activityLog.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-semibold">No activity yet.</div>
            ) : activityLog.map((log, idx) => (
              <div key={idx} className="px-5 py-3 flex items-center gap-3">
                <span className="text-xl shrink-0">{log.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{log.text}</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{log.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
