import React, { useState, useEffect } from 'react'
import ManagerSalesReports from './ManagerSalesReports.jsx'
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
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useToast } from '../../common/ToastContext.jsx'
import { attendanceAPI, hrmsAPI, settingsAPI } from '../../services/api.js'
import { calculateWorkHours } from '../sales/Attendance.jsx'
import { formatDate, getLeaveRequestDays, parseDateInput } from '../../utils/dateUtils.js'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
  { key: 'leave', label: 'My Leave', icon: CalendarOff },
  { key: 'sales_report', label: 'Sales Reports', icon: FileText },
  { key: 'calendar', label: 'Holiday Calendar', icon: CalendarDays },
  { key: 'handbook', label: 'Manager Handbook', icon: BookOpen },
  { key: 'activity', label: 'Activity Logs', icon: Activity },
]

const HOLIDAYS = [
  { date: '15 Aug 2026', name: 'Independence Day', type: 'National' },
  { date: '02 Oct 2026', name: 'Gandhi Jayanti', type: 'National' },
  { date: '24 Oct 2026', name: 'Diwali', type: 'Festival' },
  { date: '25 Dec 2026', name: 'Christmas', type: 'Festival' },
  { date: '01 Jan 2027', name: 'New Year', type: 'Festival' },
  { date: '14 Jan 2027', name: 'Pongal', type: 'Regional' },
]

const HANDBOOK = [
  { title: 'Team Management', icon: '👥', content: 'Conduct weekly 1-on-1 sessions with each SE. Review daily EOD reports by 7 PM. Flag blockers immediately.' },
  { title: 'Lead Oversight', icon: '🎯', content: 'Review all new leads within 24 hours. Reassign stale leads (no contact > 3 days). Approve lead category changes from SE.' },
  { title: 'Visit Audit Process', icon: '🗺️', content: 'Review GPS check-in/out for each SE. Flag visits without selfie or GPS location. Audit visit quality monthly.' },
  { title: 'Expense Approvals', icon: '💰', content: 'Review all expense claims within 48 hours. Reject without receipt. Approve only field visit related expenses. Max ₹5,000/claim without CEO approval.' },
  { title: 'Leave Policy', icon: '📅', content: 'Manager must approve or reject leave in 24 hours. Max 2 team members on leave simultaneously. Manager leave requires CEO approval.' },
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

const LEAVE_TYPES = ['Casual Leave', 'Sick Leave', 'Other Leave', 'Work From Home', 'Half-Day Permission', 'Short Permission (2 Hours)']

const LEAVE_BALANCE = [
  { type: 'Casual Leave',   total: 12, used: 3, remaining: 9,  color: 'bg-gradient-to-br from-blue-50 to-indigo-50/50 border-blue-200/60 shadow-xs',    bar: 'bg-blue-600',    icon: '🏖️' },
  { type: 'Sick Leave',     total: 10, used: 1, remaining: 9,  color: 'bg-gradient-to-br from-rose-50 to-pink-50/50 border-rose-200/60 shadow-xs',    bar: 'bg-rose-600',    icon: '🤒' },
  { type: 'Other Leave',   total: 10, used: 0, remaining: 10, color: 'bg-gradient-to-br from-violet-50 to-fuchsia-50/50 border-violet-200/60 shadow-xs', bar: 'bg-violet-600',  icon: '📋' },
]

export default function ManagerHrms(props) {
  const currentUser = useCurrentUser()
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()

  const userRole = String(currentUser.role || '').toLowerCase().trim();
  const isTeamLead = location.pathname.startsWith('/team-lead') || userRole.includes('lead');
  const attendanceRoute = isTeamLead ? '/team-lead/attendance' : '/manager/attendance';
  const headerTitle = props?.portalTitle || (userRole.includes('lead') ? 'TwiteHRMS Team Lead Portal' : 'TwiteHRMS Manager Portal');

  const [profile, setProfile] = useState({})
  const [selectedLeaveDetailType, setSelectedLeaveDetailType] = useState(null)

  const [holidayPdfData, setHolidayPdfData] = useState(() => {
    try {
      const pdf = localStorage.getItem('tc_holiday_calendar_pdf');
      const meta = JSON.parse(localStorage.getItem('tc_holiday_calendar_meta') || '{}');
      return pdf ? { url: pdf, name: meta.name || 'Holiday_Calendar.pdf', date: meta.date } : null;
    } catch(e) { return null; }
  });
  const [handbookPdfData, setHandbookPdfData] = useState(() => {
    try {
      const pdf = localStorage.getItem('tc_twite_handbook_pdf');
      const meta = JSON.parse(localStorage.getItem('tc_twite_handbook_meta') || '{}');
      return pdf ? { url: pdf, name: meta.name || 'Twite_Employee_Handbook.pdf', date: meta.date } : null;
    } catch(e) { return null; }
  });

  useEffect(() => {
    hrmsAPI.getEmployeeById("self")
      .then(res => {
        if (res && res.data) {
          setProfile(res.data)
        }
      })
      .catch(() => null)

    settingsAPI.getSettings()
      .then(res => {
        const d = res?.data || res || {};
        if (d.holiday_calendar_pdf) {
          setHolidayPdfData({
            url: d.holiday_calendar_pdf,
            name: d.holiday_calendar_filename || 'Holiday_Calendar.pdf',
            date: d.holiday_calendar_uploaded_at
          });
          localStorage.setItem('tc_holiday_calendar_pdf', d.holiday_calendar_pdf);
          localStorage.setItem('tc_holiday_calendar_meta', JSON.stringify({ name: d.holiday_calendar_filename, date: d.holiday_calendar_uploaded_at }));
        }
        if (d.twite_handbook_pdf) {
          setHandbookPdfData({
            url: d.twite_handbook_pdf,
            name: d.twite_handbook_filename || 'Twite_Employee_Handbook.pdf',
            date: d.twite_handbook_uploaded_at
          });
          localStorage.setItem('tc_twite_handbook_pdf', d.twite_handbook_pdf);
          localStorage.setItem('tc_twite_handbook_meta', JSON.stringify({ name: d.twite_handbook_filename, date: d.twite_handbook_uploaded_at }));
        }
      })
      .catch(err => console.warn('Failed fetching settings PDFs:', err));
  }, [])

  const managerName = currentUser.name || currentUser.full_name || 'Sales Manager'
  const managerEmail = (currentUser.email || '').toLowerCase().trim()
  const empCode = currentUser.employee_code || currentUser.employee_id || 'MGR-001'
  const [searchParams, setSearchParams] = useSearchParams()
  const activeSection = searchParams.get('tab') || 'dashboard'
  const setActiveSection = (val) => setSearchParams({ tab: val })

  const [hrmsTabs, setHrmsTabs] = useState(() => {
    const saved = localStorage.getItem(`tc_hrms_order_manager_${managerEmail}`);
    if (saved) {
      try {
        const keys = JSON.parse(saved);
        const ordered = [];
        keys.forEach(k => {
          const match = NAV_ITEMS.find(n => n.key === k);
          if (match) ordered.push(match);
        });
        NAV_ITEMS.forEach(n => {
          if (!ordered.some(o => o.key === n.key)) {
            ordered.push(n);
          }
        });
        return ordered;
      } catch (e) {
        return NAV_ITEMS;
      }
    }
    return NAV_ITEMS;
  });

  useEffect(() => {
    const saved = localStorage.getItem(`tc_hrms_order_manager_${managerEmail}`);
    if (saved) {
      try {
        const keys = JSON.parse(saved);
        const ordered = [];
        keys.forEach(k => {
          const match = NAV_ITEMS.find(n => n.key === k);
          if (match) ordered.push(match);
        });
        NAV_ITEMS.forEach(n => {
          if (!ordered.some(o => o.key === n.key)) {
            ordered.push(n);
          }
        });
        setHrmsTabs(ordered);
      } catch (e) {
        setHrmsTabs(NAV_ITEMS);
      }
    } else {
      setHrmsTabs(NAV_ITEMS);
    }
  }, [managerEmail]);

  const [draggedTabKey, setDraggedTabKey] = useState(null);

  const handleTabDragStart = (e, index) => {
    setDraggedTabKey(index);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleTabDragOver = (e, index) => {
    e.preventDefault();
  };
  const handleTabDrop = (e, index) => {
    e.preventDefault();
    if (draggedTabKey === null || draggedTabKey === index) return;
    const reordered = [...hrmsTabs];
    const [draggedItem] = reordered.splice(draggedTabKey, 1);
    reordered.splice(index, 0, draggedItem);
    setHrmsTabs(reordered);
    const keys = reordered.map(item => item.key);
    localStorage.setItem(`tc_hrms_order_manager_${managerEmail}`, JSON.stringify(keys));
    showToast("HRMS tab order updated!", "success");
  };
  const handleTabDragEnd = () => {
    setDraggedTabKey(null);
  };
  const resetHrmsTabs = () => {
    localStorage.removeItem(`tc_hrms_order_manager_${managerEmail}`);
    setHrmsTabs(NAV_ITEMS);
    showToast("HRMS tabs reset to default.", "info");
  };

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

  const loadTeamLeaves = () => {
    attendanceAPI.getLeaveRequests()
      .then((res) => {
        if (res && res.data && Array.isArray(res.data)) {
          // Filter to show ONLY Sales Executives
          const executiveRequests = res.data.filter(
            (r) => (r.role || '').toLowerCase().includes('executive') || (r.role || '').toLowerCase().includes('sales')
          ).map((l, idx) => ({
            id: l.id || l.leave_id || `LR-${idx + 1}`,
            executive: l.employee_name || l.name || l.executive_name || 'Sales Executive',
            employeeCode: l.employee_code || 'EMP-105',
            leaveType: l.leave_type || 'Casual Leave',
            fromDate: l.from_date || 'N/A',
            toDate: l.to_date || 'N/A',
            days: l.duration || '1 Day',
            reason: l.reason || 'Personal necessity',
            status: l.status || 'Pending',
            appliedOn: formatDate(l.created_at) || 'Recent',
            managerRemark: l.manager_comment || '',
          }))
          setTeamLeaveRequests(executiveRequests)

          // Load manager's own leaves (submitted by this manager)
          const mine = res.data.filter(
            (r) => (r.executive_email || '').toLowerCase().trim() === managerEmail
          ).map((l, idx) => ({
            id: l.id || l.leave_id || `MGR_LR-${idx + 1}`,
            leaveType: l.leave_type || 'Casual Leave',
            fromDate: l.from_date || 'N/A',
            toDate: l.to_date || 'N/A',
            days: l.duration || '1 Day',
            reason: l.reason || 'Personal necessity',
            status: l.status || 'Pending',
            appliedOn: formatDate(l.created_at) || 'Recent',
          }))
          setMyLeaveRequests(mine)

          try {
            localStorage.setItem(`tc_cached_team_leaves_${managerEmail}`, JSON.stringify(executiveRequests))
            localStorage.setItem(`tc_cached_my_leaves_${managerEmail}`, JSON.stringify(mine))
          } catch (e) {}
        }
      })
      .catch(() => null);
  }

  useEffect(() => {
    attendanceAPI.getLogs()
      .then((res) => {
        const rawLogs = Array.isArray(res) ? res : (res?.data || []);
        if (rawLogs.length > 0) {
          const myLogs = rawLogs.filter(p => {
            const pId = String(p.employee_id || p.user_id || '').toLowerCase();
            const pEmail = String(p.email || p.user_email || '').toLowerCase();
            return pId === String(empCode).toLowerCase() || pId === String(currentUser.id).toLowerCase() || pEmail === managerEmail;
          });
          setRealAttendanceLogs(myLogs);
        }
      })
      .catch(() => null);

    loadTeamLeaves()
  }, [managerEmail, empCode, currentUser.id]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getArr = (key) => { try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] } }

  // ── Team Leave Approval State with Cache ───────────────────────────────────
  const [teamLeaveRequests, setTeamLeaveRequests] = useState(() => {
    try {
      const cached = localStorage.getItem(`tc_cached_team_leaves_${managerEmail}`)
      return cached ? JSON.parse(cached) : []
    } catch { return [] }
  })
  const [leaveRemarkInputs, setLeaveRemarkInputs] = useState({})

  // ── Manager's Own Leave State ──────────────────────────────────────────────
  const [myLeaveForm, setMyLeaveForm] = useState({
    leaveType: 'Casual Leave',
    fromDate: '',
    toDate: '',
    permissionDate: '',
    startTime: '09:30',
    endTime: '11:30',
    reason: '',
  })
  const [myLeaveRequests, setMyLeaveRequests] = useState(() => {
    try {
      const cached = localStorage.getItem(`tc_cached_my_leaves_${managerEmail}`)
      return cached ? JSON.parse(cached) : []
    } catch { return [] }
  })
  const [leaveSubmitted, setLeaveSubmitted] = useState(false)

  // ── Documents State ────────────────────────────────────────────────────────
  const [documentsList, setDocumentsList] = useState(() => {
    const saved = getArr('tc_manager_documents')
    return saved.length > 0 ? saved : [
      { id: 'doc_m1', name: 'Aadhar Card', status: 'pending', fileUrl: null, fileName: '' },
      { id: 'doc_m2', name: 'Offer Letter', status: 'pending', fileUrl: null, fileName: '' },
      { id: 'doc_m3', name: 'PAN Card', status: 'pending', fileUrl: null, fileName: '' },
      { id: 'doc_m4', name: 'Manager Agreement', status: 'pending', fileUrl: null, fileName: '' },
    ]
  })
  const [previewDoc, setPreviewDoc] = useState(null)

  useEffect(() => {
    try { localStorage.setItem('tc_manager_documents', JSON.stringify(documentsList)) } catch (e) { }
  }, [documentsList])

  useEffect(() => {
    try { localStorage.setItem('tc_manager_leave_requests', JSON.stringify(myLeaveRequests)) } catch (e) { }
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
  const handleLeaveDecision = async (id, decision) => {
    const remark = leaveRemarkInputs[id] || (decision === 'Approved' ? 'Leave approved by Manager.' : 'Leave rejected. Please reconsider dates.')
    const updated = teamLeaveRequests.map((r) =>
      r.id === id ? { ...r, status: decision, managerRemark: remark } : r
    )
    setTeamLeaveRequests(updated)
    try {
      await attendanceAPI.updateLeaveStatus(id, decision, remark)
      showToast(`Leave request ${decision.toLowerCase()} for ${updated.find((r) => r.id === id)?.executive}!`, decision === 'Approved' ? 'success' : 'error')
    } catch (err) {
      showToast(`Failed to update leave status in Supabase: ${err?.message || 'Server Error'}`, 'error')
    }
  }

  // ── Manager's Own Leave Submit ─────────────────────────────────────────────
  const handleMyLeaveSubmit = async (e) => {
    e.preventDefault()
    const isPermission = myLeaveForm.leaveType.includes('Permission')
    
    if (isPermission) {
      if (!myLeaveForm.permissionDate || !myLeaveForm.startTime || !myLeaveForm.endTime || !myLeaveForm.reason.trim()) {
        showToast('Please fill all permission fields!', 'error'); return
      }
    } else {
      if (!myLeaveForm.fromDate || !myLeaveForm.toDate || !myLeaveForm.reason.trim()) {
        showToast('Please fill all leave request fields!', 'error'); return
      }
    }
    
    const from = new Date(isPermission ? myLeaveForm.permissionDate : myLeaveForm.fromDate)
    const to = new Date(isPermission ? myLeaveForm.permissionDate : myLeaveForm.toDate)
    const days = Math.max(1, Math.round((to - from) / (1000 * 60 * 60 * 24)) + 1)
    
    const payload = {
      id: `leave_${Date.now()}`,
      leave_type: myLeaveForm.leaveType,
      from_date: isPermission ? myLeaveForm.permissionDate : myLeaveForm.fromDate,
      to_date: isPermission ? myLeaveForm.permissionDate : myLeaveForm.toDate,
      time_slot: isPermission ? `${myLeaveForm.startTime} - ${myLeaveForm.endTime}` : 'Full Day',
      reason: myLeaveForm.reason,
      executive_name: managerName,
      executive_email: managerEmail,
      employee_code: empCode,
      status: 'Pending',
      duration: isPermission ? (myLeaveForm.leaveType.includes('Half') ? '0.5 Day' : '2 Hours') : `${days} Day(s)`,
      created_at: new Date().toISOString()
    }

    setMyLeaveRequests((prev) => [payload, ...prev])
    setLeaveSubmitted(true)
    setMyLeaveForm({
      leaveType: 'Casual Leave',
      fromDate: '',
      toDate: '',
      permissionDate: '',
      startTime: '09:30',
      endTime: '11:30',
      reason: ''
    })
    
    try {
      await attendanceAPI.submitLeaveRequest(payload)
      showToast('Request submitted to CEO for approval!', 'success')
    } catch (err) {
      showToast('Request submitted.', 'info')
    }
  }

  // ── Team Stats derived from localStorage ──────────────────────────────────
  const allTeamLeads = getArr('tc_sm_leads').length
  const allVisits = getArr('tc_sales_visits').length
  const allExpenses = getArr('tc_sm_expenses').length
  const pendingLeave = teamLeaveRequests.filter((r) => r.status === 'Pending').length

  // ── Dashboard Stats ────────────────────────────────────────────────────────
  const dashStats = [
    { label: 'Team Members', value: 4, icon: Users, color: 'blue' },
    { label: 'Team Leads Pipeline', value: allTeamLeads, icon: Target, color: 'violet' },
    { label: 'Total Field Visits', value: allVisits, icon: MapPin, color: 'emerald' },
    { label: 'Pending Leave Reqs', value: pendingLeave, icon: CalendarOff, color: 'amber' },
  ]

  return (
    <div className="space-y-4 font-sans text-slate-900 min-w-0 w-full p-2 sm:p-4 pb-12 overflow-x-clip">

      {/* ── STICKY TOP HEADER & TABS NAVIGATION ── */}
      <div className="sticky -top-2 sm:-top-4 z-40 bg-slate-50/95 backdrop-blur-md pb-2 pt-1 space-y-3 min-w-0">
        {/* ── TOP HEADER ── Premium Dark Accent ─────────────────────────────── */}
        <div className="bg-gradient-to-br from-slate-950 to-[#0b3c5d] text-white rounded-3xl p-5 border border-slate-800 shadow-md space-y-4 relative overflow-hidden">
          {/* Soft glow background */}
          <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1.5">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2 text-white">
                <ShieldCheck className="w-6.5 h-6.5 text-[#F2C76E]" /> {headerTitle}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-slate-300 text-xs font-semibold">
                <span>{managerName}</span>
                <span className="text-slate-600">•</span>
                <span>Code: <strong className="text-white font-mono">{empCode}</strong></span>
                <span className="text-slate-600">•</span>
                <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                  Active
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:items-end gap-0.5 bg-white/5 border border-white/10 p-2.5 rounded-2xl sm:text-right shrink-0">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Department</span>
              <span className="text-xs font-black text-[#F2C76E]">Sales & Business Development</span>
            </div>
          </div>
        </div>

        {/* ── TABS NAVIGATION BAR ── Compact & Sleek ─────────────────────── */}
        <div className="bg-white border border-slate-200 p-1.5 rounded-xl shadow-2xs flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full shrink-0">
          <div className="flex items-center flex-nowrap gap-1">
            {hrmsTabs.map(({ key, label, icon: Icon }) => {
              const active = activeSection === key
              return (
                <div
                  key={key}
                  onClick={() => setActiveSection(key)}
                  className="flex items-center shrink-0 whitespace-nowrap transition cursor-pointer"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveSection(key);
                    }}
                    className={`mgr-card px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer whitespace-nowrap border ${
                      active 
                        ? 'bg-[#0b3c5d] text-white border-[#0b3c5d] shadow-2xs' 
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-950'
                    }`}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                </div>
              )
            })}
          </div>
          <button
            type="button"
            onClick={resetHrmsTabs}
            className="mgr-card ml-auto px-2 py-1 text-[9px] font-medium text-slate-400 hover:text-slate-600 transition cursor-pointer shrink-0"
          >
            Reset Order
          </button>
        </div>
      </div>


      {/* ── MAIN CONTENT AREA ────────────────────────────────────────────── */}

      {/* 1. MY DASHBOARD */}
      {activeSection === 'dashboard' && (
        <div className="space-y-6 max-w-5xl">

          {/* ── 1. LEAVE SUMMARY CARDS (ALLOWED, USED, REMAINING) ── */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <CalendarOff className="w-5 h-5 text-[#b45309]" /> My Leave Summary (2026)
            </h3>

            {/* Leave Type Breakdown — 3 Compact Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {LEAVE_BALANCE.map((lb) => (
                <div key={lb.type} className={`p-3.5 rounded-2xl border shadow-2xs hover:shadow-xs transition ${lb.color} space-y-2`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">{lb.type}</span>
                    <span className="text-sm">{lb.icon}</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-xl font-black text-slate-900">{lb.remaining}</span>
                    <span className="text-[10px] text-slate-400 font-semibold pb-0.5">/ {lb.total} left</span>
                  </div>
                  <div className="w-full bg-white/80 rounded-full h-1.5 overflow-hidden shadow-inner">
                    <div className={`h-full rounded-full ${lb.bar} transition-all duration-500`} style={{ width: `${Math.round((lb.remaining / lb.total) * 100)}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold block">{lb.used} day{lb.used !== 1 ? 's' : ''} used</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── 2. ATTENDANCE HISTORY TABLE WITH TODAY | TOMORROW | THIS MONTH | CUSTOM TOGGLES ── */}
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">Attendance History</h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Live check-in, check-out, locations, remarks, and work duration.</p>
              </div>

              <button
                type="button"
                onClick={() => navigate(attendanceRoute)}
                className="mgr-card px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5 active:scale-95 shrink-0"
              >
                📹 Mark Attendance Now
              </button>
            </div>

            {/* Filter Toggle Controls: TODAY | YESTERDAY | THIS MONTH | CUSTOM */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 bg-slate-100/85 p-1 rounded-xl overflow-x-auto max-w-full shrink-0 flex-nowrap border border-slate-200/60 no-scrollbar">
                {["TODAY", "YESTERDAY", "THIS MONTH", "CUSTOM"].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setReportFilterMode(mode)}
                    className={`mgr-card px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-extrabold tracking-wide transition cursor-pointer shrink-0 whitespace-nowrap ${
                      reportFilterMode === mode 
                        ? "bg-[#0b3c5d] text-white shadow-xs" 
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                    }`}
                  >
                    {mode === "CUSTOM" ? "CUSTOM DATE" : mode}
                  </button>
                ))}
              </div>

              {/* Custom Date Input */}
              {reportFilterMode === "CUSTOM" && (
                <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-1 bg-white text-xs font-bold text-slate-700 shadow-2xs shrink-0">
                  <span className="text-slate-400 font-medium">Select Target Date:</span>
                  <input
                    type="date"
                    value={customDateFilter}
                    onChange={(e) => setCustomDateFilter(e.target.value)}
                    className="mgr-card text-xs font-bold bg-transparent focus:outline-none cursor-pointer"
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
                    <div className="p-8 text-center bg-slate-50 border-slate-200 rounded-2xl text-xs font-semibold text-slate-500 space-y-2">
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
            <p className="text-slate-500 text-sm mt-0.5 font-semibold">Apply for leave — your request will be sent to CEO for approval.</p>
          </div>

          {/* Leave Balance */}
          {(() => {
            const myLeaves = Array.isArray(myLeaveRequests) ? myLeaveRequests : [];
            const leaveCards = [
              {
                type: 'Casual Leave',
                allowed: Number((profile && (profile.annual_leaves ?? profile.annualLeaves)) ?? 12),
                consumed: myLeaves.filter(r => (r.leaveType === 'Casual Leave' || r.leaveType === 'Full Day Leave' || String(r.leaveType || '').includes('Casual') || String(r.leaveType || '').includes('Full')) && r.status !== 'Rejected').reduce((sum, r) => sum + getLeaveRequestDays(r), 0),
                unit: 'Days',
                color: 'bg-emerald-50 border-emerald-200 text-emerald-955',
                barColor: 'bg-emerald-600',
                description: 'General full-day casual leaves'
              },
              {
                type: 'Sick Leave',
                allowed: Number((profile && (profile.sick_leaves ?? profile.sickLeaves)) ?? 10),
                consumed: myLeaves.filter(r => (r.leaveType === 'Sick Leave' || String(r.leaveType || '').includes('Sick')) && r.status !== 'Rejected').reduce((sum, r) => sum + getLeaveRequestDays(r), 0),
                unit: 'Days',
                color: 'bg-rose-50 border-rose-200 text-rose-955',
                barColor: 'bg-rose-600',
                description: 'Medical rest / Sick leave balance'
              },
              {
                type: 'Other Leave',
                allowed: Number((profile && (profile.other_leaves ?? profile.otherLeaves)) ?? 10),
                consumed: myLeaves.filter(r => (r.leaveType === 'Other Leave' || String(r.leaveType || '').includes('Other')) && r.status !== 'Rejected').reduce((sum, r) => sum + getLeaveRequestDays(r), 0),
                unit: 'Days',
                color: 'bg-violet-50 border-violet-200 text-violet-955',
                barColor: 'bg-violet-600',
                description: 'Special leaves / WFH / Others'
              },
              {
                type: 'Half-Day Permission',
                allowed: Number((profile && (profile.half_day_permissions ?? profile.halfDayPermissions)) ?? 6),
                consumed: myLeaves.filter(r => (r.leaveType === 'Half-Day Permission' || String(r.leaveType || '').includes('Half')) && r.status !== 'Rejected').reduce((sum, r) => sum + 0.5, 0),
                unit: 'Days',
                color: 'bg-amber-50 border-amber-200 text-amber-955',
                barColor: 'bg-amber-600',
                description: 'Half-day permissions quota'
              },
              {
                type: 'Short Permission',
                allowed: Number((profile && (profile.short_permissions ?? profile.shortPermissions)) ?? 2),
                consumed: myLeaves.filter(r => (r.leaveType === 'Short Permission' || r.leaveType === 'Short Permission (2 Hours)' || String(r.leaveType || '').includes('Short')) && r.status !== 'Rejected').reduce((sum, r) => sum + getLeaveRequestDays(r), 0),
                unit: 'Hours',
                color: 'bg-sky-50 border-sky-200 text-sky-955',
                barColor: 'bg-sky-600',
                description: 'Monthly 2-hour short permission limit'
              }
            ];

            return (
              <>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
                  {leaveCards.map((card) => {
                    const remaining = Math.max(0, card.allowed - card.consumed);
                    const pct = Math.round((remaining / card.allowed) * 100) || 0;
                    return (
                      <div
                        key={card.type}
                        onClick={() => setSelectedLeaveDetailType(card.type)}
                        className={`${card.color} rounded-xl p-3 border shadow-xs space-y-1.5 text-xs cursor-pointer hover:scale-102 transition duration-150 active:scale-98`}
                      >
                        <span className="text-[9px] font-black uppercase tracking-wider block opacity-75">{card.type}</span>
                        <div className="flex items-end gap-1">
                          <span className="text-xl font-black">{remaining}</span>
                          <span className="text-[9px] font-bold opacity-60 mb-0.5">{card.unit.toLowerCase()} left</span>
                        </div>
                        <div className="w-full bg-slate-200/50 rounded-full h-1.5 overflow-hidden">
                          <div className={`h-full rounded-full ${card.barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-[9px] font-semibold opacity-60 flex justify-between">
                          <span>Quota: {card.allowed}</span>
                          <span>Used: {card.consumed}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Leave Detail Modal */}
                {selectedLeaveDetailType && (() => {
                  const card = leaveCards.find(c => c.type === selectedLeaveDetailType);
                  const remaining = Math.max(0, card.allowed - card.consumed);

                  const history = myLeaves.filter(r => {
                    const rType = String(r.leaveType || r.leave_type || '').toLowerCase();
                    const cType = selectedLeaveDetailType.toLowerCase();

                    if (cType.includes('casual')) {
                      return rType.includes('casual') || rType.includes('full day');
                    }
                    if (cType.includes('sick')) {
                      return rType.includes('sick');
                    }
                    if (cType.includes('other')) {
                      return rType.includes('other');
                    }
                    if (cType.includes('half')) {
                      return rType.includes('half');
                    }
                    if (cType.includes('short')) {
                      return rType.includes('short');
                    }
                    return false;
                  });

                  return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                      <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 text-slate-800 text-xs">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                          <div>
                            <h3 className="text-base font-black text-slate-900">{selectedLeaveDetailType} History</h3>
                            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{card.description}</p>
                          </div>
                          <button
                            onClick={() => setSelectedLeaveDetailType(null)}
                            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                          >
                            <X size={18} />
                          </button>
                        </div>

                        <div className="p-6 pb-2 grid grid-cols-3 gap-3 border-b border-slate-100">
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-center">
                            <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Total Allowed</span>
                            <span className="text-lg font-black text-slate-800">{card.allowed} {card.unit}</span>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-center">
                            <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Total Taken</span>
                            <span className="text-lg font-black text-slate-800">{card.consumed} {card.unit}</span>
                          </div>
                          <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 text-center">
                            <span className="text-[9px] font-black uppercase text-teal-700 block tracking-wider">Remaining</span>
                            <span className="text-lg font-black text-teal-900">{remaining} {card.unit}</span>
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                          {history.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 font-bold text-xs italic bg-slate-50 rounded-2xl border border-slate-100">
                              No leave requests logged for this type.
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs font-semibold text-slate-700 border-collapse">
                                <thead>
                                  <tr className="border-b border-slate-200 text-slate-400 font-black uppercase text-[9px] tracking-wider">
                                    <th className="pb-2">Date (From/To)</th>
                                    <th className="pb-2">Duration</th>
                                    <th className="pb-2">Reason</th>
                                    <th className="pb-2">Status</th>
                                    <th className="pb-2">Reviewer Comment</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-slate-850">
                                  {history.map((r, idx) => {
                                    const fromDateStr = r.fromDate || r.from_date || '—';
                                    const toDateStr = r.toDate || r.to_date || '—';
                                    const dateDisplay = fromDateStr === toDateStr ? fromDateStr : `${fromDateStr} to ${toDateStr}`;
                                    return (
                                      <tr key={r.id || idx} className="hover:bg-slate-50/50">
                                        <td className="py-2.5">{dateDisplay}</td>
                                        <td className="py-2.5 font-bold text-slate-900">{r.days || r.duration || '1 Day'}</td>
                                        <td className="py-2.5 text-slate-500 italic font-normal max-w-[200px] truncate" title={r.reason}>
                                          {r.reason}
                                        </td>
                                        <td className="py-2.5">
                                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black border uppercase tracking-wider ${
                                            r.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                            r.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                            'bg-amber-50 text-amber-750 border-amber-200'
                                          }`}>{r.status || 'Pending'}</span>
                                        </td>
                                        <td className="py-2.5 text-slate-500 font-normal italic">
                                          {r.managerRemark || r.manager_comment || r.managerComment || '—'}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                          <button
                            onClick={() => setSelectedLeaveDetailType(null)}
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black cursor-pointer shadow-sm"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            );
          })()}

          {/* Leave Application Form */}
          {leaveSubmitted ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center space-y-3">
              <CheckCircle2 size={40} className="text-emerald-600 mx-auto" />
              <h2 className="text-xl font-black text-emerald-900">Leave Request Submitted!</h2>
              <p className="text-emerald-700 font-semibold text-sm">Your leave has been forwarded to CEO for approval.</p>
              <button onClick={() => setLeaveSubmitted(false)} className="mgr-card mt-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer">
                Apply Another Leave
              </button>
            </div>
          ) : (
            <form onSubmit={handleMyLeaveSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
              <h3 className="text-sm font-black text-slate-900">Apply for Leave / Permission</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-extrabold text-slate-600 uppercase block mb-1">Request Type</label>
                  <select
                    value={myLeaveForm.leaveType}
                    onChange={(e) => setMyLeaveForm({ ...myLeaveForm, leaveType: e.target.value })}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white font-bold text-slate-800 focus:outline-none focus:border-[#b45309]"
                  >
                    {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {myLeaveForm.leaveType.includes('Permission') ? (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs font-extrabold text-slate-600 uppercase block mb-1">Date</label>
                      <input
                        type="date" required value={myLeaveForm.permissionDate}
                        onChange={(e) => setMyLeaveForm({ ...myLeaveForm, permissionDate: e.target.value })}
                        className="w-full h-10 border border-slate-200 rounded-xl px-2 bg-white text-xs font-semibold focus:outline-none focus:border-[#b45309]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-extrabold text-slate-600 uppercase block mb-1">Start Time</label>
                      <input
                        type="time" required value={myLeaveForm.startTime}
                        onChange={(e) => setMyLeaveForm({ ...myLeaveForm, startTime: e.target.value })}
                        className="w-full h-10 border border-slate-200 rounded-xl px-2 bg-white text-xs font-semibold focus:outline-none focus:border-[#b45309]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-extrabold text-slate-600 uppercase block mb-1">End Time</label>
                      <input
                        type="time" required value={myLeaveForm.endTime}
                        onChange={(e) => setMyLeaveForm({ ...myLeaveForm, endTime: e.target.value })}
                        className="w-full h-10 border border-slate-200 rounded-xl px-2 bg-white text-xs font-semibold focus:outline-none focus:border-[#b45309]"
                      />
                    </div>
                  </div>
                ) : (
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
                )}
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-600 uppercase block mb-1">Reason / Description</label>
                <textarea
                  rows={3} required value={myLeaveForm.reason}
                  onChange={(e) => setMyLeaveForm({ ...myLeaveForm, reason: e.target.value })}
                  placeholder="Describe your reason..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#b45309] resize-none bg-slate-50"
                />
              </div>

              <button type="submit" className="mgr-card w-full py-3 rounded-xl bg-[#b45309] hover:bg-mgr-primary-700 text-white font-black text-sm flex items-center justify-center gap-2 transition cursor-pointer">
                <Send size={16} /> Submit Leave Request to CEO
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
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border whitespace-nowrap ${r.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                        r.status === 'Rejected' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                          'bg-mgr-primary-100 text-mgr-primary-800 border-mgr-primary-300'
                      }`}>{r.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
                      <button onClick={() => setPreviewDoc(doc)} className="mgr-card text-xs font-extrabold px-3 py-1.5 rounded-xl bg-mgr-primary-50 text-[#b45309] border border-mgr-primary-300 cursor-pointer flex items-center gap-1">
                        <Eye size={13} /> View
                      </button>
                      <button onClick={() => document.getElementById(`file_m_${doc.id}`)?.click()} className="mgr-card text-xs font-extrabold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer flex items-center gap-1">
                        <Upload size={13} /> Re-upload
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => document.getElementById(`file_m_${doc.id}`)?.click()} className="mgr-card text-xs font-extrabold px-4 py-1.5 rounded-xl bg-slate-900 text-white cursor-pointer flex items-center gap-1">
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
              className="mgr-card border-2 border-dashed border-[#b45309]/40 hover:border-[#b45309] bg-mgr-primary-50/30 hover:bg-mgr-primary-50/60 rounded-2xl p-8 text-center transition cursor-pointer group"
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
                      <tr key={r.id || idx} className="hover:bg-mgr-primary-50/20">
                        <td className="px-4 py-3 font-mono font-bold text-slate-700">{r.date}</td>
                        <td className="px-4 py-3">
                          <span className="bg-mgr-primary-50 text-mgr-primary-950 border border-mgr-primary-300 px-1.5 py-0.5 rounded text-[10px] font-mono font-black">
                            [{r.employee_code || 'EMP000012'}]
                          </span>
                        </td>
                        <td className="px-4 py-3 font-extrabold text-slate-900">{r.executive}</td>
                        <td className="px-4 py-3 font-black text-slate-800">{r.callsMade}</td>
                        <td className="px-4 py-3 font-black text-emerald-700">{r.visitsCompleted}</td>
                        <td className="px-4 py-3 font-black text-mgr-secondary-700">{r.leadsGenerated}</td>
                        <td className="px-4 py-3 font-black text-mgr-primary-900">{r.dealsClosed}</td>
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
        <div className="max-w-4xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <CalendarDays className="w-6 h-6 text-mgr-primary-600" /> Holiday Calendar 2026–27
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Official holiday schedule published by HR & Management.
              </p>
            </div>
            {holidayPdfData && (
              <div className="flex items-center gap-2">
                <a
                  href={holidayPdfData.url}
                  download={holidayPdfData.name || "Holiday_Calendar.pdf"}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> Download PDF
                </a>
                <button
                  type="button"
                  onClick={() => {
                    const win = window.open('', '_blank');
                    if (win) win.document.write(`<iframe src="${holidayPdfData.url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                  }}
                  className="px-4 py-2 bg-mgr-primary-600 hover:bg-mgr-primary-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  <Eye className="w-4 h-4" /> View Fullscreen
                </button>
              </div>
            )}
          </div>

          {holidayPdfData ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
                <span>📄 Official Document: <strong>{holidayPdfData.name}</strong></span>
                {holidayPdfData.date && <span>Uploaded by Admin on: {new Date(holidayPdfData.date).toLocaleDateString()}</span>}
              </div>
              <iframe
                src={holidayPdfData.url}
                className="w-full h-[650px] rounded-xl border border-slate-200 shadow-inner bg-slate-900/5"
                title="Official Holiday Calendar PDF"
              />
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs font-semibold text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>📄 Official Holiday Calendar PDF has not been uploaded by Admin yet. Below is the general holiday list:</span>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100">
            {HOLIDAYS.map((h) => (
              <div key={h.date} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div>
                  <p className="font-black text-slate-900 text-sm">{h.name}</p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{h.date}</p>
                </div>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${h.type === 'National' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                    h.type === 'Festival' ? 'bg-mgr-primary-50 text-mgr-primary-800 border-mgr-primary-200' :
                      'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}>{h.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. MANAGER HANDBOOK */}
      {activeSection === 'handbook' && (
        <div className="max-w-4xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-mgr-primary-600" /> Twite Employee Handbook
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Official company policy, rules, and guidelines handbook document.
              </p>
            </div>
            {handbookPdfData && (
              <div className="flex items-center gap-2">
                <a
                  href={handbookPdfData.url}
                  download={handbookPdfData.name || "Twite_Handbook.pdf"}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> Download Handbook PDF
                </a>
                <button
                  type="button"
                  onClick={() => {
                    const win = window.open('', '_blank');
                    if (win) win.document.write(`<iframe src="${handbookPdfData.url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                  }}
                  className="px-4 py-2 bg-mgr-primary-600 hover:bg-mgr-primary-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  <Eye className="w-4 h-4" /> View Fullscreen
                </button>
              </div>
            )}
          </div>

          {handbookPdfData ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
                <span>📄 Official Document: <strong>{handbookPdfData.name}</strong></span>
                {handbookPdfData.date && <span>Uploaded by Admin on: {new Date(handbookPdfData.date).toLocaleDateString()}</span>}
              </div>
              <iframe
                src={handbookPdfData.url}
                className="w-full h-[650px] rounded-xl border border-slate-200 shadow-inner bg-slate-900/5"
                title="Twite Employee Handbook PDF"
              />
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs font-semibold text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>📄 Twite Employee Handbook PDF has not been uploaded by Admin yet. Below is the general policies summary:</span>
            </div>
          )}

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

      {/* Sales Reports sub-view */}
      {activeSection === 'sales_report' && (
        <ManagerSalesReports />
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
