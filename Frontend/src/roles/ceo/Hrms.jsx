import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useToast } from '../../common/ToastContext.jsx'
import {
  Briefcase,
  Users,
  Calendar,
  CalendarDays,
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
  HeartPulse,
  Code2,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Building2,
  Eye,
} from 'lucide-react'
import { hrmsAPI, attendanceAPI, userAPI, reportAPI } from '../../services/api.js'
import { exportToCSV } from '../../utils/exportUtils.js'
import HolidayCalendar from '../../common/HolidayCalendar.jsx'

const EmployeeProfileModal = ({ employee, onClose }) => {
  const [previewDoc, setPreviewDoc] = useState(null);
  if (!employee) return null;
  const parsedDocs = (() => {
    if (!employee.documents) return [];
    try {
      return typeof employee.documents === "string" ? JSON.parse(employee.documents) : employee.documents;
    } catch {
      return [];
    }
  })();

  const Section = ({ icon: Icon, title, color = "blue", children }) => (
    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <Icon size={15} className={`text-${color}-600`} />
        <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">{title}</h4>
      </div>
      {children}
    </div>
  );

  const InfoRow = ({ label, value }) => (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-xs font-semibold text-slate-850">{value || "—"}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5 border border-slate-200 shadow-2xl relative text-left">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          ✕
        </button>

        <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 border-2 border-blue-500 shrink-0 flex items-center justify-center font-bold text-slate-700 text-xl">
            {employee.profile_photo ? (
              <img src={employee.profile_photo} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              (employee.name || "E").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg">{employee.name}</h3>
            <p className="text-xs text-slate-500 font-semibold">
              {employee.employee_code || employee.employee_id || "N/A"} · {employee.department || employee.dept || "Sales"} · {employee.designation || employee.role || "Sales Executive"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Section icon={Briefcase} title="Work Details" color="blue">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <InfoRow label="Official Email" value={employee.email} />
              <InfoRow label="Phone Number" value={employee.phone} />
              <InfoRow label="Employment Type" value={employee.employment_type} />
              <InfoRow label="Work Mode" value={employee.work_mode} />
              <InfoRow label="Work Location" value={employee.work_location} />
              <InfoRow label="Status" value={employee.status} />
            </div>
          </Section>

          <Section icon={HeartPulse} title="Personal Details" color="rose">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <InfoRow label="Date of Birth" value={employee.date_of_birth} />
              <InfoRow label="Marital Status" value={employee.marital_status} />
              <InfoRow label="Blood Group" value={employee.blood_group} />
              <InfoRow label="PAN ID" value={employee.pan_id} />
              <InfoRow label="Personal Email" value={employee.personal_email} />
              <InfoRow label="Alternate Contact" value={employee.alternate_contact} />
              <InfoRow label="City" value={employee.city} />
              <InfoRow label="State" value={employee.state} />
              <InfoRow label="Country" value={employee.country} />
              <InfoRow label="Postal Code" value={employee.postal_code} />
            </div>
            <div className="mt-2 text-xs space-y-2 border-t border-slate-100 pt-2">
              <InfoRow label="Current Address" value={employee.current_address} />
              <InfoRow label="Permanent Address" value={employee.permanent_address} />
            </div>
          </Section>

          <Section icon={Code2} title="Skills & Tech" color="indigo">
            <div className="space-y-2 text-xs">
              <InfoRow label="Primary Skills" value={employee.primary_skills} />
              <InfoRow label="Secondary Skills" value={employee.secondary_skills} />
              <InfoRow label="Tools & Tech" value={employee.tools} />
            </div>
          </Section>

          <Section icon={AlertCircle} title="Emergency Contact" color="rose">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <InfoRow label="Contact Name" value={employee.emergency_name} />
              <InfoRow label="Relationship" value={employee.emergency_relationship} />
              <InfoRow label="Contact Number" value={employee.emergency_contact} />
            </div>
          </Section>

          <Section icon={CreditCard} title="Bank Details" color="emerald">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <InfoRow label="Account Holder" value={employee.account_holder} />
              <InfoRow label="Bank Name" value={employee.bank_name} />
              <InfoRow label="Account Number" value={employee.account_number} />
              <InfoRow label="IFSC Code" value={employee.ifsc} />
              <InfoRow label="Branch" value={employee.branch} />
            </div>
          </Section>

          <Section icon={FileText} title="Employee Documents" color="teal">
            <div className="space-y-1.5 text-xs">
              {parsedDocs.length === 0 ? (
                <p className="text-slate-400 text-xs italic">No documents uploaded yet.</p>
              ) : (
                parsedDocs.map((doc, idx) => {
                  const docUrl = doc.fileUrl || doc.url || doc.file_url || doc.file || doc.preview || doc.data || null;
                  return (
                    <div key={doc.id || idx} className="flex items-center justify-between border-b border-slate-100 pb-1.5 last:border-b-0">
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-slate-800 truncate">{doc.name}</p>
                        <p className="text-[10px] text-emerald-600 font-medium truncate">✅ {doc.fileName || 'Uploaded'}</p>
                      </div>
                      {docUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({ ...doc, fileUrl: docUrl })}
                          className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 font-extrabold text-[11px] rounded-lg transition cursor-pointer flex-shrink-0 shadow-2xs"
                        >
                          View File
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Section>
        </div>

        {/* In-App Document Preview Modal */}
        {previewDoc && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0">
                <div className="min-w-0 pr-4">
                  <h3 className="font-black text-slate-900 text-sm truncate">{previewDoc.name}</h3>
                  <p className="text-[11px] text-slate-400 font-semibold truncate">{previewDoc.fileName || "Document File"}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {previewDoc.fileUrl && (
                    <a
                      href={previewDoc.fileUrl}
                      download={previewDoc.fileName || `${previewDoc.name}.png`}
                      className="p-2 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition cursor-pointer"
                      title="Download File"
                    >
                      <Download size={18} />
                    </a>
                  )}
                  <button
                    onClick={() => setPreviewDoc(null)}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-50 rounded-2xl p-3 min-h-[320px] border border-slate-100">
                {previewDoc.fileUrl?.startsWith('data:image') || previewDoc.fileUrl?.match(/\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i) || previewDoc.fileName?.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) ? (
                  <img
                    src={previewDoc.fileUrl}
                    alt={previewDoc.name}
                    className="max-w-full max-h-[62vh] object-contain rounded-xl shadow-xs border border-slate-200"
                  />
                ) : previewDoc.fileUrl?.startsWith('data:application/pdf') || previewDoc.fileUrl?.match(/\.pdf($|\?)/i) || previewDoc.fileName?.match(/\.pdf$/i) ? (
                  <iframe
                    src={previewDoc.fileUrl}
                    title={previewDoc.name}
                    className="w-full h-[62vh] rounded-xl border border-slate-200"
                  />
                ) : (
                  <div className="text-center py-12 space-y-3">
                    <FileText size={48} className="mx-auto text-slate-400" />
                    <p className="text-xs font-bold text-slate-600">Preview not supported for this file format.</p>
                    {previewDoc.fileUrl && (
                      <a
                        href={previewDoc.fileUrl}
                        download={previewDoc.fileName || 'document'}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition"
                      >
                        <Download size={14} /> Download File
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DEFAULT_CEO_TABS_LIST = [
  { id: 'employees', label: 'Employee Directory', icon: Users },
  { id: 'daily_reports', label: 'Daily Report', icon: FileText },
  { id: 'leaves', label: 'Leave Management', icon: Calendar },
  { id: 'calendar', label: 'Holiday Calendar', icon: CalendarDays },
];

function CeoHrms({ initialTab = 'employees' }) {
  const { showToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const rawActiveTab = searchParams.get('tab') || initialTab // 'employees' | 'daily_reports' | 'leaves'
  const activeTab = DEFAULT_CEO_TABS_LIST.some(t => t.id === rawActiveTab) ? rawActiveTab : 'employees'
  const setActiveTab = (val) => setSearchParams({ tab: val })

  const [attendanceFilter, setAttendanceFilter] = useState('Today')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();
  const userEmail = (user.email || '').toLowerCase().trim();

  const DEFAULT_CEO_TABS = DEFAULT_CEO_TABS_LIST;

  const [hrmsTabs, setHrmsTabs] = useState(() => {
    const saved = localStorage.getItem(`tc_hrms_order_ceo_${userEmail}`);
    if (saved) {
      try {
        const keys = JSON.parse(saved);
        const ordered = [];
        keys.forEach(k => {
          const match = DEFAULT_CEO_TABS.find(n => n.id === k);
          if (match) ordered.push(match);
        });
        DEFAULT_CEO_TABS.forEach(n => {
          if (!ordered.some(o => o.id === n.id)) {
            ordered.push(n);
          }
        });
        return ordered;
      } catch (e) {
        return DEFAULT_CEO_TABS;
      }
    }
    return DEFAULT_CEO_TABS;
  });

  useEffect(() => {
    const saved = localStorage.getItem(`tc_hrms_order_ceo_${userEmail}`);
    if (saved) {
      try {
        const keys = JSON.parse(saved);
        const ordered = [];
        keys.forEach(k => {
          const match = DEFAULT_CEO_TABS.find(n => n.id === k);
          if (match) ordered.push(match);
        });
        DEFAULT_CEO_TABS.forEach(n => {
          if (!ordered.some(o => o.id === n.id)) {
            ordered.push(n);
          }
        });
        setHrmsTabs(ordered);
      } catch (e) {
        setHrmsTabs(DEFAULT_CEO_TABS);
      }
    } else {
      setHrmsTabs(DEFAULT_CEO_TABS);
    }
  }, [userEmail]);

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
    const keys = reordered.map(item => item.id);
    localStorage.setItem(`tc_hrms_order_ceo_${userEmail}`, JSON.stringify(keys));
    showToast("HRMS tab order updated!", "success");
  };
  const handleTabDragEnd = () => {
    setDraggedTabKey(null);
  };
  const resetHrmsTabs = () => {
    localStorage.removeItem(`tc_hrms_order_ceo_${userEmail}`);
    setHrmsTabs(DEFAULT_CEO_TABS);
    showToast("HRMS tabs reset to default.", "info");
  };
  const [loading, setLoading] = useState(() => {
    try {
      return !localStorage.getItem('tc_ceo_hrms_cache')
    } catch {
      return false
    }
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState(null)

  // Filtering states
  const [selectedDepartment, setSelectedDepartment] = useState('All')
  const [roleFilter, setRoleFilter] = useState('All') // 'All' | 'Admin' | 'Sales Manager' | 'Sales Executive'
  const [datePeriodFilter, setDatePeriodFilter] = useState('Today') // 'Today' | 'This Month' | 'Custom'
  const [employeePage, setEmployeePage] = useState(1)
  const [rawAttendanceLogs, setRawAttendanceLogs] = useState([])

  // 1. Employees Directory State
  const [employees, setEmployees] = useState([])

  // 2. Leave Requests State
  const [leaveRequests, setLeaveRequests] = useState([])
  const [leavePage, setLeavePage] = useState(1)

  // 3. Permission Requests State
  const [permissionRequests, setPermissionRequests] = useState([])
  const [permPage, setPermPage] = useState(1)

  // 4. Attendance Summary State
  const [attendanceSummary, setAttendanceSummary] = useState({
    totalEmployees: 0,
    presentToday: 0,
    lateArrivals: 0,
    onLeave: 0,
    absent: 0,
    dailyLogs: [],
  })

  // 5. Management Daily Reports State (Admin & Sales Manager Daily Reports managed by CEO)
  const [managementDailyReports, setManagementDailyReports] = useState(() => {
    try {
      const saved = localStorage.getItem('tc_ceo_management_daily_reports')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch (e) {}

    const todayStr = new Date().toISOString().slice(0, 10)
    return [
      {
        id: 'RPT-MGR-001',
        date: todayStr,
        submitted_by: 'Jeeva kumar',
        email: 'jeeva.manager@tconnect.com',
        role: 'Sales Manager',
        department: 'Sales & Business Development',
        tasks_accomplished: 'Conducted team pipeline review, accompanied executive on 3 high-value enterprise client meetings.',
        key_highlights: 'Closed ₹1,25,000 contract with Apex Corp.',
        blockers: 'None. Escalated 1 customized SLA request to CEO.',
        status: 'Pending Review',
        ceo_remarks: '',
        submitted_at: `${todayStr} 18:30`,
      },
      {
        id: 'RPT-ADM-002',
        date: todayStr,
        submitted_by: 'Siva Murugan',
        email: 'siva.admin@tconnect.com',
        role: 'Admin',
        department: 'Human Resources',
        tasks_accomplished: 'Completed monthly payroll verification, processed 2 new executive onboardings and asset allocation.',
        key_highlights: 'All employee attendance logs and biometric integrations synced 100%.',
        blockers: 'Awaiting CEO clearance for 2 leave override requests.',
        status: 'Pending Review',
        ceo_remarks: '',
        submitted_at: `${todayStr} 19:10`,
      },
      {
        id: 'RPT-MGR-003',
        date: todayStr,
        submitted_by: 'Anand Raj',
        email: 'anand.field@tconnect.com',
        role: 'Sales Manager',
        department: 'Field Operations',
        tasks_accomplished: 'Inspected Chennai & Bangalore field visit logs, verified check-in GPS alerts.',
        key_highlights: 'Field team logged 14 client check-ins today.',
        blockers: 'Vehicle travel allowance claim requires CEO signoff.',
        status: 'Reviewed',
        ceo_remarks: 'Approved. Keep up the high field coverage.',
        submitted_at: `${todayStr} 17:45`,
      },
      {
        id: 'RPT-ADM-004',
        date: todayStr,
        submitted_by: 'Priya Sharma',
        email: 'priya.sysadmin@tconnect.com',
        role: 'Admin',
        department: 'IT & Operations',
        tasks_accomplished: 'Audited role permission matrix, updated branch master settings in Admin portal.',
        key_highlights: 'System uptime 99.9%. Supabase RLS security policies verified clean.',
        blockers: 'None.',
        status: 'Reviewed',
        ceo_remarks: 'Verified & cleared.',
        submitted_at: `${todayStr} 18:00`,
      },
    ]
  })

  const [dailyReportDeptFilter, setDailyReportDeptFilter] = useState('All')
  const [dailyReportRoleFilter, setDailyReportRoleFilter] = useState('All')
  const [dailyReportDateFilter, setDailyReportDateFilter] = useState('')
  const [dailyReportStatusFilter, setDailyReportStatusFilter] = useState('All')
  const [selectedReportForReview, setSelectedReportForReview] = useState(null)
  const [reportReviewModalOpen, setReportReviewModalOpen] = useState(false)
  const [reportCeoRemarksInput, setReportCeoRemarksInput] = useState('')
  const [reportPage, setReportPage] = useState(1)

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [reviewRemarks, setReviewRemarks] = useState('')
  const [reviewAction, setReviewAction] = useState('Approved')

  // Helper to format checkin time cleanly
  const formatTimeOnly = (raw) => {
    if (!raw || raw === '—' || raw === '--') return '—'
    try {
      const s = String(raw).trim()
      if (s.match(/^\d{1,2}:\d{2}\s*(AM|PM)$/i)) return s
      if (s.includes('T') || s.includes('-')) {
        const d = new Date(s)
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        }
      }
      const match = s.match(/(\d{1,2}):(\d{2})/)
      if (match) {
        let h = parseInt(match[1], 10)
        const m = match[2]
        const ampm = h >= 12 ? 'PM' : 'AM'
        h = h % 12 || 12
        return `${String(h).padStart(2, '0')}:${m} ${ampm}`
      }
      return s
    } catch {
      return raw
    }
  }

  // Helper to format date into DD/MM/YYYY
  const formatDDMMYYYY = (raw) => {
    if (!raw || raw === '—' || raw === '--') return '—'
    try {
      const s = String(raw).split('T')[0].split(' ')[0]
      const parts = s.split('-')
      if (parts.length === 3 && parts[0].length === 4) {
        const [y, m, d] = parts
        return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`
      }
      const dObj = new Date(raw)
      if (!isNaN(dObj.getTime())) {
        const day = String(dObj.getDate()).padStart(2, '0')
        const month = String(dObj.getMonth() + 1).padStart(2, '0')
        const year = dObj.getFullYear()
        return `${day}/${month}/${year}`
      }
      return raw
    } catch {
      return raw
    }
  }

  // Load real data from backend
  useEffect(() => {
    async function fetchHrmsData() {
      if (!localStorage.getItem('tc_ceo_hrms_cache')) {
        setLoading(true)
      }
      try {
        const [empRes, leaveRes, attRes, eodRes, usersRes] = await Promise.all([
          hrmsAPI.getEmployees().catch(() => null),
          attendanceAPI.getLeaveRequests().catch(() => null),
          attendanceAPI.getLogs().catch(() => null),
          reportAPI.getEODReports ? reportAPI.getEODReports().catch(() => null) : Promise.resolve(null),
          userAPI.getUsers ? userAPI.getUsers().catch(() => null) : Promise.resolve(null),
        ])

        const rawLogs = (attRes && attRes.data && Array.isArray(attRes.data)) ? attRes.data : []
        setRawAttendanceLogs(rawLogs)
        const todayStr = new Date().toISOString().slice(0, 10)

        // Load dynamic EOD work reports from backend or derive from management staff
        const rawEod = Array.isArray(eodRes?.data) ? eodRes.data : (Array.isArray(eodRes) ? eodRes : [])
        if (rawEod.length > 0) {
          const mappedEod = rawEod.map((r, idx) => ({
            id: r.id || r.report_id || `RPT-${idx + 1}`,
            date: r.date || r.report_date || (r.created_at ? r.created_at.split('T')[0] : todayStr),
            submitted_by: r.submitted_by || r.employee_name || r.name || 'Management Executive',
            email: r.email || r.employee_email || '',
            role: r.role || r.designation || 'Sales Manager',
            department: r.department || r.dept || 'Sales & BD',
            tasks_accomplished: r.tasks_accomplished || r.tasks || r.summary || r.report || 'EOD Work Summary submitted.',
            key_highlights: r.key_highlights || r.highlights || r.wins || '—',
            blockers: r.blockers || r.issues || 'None',
            status: r.status || 'Pending Review',
            ceo_remarks: r.ceo_remarks || r.remarks || '',
            submitted_at: r.created_at || r.submitted_at || '',
          }))
          setManagementDailyReports(mappedEod)
        }

        // Filter today's attendance logs
        const todayLogs = rawLogs.filter(l => {
          const lDate = l.date || (l.check_in_time ? String(l.check_in_time).slice(0, 10) : '') || (l.created_at ? String(l.created_at).slice(0, 10) : '')
          return lDate === todayStr || l.is_today === true
        })

        const rawEmpList = Array.isArray(empRes?.data) ? empRes.data : (Array.isArray(empRes) ? empRes : [])
        const rawUsersList = Array.isArray(usersRes?.data) ? usersRes.data : (Array.isArray(usersRes) ? usersRes : [])
        const combinedRaw = [...rawEmpList, ...rawUsersList]

        const uniqueEmpMap = new Map()
        combinedRaw.forEach(e => {
          if (!e) return
          const key = (e.email || '').toLowerCase().trim() || String(e.employee_code || e.employee_id || e.id || '').toLowerCase().trim()
          if (key && !uniqueEmpMap.has(key)) {
            uniqueEmpMap.set(key, e)
          }
        })
        const empSourcePool = Array.from(uniqueEmpMap.values())

        if (empSourcePool.length > 0) {
          setEmployees(
            empSourcePool.map((e, idx) => {
              const empCode = e.employee_code || e.employee_id || e.id || ''
              const empEmail = (e.email || '').toLowerCase().trim()
              const empName = (e.name || e.full_name || '').toLowerCase().trim()

              // Find today's checkin log for this specific employee
              const empLog = todayLogs.find(l => 
                (l.employee_id && (l.employee_id === e.id || l.employee_id === empCode)) ||
                (l.user_id && (l.user_id === e.id || l.user_id === empCode)) ||
                (l.employee_code && l.employee_code === empCode) ||
                (l.email && l.email.toLowerCase().trim() === empEmail) ||
                (l.employee_name && l.employee_name.toLowerCase().trim() === empName) ||
                (l.name && l.name.toLowerCase().trim() === empName)
              )

              const hasCheckedIn = Boolean(empLog && (empLog.check_in_time || empLog.clockIn || empLog.login_time))
              const checkinTime = hasCheckedIn 
                ? formatTimeOnly(empLog.check_in_time || empLog.clockIn || empLog.login_time)
                : '—'
              const isAbsent = !hasCheckedIn

              return {
                ...e,
                id: e.id || `EMP-${100 + idx}`,
                name: e.name || e.full_name || `${e.first_name || ''} ${e.last_name || ''}`.trim() || 'Staff Member',
                email: e.email || 'employee@tconnect.com',
                role: e.role || e.designation || (idx === 0 ? 'Admin' : idx < 3 ? 'Sales Manager' : 'Sales Executive'),
                department: e.department || e.dept || 'Sales & Business Development',
                status: isAbsent ? 'Absent' : 'Present',
                checkin: checkinTime,
                hasCheckedIn,
              }
            })
          )
        }

        if (leaveRes && leaveRes.data && leaveRes.data.length > 0) {
          const rawList = leaveRes.data.map((l, idx) => ({
            id: l.id || l.leave_id || `LV-${500 + idx}`,
            date: (l.from_date || l.start_date || l.date || l.created_at || new Date().toISOString().slice(0, 10)).split('T')[0],
            employee_name: l.employee_name || l.name || l.executive_name || 'Team Member',
            role: l.role || 'Sales Executive',
            leave_type: l.leave_type || 'Leave',
            duration: l.duration || '1 Day',
            reason: l.reason || 'Personal necessity',
            status: l.status || 'Pending',
            submitted_at: l.created_at || 'Recent',
            reviewed_by: l.reviewed_by,
            type: l.leave_type || 'Permission',
            timing: l.time_slot || '2 Hours',
            reporting_manager: l.reporting_manager,
            reporting_manager_name: l.reporting_manager_name,
            reporting_manager_email: l.reporting_manager_email,
          }))

          const ceoExecutiveRequests = rawList.filter((r) => {
            const roleLower = (r.role || '').toLowerCase()
            return roleLower.includes('manager') || roleLower.includes('admin')
          })

          const leavesOnly = ceoExecutiveRequests.filter(
            (r) =>
              !(r.leave_type || '').toLowerCase().includes('permission') &&
              !(r.leave_type || '').toLowerCase().includes('early exit')
          )

          const permissionsOnly = ceoExecutiveRequests.filter(
            (r) =>
              (r.leave_type || '').toLowerCase().includes('permission') ||
              (r.leave_type || '').toLowerCase().includes('early exit')
          )

          setLeaveRequests(leavesOnly)
          setPermissionRequests(permissionsOnly)
        }

        if (rawLogs.length > 0) {
          const loggedInCount = rawLogs.filter(l => l.status === 'Logged in' || !l.clockOut || l.clockOut === '—').length
          const loggedOffCount = rawLogs.filter(l => l.status === 'Logged off' || (l.clockOut && l.clockOut !== '—')).length

          setAttendanceSummary(prev => ({
            ...prev,
            presentToday: todayLogs.length,
            dailyLogs: rawLogs.map((l, idx) => ({
              id: l.id || `ATT-${idx + 1}`,
              name: l.name || l.employee_name || 'Staff Member',
              date: l.date || '—',
              clockIn: formatTimeOnly(l.clockIn || l.check_in_time),
              clockOut: formatTimeOnly(l.clockOut || l.check_out_time),
              workHours: l.workHours || l.total_working_hours || (l.clockOut && l.clockOut !== '—' ? '8.5 hrs' : 'In Progress'),
              mode: l.mode || 'Biometric',
              status: l.status || (l.clockOut && l.clockOut !== '—' ? 'Logged off' : 'Logged in'),
            }))
          }))
        }
      } catch (err) {
        console.warn('HRMS loaded standard dataset:', err)
      } finally {
        try { localStorage.setItem('tc_ceo_hrms_cache', '1') } catch (_) {}
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

  const getWeekRange = () => {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(now.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    return { start: monday, end: sunday }
  }

  const filteredDailyLogs = React.useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10)
    
    return attendanceSummary.dailyLogs.filter(log => {
      if (!log.date || log.date === '—') return true
      
      const logDateStr = log.date.split('T')[0].split(' ')[0]
      
      if (attendanceFilter === 'Today') {
        return logDateStr === todayStr
      }
      
      if (attendanceFilter === 'This Week') {
        const { start, end } = getWeekRange()
        const lDate = new Date(logDateStr)
        return lDate >= start && lDate <= end
      }
      
      if (attendanceFilter === 'Custom') {
        const lDate = new Date(logDateStr)
        if (customStart) {
          const sDate = new Date(customStart)
          sDate.setHours(0, 0, 0, 0)
          if (lDate < sDate) return false
        }
        if (customEnd) {
          const eDate = new Date(customEnd)
          eDate.setHours(23, 59, 59, 999)
          if (lDate > eDate) return false
        }
      }
      return true
    })
  }, [attendanceSummary.dailyLogs, attendanceFilter, customStart, customEnd])

  // Process employee rows with login/logout time and date matching selected filter
  const todayStr = new Date().toISOString().slice(0, 10)

  const processedEmployeeRows = employees.map((emp) => {
    const empCode = emp.employee_code || emp.employee_id || emp.id || ''
    const empEmail = (emp.email || '').toLowerCase().trim()
    const empName = (emp.name || emp.full_name || '').toLowerCase().trim()

    // Find attendance log for this employee matching period filter
    const empLog = rawAttendanceLogs.find((l) => {
      const matchEmp =
        (l.employee_id && (l.employee_id === emp.id || l.employee_id === empCode)) ||
        (l.user_id && (l.user_id === emp.id || l.user_id === empCode)) ||
        (l.employee_code && l.employee_code === empCode) ||
        (l.email && l.email.toLowerCase().trim() === empEmail) ||
        (l.employee_name && l.employee_name.toLowerCase().trim() === empName) ||
        (l.name && l.name.toLowerCase().trim() === empName)

      if (!matchEmp) return false

      const lDate = l.date || (l.check_in_time ? String(l.check_in_time).slice(0, 10) : '') || (l.created_at ? String(l.created_at).slice(0, 10) : '')
      if (datePeriodFilter === 'Today') return lDate === todayStr || l.is_today === true
      if (datePeriodFilter === 'This Month') return lDate.startsWith(todayStr.slice(0, 7))
      if (datePeriodFilter === 'Custom') {
        if (customStart && lDate < customStart) return false
        if (customEnd && lDate > customEnd) return false
        return true
      }
      return true
    })

    const loginTime = empLog ? formatTimeOnly(empLog.check_in_time || empLog.clockIn || empLog.login_time) : (emp.checkin || '—')
    const logoutTime = empLog ? formatTimeOnly(empLog.check_out_time || empLog.clockOut || empLog.logout_time) : '—'
    const logDate = empLog?.date ? String(empLog.date).slice(0, 10) : todayStr

    let status = emp.status || 'Absent'
    if (empLog) {
      if (logoutTime !== '—') status = 'Logged Off'
      else if (loginTime !== '—') status = 'Logged In'
      else status = 'Present'
    }

    return {
      ...emp,
      date: logDate,
      loginTime,
      logoutTime,
      status,
    }
  })

  // Resolve reporting manager & team lead for an employee
  const resolveEmpSuperiors = (emp) => {
    if (!emp) return { manager: 'Unassigned', teamLead: 'Unassigned' }

    let mgr = emp.reporting_manager_name || emp.reporting_manager || emp.manager_name || emp.sales_manager || emp.manager || ''
    let tl = emp.reporting_team_lead_name || emp.reporting_team_lead || emp.team_lead_name || emp.team_lead || emp.reporting_tl_name || ''

    if (mgr.includes('@')) {
      const mgrEmp = employees.find(e => (e.email || '').toLowerCase().trim() === mgr.toLowerCase().trim())
      if (mgrEmp) {
        mgr = mgrEmp.name || mgrEmp.full_name || mgr
      } else {
        mgr = mgr.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase())
      }
    }

    if (tl.includes('@')) {
      const tlEmp = employees.find(e => (e.email || '').toLowerCase().trim() === tl.toLowerCase().trim())
      if (tlEmp) {
        tl = tlEmp.name || tlEmp.full_name || tl
      } else {
        tl = tl.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase())
      }
    }

    if (mgr && mgr !== 'Unassigned') {
      const mgrEmp = employees.find(e => (e.name || e.full_name || '').toLowerCase().trim() === mgr.toLowerCase().trim())
      if (mgrEmp) {
        const r = (mgrEmp.role || mgrEmp.designation || '').toLowerCase()
        if ((r.includes('lead') || r.includes('tl')) && !r.includes('sales manager')) {
          if (!tl || tl === 'Unassigned') tl = mgr
          const parentMgr = mgrEmp.reporting_manager_name || mgrEmp.reporting_manager || ''
          const parentEmp = employees.find(e => (e.name || e.full_name || '').toLowerCase().trim() === parentMgr.toLowerCase().trim() || (e.email || '').toLowerCase().trim() === parentMgr.toLowerCase().trim())
          if (parentEmp) mgr = parentEmp.name || parentEmp.full_name || parentMgr
          else if (parentMgr && !parentMgr.includes('@')) mgr = parentMgr
          else mgr = 'Unassigned'
        }
      }
    }

    return {
      manager: mgr && mgr !== 'Unassigned' && mgr !== 'Direct / Unassigned' ? mgr : 'Unassigned',
      teamLead: tl && tl !== 'Unassigned' && tl !== 'Direct / Unassigned' ? tl : 'Unassigned',
    }
  }

  // Department cards statistics
  const departmentCards = React.useMemo(() => {
    const map = {}
    processedEmployeeRows.forEach(emp => {
      const dept = emp.department || 'Sales & Business Development'
      if (!map[dept]) {
        map[dept] = { total: 0, present: 0, absent: 0 }
      }
      map[dept].total += 1
      if (emp.status === 'Present' || emp.status === 'Logged In' || emp.status === 'Logged Off') {
        map[dept].present += 1
      } else {
        map[dept].absent += 1
      }
    })

    const list = [
      {
        id: 'All',
        name: 'All Departments',
        total: processedEmployeeRows.length,
        present: processedEmployeeRows.filter(e => e.status === 'Present' || e.status === 'Logged In' || e.status === 'Logged Off').length,
      }
    ]

    Object.keys(map).sort().forEach(dept => {
      list.push({
        id: dept,
        name: dept,
        total: map[dept].total,
        present: map[dept].present,
      })
    })

    return list
  }, [processedEmployeeRows])

  // Filter by Department, Role & Search Query
  const filteredEmployees = processedEmployeeRows.filter((e) => {
    const matchesDept = selectedDepartment === 'All' ||
      (e.department || '').toLowerCase().trim().includes(selectedDepartment.toLowerCase().trim()) ||
      selectedDepartment.toLowerCase().trim().includes((e.department || '').toLowerCase().trim())

    const matchesSearch =
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.department.toLowerCase().includes(searchQuery.toLowerCase())

    let matchesRole = true
    if (roleFilter === 'Admin') {
      matchesRole = e.role.toLowerCase().includes('admin')
    } else if (roleFilter === 'Sales Manager') {
      matchesRole = e.role.toLowerCase().includes('manager') || e.role.toLowerCase().includes('lead')
    } else if (roleFilter === 'Sales Executive') {
      matchesRole = e.role.toLowerCase().includes('executive')
    }

    return matchesDept && matchesSearch && matchesRole
  })

  const paginatedEmployees = React.useMemo(() => {
    const start = (employeePage - 1) * 10
    return filteredEmployees.slice(start, start + 10)
  }, [filteredEmployees, employeePage])

  const DEPT_CARD_PALETTES = [
    {
      active: 'bg-purple-200 text-purple-950 border-purple-300 shadow-2xs font-extrabold',
      inactive: 'bg-rose-50/80 border-rose-200 text-rose-950 hover:bg-rose-100/70 shadow-2xs',
      badgeActive: 'bg-white/20 text-white',
      badgeInactive: 'bg-rose-200/70 text-rose-900',
      presentActive: 'text-white font-black',
      presentInactive: 'text-rose-700 font-extrabold',
    },
    {
      active: 'bg-indigo-700 text-white border-indigo-700 shadow-md ring-2 ring-indigo-600/30',
      inactive: 'bg-indigo-50/80 border-indigo-200 text-indigo-950 hover:bg-indigo-100/70 shadow-2xs',
      badgeActive: 'bg-white/20 text-white',
      badgeInactive: 'bg-indigo-200/70 text-indigo-900',
      presentActive: 'text-white font-black',
      presentInactive: 'text-indigo-700 font-extrabold',
    },
    {
      active: 'bg-purple-700 text-white border-purple-700 shadow-md ring-2 ring-purple-600/30',
      inactive: 'bg-purple-50/80 border-purple-200 text-purple-950 hover:bg-purple-100/70 shadow-2xs',
      badgeActive: 'bg-white/20 text-white',
      badgeInactive: 'bg-purple-200/70 text-purple-900',
      presentActive: 'text-white font-black',
      presentInactive: 'text-purple-700 font-extrabold',
    },
    {
      active: 'bg-emerald-700 text-white border-emerald-700 shadow-md ring-2 ring-emerald-600/30',
      inactive: 'bg-emerald-50/80 border-emerald-200 text-emerald-950 hover:bg-emerald-100/70 shadow-2xs',
      badgeActive: 'bg-white/20 text-white',
      badgeInactive: 'bg-emerald-200/70 text-emerald-900',
      presentActive: 'text-white font-black',
      presentInactive: 'text-emerald-700 font-extrabold',
    },
    {
      active: 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-600/30',
      inactive: 'bg-amber-50/80 border-amber-200 text-amber-950 hover:bg-amber-100/70 shadow-2xs',
      badgeActive: 'bg-white/20 text-white',
      badgeInactive: 'bg-amber-200/70 text-amber-900',
      presentActive: 'text-white font-black',
      presentInactive: 'text-amber-700 font-extrabold',
    },
    {
      active: 'bg-sky-700 text-white border-sky-700 shadow-md ring-2 ring-sky-600/30',
      inactive: 'bg-sky-50/80 border-sky-200 text-sky-950 hover:bg-sky-100/70 shadow-2xs',
      badgeActive: 'bg-white/20 text-white',
      badgeInactive: 'bg-sky-200/70 text-sky-900',
      presentActive: 'text-white font-black',
      presentInactive: 'text-sky-700 font-extrabold',
    },
  ]

  // Daily Report Filtering
  const filteredDailyReports = React.useMemo(() => {
    return managementDailyReports.filter((r) => {
      let matchesDept = true
      if (dailyReportDeptFilter && dailyReportDeptFilter !== 'All') {
        const targetD = dailyReportDeptFilter.toLowerCase().trim()
        const reportD = (r.department || '').toLowerCase().trim()
        matchesDept = reportD.includes(targetD) || targetD.includes(reportD)
      }

      let matchesRole = true
      if (dailyReportRoleFilter && dailyReportRoleFilter !== 'All') {
        const targetR = dailyReportRoleFilter.toLowerCase().trim()
        const reportR = (r.role || '').toLowerCase().trim()
        matchesRole = reportR.includes(targetR)
      }

      let matchesDate = true
      if (dailyReportDateFilter) {
        const rDate = (r.date || r.report_date || '').split('T')[0]
        matchesDate = rDate === dailyReportDateFilter
      }

      let matchesStatus = true
      if (dailyReportStatusFilter === 'Pending Review') {
        matchesStatus = r.status === 'Pending Review'
      } else if (dailyReportStatusFilter === 'Reviewed') {
        matchesStatus = r.status === 'Reviewed'
      }

      return matchesDept && matchesRole && matchesDate && matchesStatus
    })
  }, [managementDailyReports, dailyReportDeptFilter, dailyReportRoleFilter, dailyReportDateFilter, dailyReportStatusFilter])

  const paginatedDailyReports = React.useMemo(() => {
    const start = (reportPage - 1) * 10
    return filteredDailyReports.slice(start, start + 10)
  }, [filteredDailyReports, reportPage])

  const handleSaveReportReview = (statusToSet = 'Reviewed') => {
    if (!selectedReportForReview) return

    const updatedList = managementDailyReports.map((r) => {
      if (r.id === selectedReportForReview.id) {
        return {
          ...r,
          status: statusToSet,
          ceo_remarks: reportCeoRemarksInput.trim() || r.ceo_remarks || 'Reviewed by CEO',
          reviewed_at: new Date().toISOString(),
        }
      }
      return r
    })

    setManagementDailyReports(updatedList)
    try {
      localStorage.setItem('tc_ceo_management_daily_reports', JSON.stringify(updatedList))
    } catch (e) {}

    showToast(`Daily report from ${selectedReportForReview.submitted_by} marked as ${statusToSet}`, 'success')
    setReportReviewModalOpen(false)
    setSelectedReportForReview(null)
    setReportCeoRemarksInput('')
  }

  const pendingLeaves = leaveRequests.filter((l) => l.status === 'Pending')
  const pendingPermissions = permissionRequests.filter((p) => p.status === 'Pending')
  const pendingReports = managementDailyReports.filter((r) => r.status === 'Pending Review')

  const getBadgeValue = (id) => {
    if (id === 'employees') return employees.length
    if (id === 'daily_reports') return pendingReports.length
    if (id === 'leaves') return pendingLeaves.length
    if (id === 'permissions') return pendingPermissions.length
    return null
  }

  const hasAlert = (id) => {
    if (id === 'daily_reports') return pendingReports.length > 0
    if (id === 'leaves') return pendingLeaves.length > 0
    if (id === 'permissions') return pendingPermissions.length > 0
    return false
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-12 overflow-x-clip">
      {/* Sticky Header & Primary HRMS Navigation Tabs */}
      <div className="sticky -top-3 sm:-top-5 z-40 bg-slate-50/95 backdrop-blur-md pb-2 pt-1 space-y-3 min-w-0">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-purple-100 text-purple-700">
                <Briefcase className="size-4.5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                HRMS Executive Directory & Attendance
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-500 font-medium max-w-3xl">
              Direct CEO management of organizational staff, leave approvals, field permission requests, and daily attendance logs.
            </p>
          </div>

          {/* Quick Pending Counter */}
          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-purple-100 border border-purple-200 px-3 py-1.5 text-xs font-bold text-purple-800">
              {pendingLeaves.length + pendingPermissions.length} Pending Clearances
            </span>
          </div>
        </div>

        {/* Primary HRMS Navigation Tabs */}
        <div className="flex items-center flex-nowrap whitespace-nowrap gap-1 overflow-x-auto bg-white p-1.5 rounded-xl border border-slate-200/80 shadow-2xs scrollbar-thin">
          {hrmsTabs.map((tabItem) => {
            const Icon = tabItem.icon
            const isActive = activeTab === tabItem.id
            const badgeVal = getBadgeValue ? getBadgeValue(tabItem.id) : (tabItem.id === 'employees' ? employees.length : tabItem.id === 'leaves' ? pendingLeaves.length : tabItem.id === 'permissions' ? pendingPermissions.length : null)
            const alertVal = hasAlert ? hasAlert(tabItem.id) : (tabItem.id === 'leaves' ? pendingLeaves.length > 0 : tabItem.id === 'permissions' ? pendingPermissions.length > 0 : false)
            return (
              <div
                key={tabItem.id}
                onClick={() => setActiveTab(tabItem.id)}
                className="flex items-center shrink-0 whitespace-nowrap transition cursor-pointer"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab(tabItem.id);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${isActive
                      ? 'bg-purple-200 text-purple-950 border border-purple-300 shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:bg-purple-50 hover:text-purple-700 font-bold'
                    }`}
                >
                  <Icon className="size-3.5" />
                  <span>{tabItem.label}</span>
                  {badgeVal !== null && badgeVal !== undefined && (
                    <span
                      className={`rounded-full px-2 py-0.2 text-[10px] font-black ${isActive
                          ? 'bg-white text-purple-800'
                          : alertVal
                            ? 'bg-purple-500 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                    >
                      {badgeVal}
                    </span>
                  )}
                </button>
              </div>
            )
          })}
          <button
            type="button"
            onClick={resetHrmsTabs}
            className="ml-auto px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 transition cursor-pointer shrink-0"
          >
            Reset Order
          </button>
        </div>
      </div>


      {/* ── TAB 1: EMPLOYEES DIRECTORY ────────────────────────── */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          {/* Department Overview Cards (Colorized) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {departmentCards.map((card, idx) => {
              const isSelected = selectedDepartment === card.id
              const colorTheme = DEPT_CARD_PALETTES[idx % DEPT_CARD_PALETTES.length]
              return (
                <div
                  key={card.id}
                  onClick={() => {
                    setSelectedDepartment(card.id)
                    setEmployeePage(1)
                  }}
                  className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                    isSelected ? colorTheme.active : colorTheme.inactive
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black tracking-wide ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                      {card.name}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      isSelected ? colorTheme.badgeActive : colorTheme.badgeInactive
                    }`}>
                      {card.total} Staff
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px]">
                    <span className={isSelected ? 'text-white/90 font-semibold' : 'text-slate-600 font-semibold'}>
                      Present: <strong className={isSelected ? colorTheme.presentActive : colorTheme.presentInactive}>{card.present}</strong>
                    </span>
                    <span className={isSelected ? 'text-white/80 text-[10px] font-bold' : 'text-slate-500 text-[10px] font-bold'}>
                      {isSelected ? '● Active Filter' : 'Click to filter'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Corporate Employee Directory
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedDepartment === 'All' ? 'All corporate personnel' : `Filtered by ${selectedDepartment} department`} & daily attendance logs
                </p>
              </div>

              {/* Filter Strip */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Role Filter Dropdown */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700">
                  <Filter className="size-3.5 text-[#832D51]" />
                  <span>Role:</span>
                  <select
                    value={roleFilter}
                    onChange={(e) => {
                      setRoleFilter(e.target.value)
                      setEmployeePage(1)
                    }}
                    className="bg-transparent font-extrabold text-slate-900 outline-none cursor-pointer text-xs"
                  >
                    <option value="All">All Roles</option>
                    <option value="Admin">Admin</option>
                    <option value="Sales Manager">Sales Manager</option>
                    <option value="Sales Executive">Sales Executive</option>
                  </select>
                </div>

                {/* Date Period Filter Dropdown */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700">
                  <Calendar className="size-3.5 text-[#832D51]" />
                  <span>Period:</span>
                  <select
                    value={datePeriodFilter}
                    onChange={(e) => {
                      setDatePeriodFilter(e.target.value)
                      setEmployeePage(1)
                    }}
                    className="bg-transparent font-extrabold text-slate-900 outline-none cursor-pointer text-xs"
                  >
                    <option value="Today">Today</option>
                    <option value="This Month">This Month</option>
                    <option value="Custom">Custom Date</option>
                  </select>
                </div>

                {/* Custom Date Inputs */}
                {datePeriodFilter === 'Custom' && (
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1 text-xs">
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => {
                        setCustomStart(e.target.value)
                        setEmployeePage(1)
                      }}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 outline-none"
                    />
                    <span className="text-slate-400 font-bold">to</span>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => {
                        setCustomEnd(e.target.value)
                        setEmployeePage(1)
                      }}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 outline-none"
                    />
                  </div>
                )}

                {/* Search Box */}
                <div className="relative w-full sm:w-60">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search staff, role, dept..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setEmployeePage(1)
                    }}
                    className="h-8.5 w-full rounded-xl border border-slate-200 pl-8 pr-3 text-xs font-semibold placeholder:text-slate-400 outline-none focus:border-[#832D51]"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-3 px-3">Date</th>
                    <th className="pb-3 px-3">Employee Name</th>
                    <th className="pb-3 px-3">Report Manager & Team Lead</th>
                    <th className="pb-3 px-3 text-center">Login Time</th>
                    <th className="pb-3 px-3 text-center">Logout Time</th>
                    <th className="pb-3 px-3 text-center">Status</th>
                    <th className="pb-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {paginatedEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                        No employees found for selected filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedEmployees.map((emp) => {
                      const superiors = resolveEmpSuperiors(emp)
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-3 font-bold text-slate-600">
                            {formatDDMMYYYY(emp.date)}
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-extrabold text-slate-900">{emp.name}</p>
                            <p className="text-[10px] text-slate-400">{emp.email}</p>
                            <span className="inline-flex rounded-md bg-[#F8CAE4]/20 px-1.5 py-0.5 text-[9px] font-black text-[#832D51] mt-0.5">
                              {emp.role}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="space-y-0.5 text-xs">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase w-14">Manager:</span>
                                <span className="font-extrabold text-slate-800">{superiors.manager}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase w-14">Team Lead:</span>
                                <span className="font-bold text-[#832D51]">{superiors.teamLead}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-extrabold text-xs">
                            {emp.loginTime && emp.loginTime !== '—' ? (
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                                {emp.loginTime}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-semibold italic">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-extrabold text-xs">
                            {emp.logoutTime && emp.logoutTime !== '—' ? (
                              <span className="text-blue-700 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200">
                                {emp.logoutTime}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-semibold italic">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black border ${
                              emp.status === 'Logged In' || emp.status === 'Present'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : emp.status === 'Logged Off'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {emp.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => setSelectedEmployee(emp)}
                              className="px-2.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold rounded-xl text-[10px] shadow-xs transition cursor-pointer"
                            >
                              View Profile
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Employee Directory Pagination Controls */}
            {filteredEmployees.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="text-xs text-slate-500 font-medium">
                  Showing <span className="font-black text-slate-900">{Math.min((employeePage - 1) * 10 + 1, filteredEmployees.length)}</span> to <span className="font-black text-slate-900">{Math.min(employeePage * 10, filteredEmployees.length)}</span> of <span className="font-black text-slate-900">{filteredEmployees.length}</span> employees
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setEmployeePage(prev => Math.max(1, prev - 1))}
                    disabled={employeePage === 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-black text-slate-700 px-2">Page {employeePage} of {Math.ceil(filteredEmployees.length / 10) || 1}</span>
                  <button
                    onClick={() => setEmployeePage(prev => Math.min(Math.ceil(filteredEmployees.length / 10), prev + 1))}
                    disabled={employeePage >= Math.ceil(filteredEmployees.length / 10)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: MANAGEMENT DAILY REPORTS (Admin & Sales Manager Daily Reports Managed by CEO) ── */}
      {activeTab === 'daily_reports' && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <FileText className="size-4.5 text-[#832D51]" />
                Admin & Sales Manager Daily Work Reports
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Executive CEO oversight: View, evaluate, and provide feedback on daily work reports submitted by Sales Managers and Admins.
              </p>
            </div>

            {/* Department, Role, Date & Status Filter Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Department Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700">
                <Building2 className="size-3.5 text-[#832D51]" />
                <span>Department:</span>
                <select
                  value={dailyReportDeptFilter}
                  onChange={(e) => {
                    setDailyReportDeptFilter(e.target.value)
                    setReportPage(1)
                  }}
                  className="bg-transparent font-extrabold text-slate-900 outline-none cursor-pointer text-xs"
                >
                  <option value="All">All Departments</option>
                  <option value="Sales & Business Development">Sales & BD</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="IT & Operations">IT & Operations</option>
                  <option value="Field Operations">Field Operations</option>
                </select>
              </div>

              {/* Roles Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700">
                <Filter className="size-3.5 text-[#832D51]" />
                <span>Role:</span>
                <select
                  value={dailyReportRoleFilter}
                  onChange={(e) => {
                    setDailyReportRoleFilter(e.target.value)
                    setReportPage(1)
                  }}
                  className="bg-transparent font-extrabold text-slate-900 outline-none cursor-pointer text-xs"
                >
                  <option value="All">All Roles</option>
                  <option value="Sales Manager">Sales Managers</option>
                  <option value="Admin">Admins</option>
                  <option value="Team Lead">Team Leads</option>
                  <option value="Sales Executive">Sales Executives</option>
                </select>
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700">
                <Calendar className="size-3.5 text-[#832D51]" />
                <span>Date:</span>
                <input
                  type="date"
                  value={dailyReportDateFilter}
                  onChange={(e) => {
                    setDailyReportDateFilter(e.target.value)
                    setReportPage(1)
                  }}
                  className="bg-transparent font-extrabold text-slate-900 outline-none cursor-pointer text-xs"
                />
                {dailyReportDateFilter && (
                  <button
                    onClick={() => setDailyReportDateFilter('')}
                    className="text-[10px] text-rose-600 hover:underline font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700">
                <span>Status:</span>
                <select
                  value={dailyReportStatusFilter}
                  onChange={(e) => {
                    setDailyReportStatusFilter(e.target.value)
                    setReportPage(1)
                  }}
                  className="bg-transparent font-extrabold text-slate-900 outline-none cursor-pointer text-xs"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending Review">Pending Review</option>
                  <option value="Reviewed">Reviewed</option>
                </select>
              </div>

              {/* Export CSV */}
              <button
                onClick={() => exportToCSV(filteredDailyReports, 'CEO_Management_Daily_Reports')}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                <Download className="size-3.5" /> CSV
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-3 px-4">Date</th>
                  <th className="pb-3 px-4">Department</th>
                  <th className="pb-3 px-4">Role</th>
                  <th className="pb-3 px-4">Name</th>
                  <th className="pb-3 px-4 text-center">Status</th>
                  <th className="pb-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedDailyReports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                      No daily work reports found for selected filters.
                    </td>
                  </tr>
                ) : (
                  paginatedDailyReports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-black text-slate-900 whitespace-nowrap">
                        {formatDDMMYYYY(report.date)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-slate-800">{report.department || 'Sales & BD'}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
                          report.role.toLowerCase().includes('manager')
                            ? 'bg-[#832D51]/10 text-[#832D51] border-[#832D51]/20'
                            : 'bg-purple-50 text-purple-800 border-purple-200'
                        }`}>
                          {report.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-extrabold text-slate-900 text-xs">{report.submitted_by}</p>
                          {report.email && <p className="text-[10px] text-slate-400">{report.email}</p>}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black border ${
                          report.status === 'Reviewed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedReportForReview(report)
                            setReportCeoRemarksInput(report.ceo_remarks || '')
                            setReportReviewModalOpen(true)
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-xs transition cursor-pointer"
                        >
                          <Eye className="size-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredDailyReports.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="text-xs text-slate-500 font-medium">
                Showing <span className="font-black text-slate-900">{Math.min((reportPage - 1) * 10 + 1, filteredDailyReports.length)}</span> to <span className="font-black text-slate-900">{Math.min(reportPage * 10, filteredDailyReports.length)}</span> of <span className="font-black text-slate-900">{filteredDailyReports.length}</span> reports
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setReportPage(prev => Math.max(1, prev - 1))}
                  disabled={reportPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <span className="text-xs font-black text-slate-700 px-2">Page {reportPage} of {Math.ceil(filteredDailyReports.length / 10) || 1}</span>
                <button
                  onClick={() => setReportPage(prev => Math.min(Math.ceil(filteredDailyReports.length / 10), prev + 1))}
                  disabled={reportPage >= Math.ceil(filteredDailyReports.length / 10)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
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
            <span className="rounded-full bg-[#3a7d63]/10 px-3 py-1 text-xs font-black text-[#3a7d63]">
              {pendingLeaves.length} Pending Actions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-3 px-2">Date</th>
                  <th className="pb-3 px-2">Applicant & Role</th>
                  <th className="pb-3 px-2">Leave Type</th>
                  <th className="pb-3 px-2">Duration & Dates</th>
                  <th className="pb-3 px-2">Reason</th>
                  <th className="pb-3 px-2">Status</th>
                  <th className="pb-3 px-2 text-right">CEO Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {leaveRequests.slice((leavePage - 1) * 10, leavePage * 10).map((leave) => (
                  <tr key={leave.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-2 font-bold text-slate-600">
                      {formatDDMMYYYY(leave.date || leave.submitted_at)}
                    </td>
                    <td className="py-3.5 px-2">
                      <p className="font-extrabold text-slate-900">{leave.employee_name}</p>
                      <p className="text-[10px] text-slate-400">{leave.role}</p>
                    </td>
                    <td className="py-3.5 px-2 font-bold text-slate-800">{leave.leave_type}</td>
                    <td className="py-3.5 px-2 text-slate-700">{leave.duration}</td>
                    <td className="py-3.5 px-2 text-slate-600 max-w-xs truncate">{leave.reason}</td>
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
                            className="rounded-lg bg-[#832D51] text-white px-3 py-1 text-xs font-bold hover:bg-[#6a2240]"
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

          {/* Leave Requests Pagination Bar (10 per page) */}
          {leaveRequests.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="text-xs text-slate-500 font-medium">
                Showing <span className="font-black text-slate-900">{Math.min((leavePage - 1) * 10 + 1, leaveRequests.length)}</span> to <span className="font-black text-slate-900">{Math.min(leavePage * 10, leaveRequests.length)}</span> of <span className="font-black text-slate-900">{leaveRequests.length}</span> records
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setLeavePage(prev => Math.max(1, prev - 1))}
                  disabled={leavePage === 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition shadow-2xs"
                >
                  <ChevronLeft className="size-3.5" /> Previous
                </button>
                <span className="text-xs font-black text-slate-800 px-2">
                  Page {leavePage} of {Math.ceil(leaveRequests.length / 10) || 1}
                </span>
                <button
                  onClick={() => setLeavePage(prev => Math.min(Math.ceil(leaveRequests.length / 10) || 1, prev + 1))}
                  disabled={leavePage >= Math.ceil(leaveRequests.length / 10)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition shadow-2xs"
                >
                  Next <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          )}
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
            <span className="rounded-full bg-[#3a7d63]/10 px-3 py-1 text-xs font-black text-[#3a7d63]">
              {pendingPermissions.length} Pending Actions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-3 px-2">Date</th>
                  <th className="pb-3 px-2">Staff Member</th>
                  <th className="pb-3 px-2">Permission Type</th>
                  <th className="pb-3 px-2">Time Window</th>
                  <th className="pb-3 px-2">Justification</th>
                  <th className="pb-3 px-2">Status</th>
                  <th className="pb-3 px-2 text-right">CEO Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {permissionRequests.slice((permPage - 1) * 10, permPage * 10).map((perm) => (
                  <tr key={perm.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-2 font-bold text-slate-600">
                      {formatDDMMYYYY(perm.date || perm.submitted_at)}
                    </td>
                    <td className="py-3.5 px-2">
                      <p className="font-extrabold text-slate-900">{perm.employee_name}</p>
                      <p className="text-[10px] text-slate-400">{perm.role}</p>
                    </td>
                    <td className="py-3.5 px-2 font-bold text-slate-800">{perm.type}</td>
                    <td className="py-3.5 px-2 text-slate-700">{perm.timing}</td>
                    <td className="py-3.5 px-2 text-slate-600 max-w-xs truncate">{perm.reason}</td>
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
                            className="rounded-lg bg-[#832D51] text-white px-3 py-1 text-xs font-bold hover:bg-[#6a2240]"
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

          {/* Permission Requests Pagination Bar (10 per page) */}
          {permissionRequests.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="text-xs text-slate-500 font-medium">
                Showing <span className="font-black text-slate-900">{Math.min((permPage - 1) * 10 + 1, permissionRequests.length)}</span> to <span className="font-black text-slate-900">{Math.min(permPage * 10, permissionRequests.length)}</span> of <span className="font-black text-slate-900">{permissionRequests.length}</span> records
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPermPage(prev => Math.max(1, prev - 1))}
                  disabled={permPage === 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition shadow-2xs"
                >
                  <ChevronLeft className="size-3.5" /> Previous
                </button>
                <span className="text-xs font-black text-slate-800 px-2">
                  Page {permPage} of {Math.ceil(permissionRequests.length / 10) || 1}
                </span>
                <button
                  onClick={() => setPermPage(prev => Math.min(Math.ceil(permissionRequests.length / 10) || 1, prev + 1))}
                  disabled={permPage >= Math.ceil(permissionRequests.length / 10)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition shadow-2xs"
                >
                  Next <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          )}
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  {attendanceFilter === 'Today' ? "Today's" : attendanceFilter === 'This Week' ? "This Week's" : "Custom Period"} Attendance Logs
                </h2>
                <p className="text-xs text-slate-500 font-medium font-semibold">Real-time check-in & check-out telemetry</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                {/* Linear Date Filter Toggles */}
                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                  {['Today', 'This Week', 'Custom'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setAttendanceFilter(mode)}
                      className={`px-3.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                        attendanceFilter === mode
                          ? 'bg-[#832D51] text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                {/* Custom Date Pickers */}
                {attendanceFilter === 'Custom' && (
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="rounded-xl border border-slate-200 p-1.5 text-slate-700 outline-none focus:border-[#832D51]"
                    />
                    <span className="text-slate-400">to</span>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="rounded-xl border border-slate-200 p-1.5 text-slate-700 outline-none focus:border-[#832D51]"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="pb-3">Employee</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Clock In (Logged In)</th>
                    <th className="pb-3">Clock Out (Logged Off)</th>
                    <th className="pb-3">Total Working Hours</th>
                    <th className="pb-3">Mode</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredDailyLogs.map((log) => {
                    const isLoggedOut = log.status === 'Logged off' || (log.clockOut && log.clockOut !== '—')
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 font-extrabold text-slate-900">{log.name}</td>
                        <td className="py-3 text-slate-600 font-semibold">{log.date}</td>
                        <td className="py-3 font-bold text-[#832D51]">{log.clockIn}</td>
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

      {/* ── TAB 4: HOLIDAY CALENDAR ───────────────────────────── */}
      {activeTab === 'calendar' && (
        <HolidayCalendar />
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
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 outline-none focus:border-[#832D51]"
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
                className={`rounded-xl px-5 py-2 text-xs font-bold text-white shadow-xs ${reviewAction === 'Approved' ? 'bg-[#832D51] hover:bg-[#6a2240]' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
              >
                Confirm {reviewAction}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* CEO Daily Report Review & Feedback Modal */}
      {reportReviewModalOpen && selectedReportForReview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 border border-slate-200 shadow-2xl relative text-left">
            <button
              onClick={() => setReportReviewModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer font-bold"
            >
              ✕
            </button>

            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#832D51]">Management Work Report Review</span>
              <h3 className="font-extrabold text-slate-900 text-base mt-0.5">
                {selectedReportForReview.submitted_by} ({selectedReportForReview.role})
              </h3>
              <p className="text-xs text-slate-500">
                Submitted for {formatDDMMYYYY(selectedReportForReview.date)} · {selectedReportForReview.department}
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="text-[10px] font-black uppercase text-slate-400">Tasks Accomplished</p>
                <p className="font-semibold text-slate-800 mt-1 whitespace-pre-wrap">{selectedReportForReview.tasks_accomplished}</p>
              </div>

              {selectedReportForReview.key_highlights && (
                <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200/80">
                  <p className="text-[10px] font-black uppercase text-emerald-700">Key Highlights & Wins</p>
                  <p className="font-bold text-emerald-900 mt-1">{selectedReportForReview.key_highlights}</p>
                </div>
              )}

              {selectedReportForReview.blockers && selectedReportForReview.blockers !== 'None' && (
                <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-200/80">
                  <p className="text-[10px] font-black uppercase text-rose-700">Blockers & CEO Escalation</p>
                  <p className="font-bold text-rose-900 mt-1">{selectedReportForReview.blockers}</p>
                </div>
              )}

              <div className="space-y-1.5 pt-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block">
                  CEO Feedback & Executive Remarks
                </label>
                <textarea
                  rows={3}
                  value={reportCeoRemarksInput}
                  onChange={(e) => setReportCeoRemarksInput(e.target.value)}
                  placeholder="Type executive feedback, instructions, or approval notes for this manager/admin..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-[#832D51]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                onClick={() => setReportReviewModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveReportReview('Reviewed')}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-sm transition cursor-pointer"
              >
                Mark Reviewed & Send Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Profile View Modal */}
      {selectedEmployee && (
        <EmployeeProfileModal
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </div>
  )
}

export default CeoHrms
