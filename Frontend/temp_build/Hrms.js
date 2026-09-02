import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "../../common/ToastContext.jsx";
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
  HeartPulse,
  Code2,
  CreditCard
} from "lucide-react";
import { hrmsAPI, attendanceAPI, userAPI } from "../../services/api.js";
import { exportToCSV } from "../../utils/exportUtils.js";
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
  const Section = ({ icon: Icon, title, color = "blue", children }) => /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 border-b border-slate-200 pb-2" }, /* @__PURE__ */ React.createElement(Icon, { size: 15, className: `text-${color}-600` }), /* @__PURE__ */ React.createElement("h4", { className: "font-extrabold text-slate-900 text-xs uppercase tracking-wider" }, title)), children);
  const InfoRow = ({ label, value }) => /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase tracking-wider" }, label), /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold text-slate-850" }, value || "\u2014"));
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5 border border-slate-200 shadow-2xl relative text-left" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onClose,
      className: "absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer"
    },
    "\u2715"
  ), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4 border-b border-slate-100 pb-4" }, /* @__PURE__ */ React.createElement("div", { className: "w-16 h-16 rounded-full overflow-hidden bg-slate-100 border-2 border-blue-500 shrink-0 flex items-center justify-center font-bold text-slate-700 text-xl" }, employee.profile_photo ? /* @__PURE__ */ React.createElement("img", { src: employee.profile_photo, alt: "Profile", className: "w-full h-full object-cover" }) : (employee.name || "E").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-extrabold text-slate-900 text-lg" }, employee.name), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500 font-semibold" }, employee.employee_code || employee.employee_id || "N/A", " \xB7 ", employee.department || employee.dept || "Sales", " \xB7 ", employee.designation || employee.role || "Sales Executive"))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement(Section, { icon: Briefcase, title: "Work Details", color: "blue" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3 text-xs" }, /* @__PURE__ */ React.createElement(InfoRow, { label: "Official Email", value: employee.email }), /* @__PURE__ */ React.createElement(InfoRow, { label: "Phone Number", value: employee.phone }), /* @__PURE__ */ React.createElement(InfoRow, { label: "Employment Type", value: employee.employment_type }), /* @__PURE__ */ React.createElement(InfoRow, { label: "Work Mode", value: employee.work_mode }), /* @__PURE__ */ React.createElement(InfoRow, { label: "Work Location", value: employee.work_location }), /* @__PURE__ */ React.createElement(InfoRow, { label: "Status", value: employee.status }))), /* @__PURE__ */ React.createElement(Section, { icon: HeartPulse, title: "Personal Details", color: "rose" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3 text-xs" }, /* @__PURE__ */ React.createElement(InfoRow, { label: "Date of Birth", value: employee.date_of_birth }), /* @__PURE__ */ React.createElement(InfoRow, { label: "Marital Status", value: employee.marital_status }), /* @__PURE__ */ React.createElement(InfoRow, { label: "Blood Group", value: employee.blood_group }), /* @__PURE__ */ React.createElement(InfoRow, { label: "PAN ID", value: employee.pan_id }), /* @__PURE__ */ React.createElement(InfoRow, { label: "Personal Email", value: employee.personal_email }), /* @__PURE__ */ React.createElement(InfoRow, { label: "Alternate Contact", value: employee.alternate_contact }), /* @__PURE__ */ React.createElement(InfoRow, { label: "City", value: employee.city }), /* @__PURE__ */ React.createElement(InfoRow, { label: "State", value: employee.state }), /* @__PURE__ */ React.createElement(InfoRow, { label: "Country", value: employee.country }), /* @__PURE__ */ React.createElement(InfoRow, { label: "Postal Code", value: employee.postal_code })), /* @__PURE__ */ React.createElement("div", { className: "mt-2 text-xs space-y-2 border-t border-slate-100 pt-2" }, /* @__PURE__ */ React.createElement(InfoRow, { label: "Current Address", value: employee.current_address }), /* @__PURE__ */ React.createElement(InfoRow, { label: "Permanent Address", value: employee.permanent_address }))), /* @__PURE__ */ React.createElement(Section, { icon: Code2, title: "Skills & Tech", color: "indigo" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-2 text-xs" }, /* @__PURE__ */ React.createElement(InfoRow, { label: "Primary Skills", value: employee.primary_skills }), /* @__PURE__ */ React.createElement(InfoRow, { label: "Secondary Skills", value: employee.secondary_skills }), /* @__PURE__ */ React.createElement(InfoRow, { label: "Tools & Tech", value: employee.tools }))), /* @__PURE__ */ React.createElement(Section, { icon: AlertCircle, title: "Emergency Contact", color: "rose" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3 text-xs" }, /* @__PURE__ */ React.createElement(InfoRow, { label: "Contact Name", value: employee.emergency_name }), /* @__PURE__ */ React.createElement(InfoRow, { label: "Relationship", value: employee.emergency_relationship }), /* @__PURE__ */ React.createElement(InfoRow, { label: "Contact Number", value: employee.emergency_contact }))), /* @__PURE__ */ React.createElement(Section, { icon: CreditCard, title: "Bank Details", color: "emerald" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3 text-xs" }, /* @__PURE__ */ React.createElement(InfoRow, { label: "Account Holder", value: employee.account_holder }), /* @__PURE__ */ React.createElement(InfoRow, { label: "Bank Name", value: employee.bank_name }), /* @__PURE__ */ React.createElement(InfoRow, { label: "Account Number", value: employee.account_number }), /* @__PURE__ */ React.createElement(InfoRow, { label: "IFSC Code", value: employee.ifsc }), /* @__PURE__ */ React.createElement(InfoRow, { label: "Branch", value: employee.branch }))), /* @__PURE__ */ React.createElement(Section, { icon: FileText, title: "Employee Documents", color: "teal" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5 text-xs" }, parsedDocs.length === 0 ? /* @__PURE__ */ React.createElement("p", { className: "text-slate-400 text-xs italic" }, "No documents uploaded yet.") : parsedDocs.map((doc, idx) => {
    const docUrl = doc.fileUrl || doc.url || doc.file_url || doc.file || doc.preview || doc.data || null;
    return /* @__PURE__ */ React.createElement("div", { key: doc.id || idx, className: "flex items-center justify-between border-b border-slate-100 pb-1.5 last:border-b-0" }, /* @__PURE__ */ React.createElement("div", { className: "min-w-0 pr-2" }, /* @__PURE__ */ React.createElement("p", { className: "font-bold text-slate-800 truncate" }, doc.name), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-emerald-600 font-medium truncate" }, "\u2705 ", doc.fileName || "Uploaded")), docUrl && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setPreviewDoc({ ...doc, fileUrl: docUrl }),
        className: "px-2.5 py-1 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 font-extrabold text-[11px] rounded-lg transition cursor-pointer flex-shrink-0 shadow-2xs"
      },
      "View File"
    ));
  })))), previewDoc && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-150" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "min-w-0 pr-4" }, /* @__PURE__ */ React.createElement("h3", { className: "font-black text-slate-900 text-sm truncate" }, previewDoc.name), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-400 font-semibold truncate" }, previewDoc.fileName || "Document File")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 flex-shrink-0" }, previewDoc.fileUrl && /* @__PURE__ */ React.createElement(
    "a",
    {
      href: previewDoc.fileUrl,
      download: previewDoc.fileName || `${previewDoc.name}.png`,
      className: "p-2 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition cursor-pointer",
      title: "Download File"
    },
    /* @__PURE__ */ React.createElement(Download, { size: 18 })
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setPreviewDoc(null),
      className: "p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
    },
    /* @__PURE__ */ React.createElement(X, { size: 18 })
  ))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-auto flex items-center justify-center bg-slate-50 rounded-2xl p-3 min-h-[320px] border border-slate-100" }, previewDoc.fileUrl?.startsWith("data:image") || previewDoc.fileUrl?.match(/\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i) || previewDoc.fileName?.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) ? /* @__PURE__ */ React.createElement(
    "img",
    {
      src: previewDoc.fileUrl,
      alt: previewDoc.name,
      className: "max-w-full max-h-[62vh] object-contain rounded-xl shadow-xs border border-slate-200"
    }
  ) : previewDoc.fileUrl?.startsWith("data:application/pdf") || previewDoc.fileUrl?.match(/\.pdf($|\?)/i) || previewDoc.fileName?.match(/\.pdf$/i) ? /* @__PURE__ */ React.createElement(
    "iframe",
    {
      src: previewDoc.fileUrl,
      title: previewDoc.name,
      className: "w-full h-[62vh] rounded-xl border border-slate-200"
    }
  ) : /* @__PURE__ */ React.createElement("div", { className: "text-center py-12 space-y-3" }, /* @__PURE__ */ React.createElement(FileText, { size: 48, className: "mx-auto text-slate-400" }), /* @__PURE__ */ React.createElement("p", { className: "text-xs font-bold text-slate-600" }, "Preview not supported for this file format."), previewDoc.fileUrl && /* @__PURE__ */ React.createElement(
    "a",
    {
      href: previewDoc.fileUrl,
      download: previewDoc.fileName || "document",
      className: "inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition"
    },
    /* @__PURE__ */ React.createElement(Download, { size: 14 }),
    " Download File"
  )))))));
};
function CeoHrms({ initialTab = "employees" }) {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || initialTab;
  const setActiveTab = (val) => setSearchParams({ tab: val });
  const [attendanceFilter, setAttendanceFilter] = useState("Today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();
  const userEmail = (user.email || "").toLowerCase().trim();
  const DEFAULT_CEO_TABS = [
    { id: "employees", label: "Employees Directory", icon: Users },
    { id: "leaves", label: "Leave Requests", icon: Calendar },
    { id: "permissions", label: "Permission Requests", icon: Clock },
    { id: "attendance", label: "Attendance Summary", icon: UserCheck },
    { id: "approval_history", label: "Clearance History", icon: History }
  ];
  const [hrmsTabs, setHrmsTabs] = useState(() => {
    const saved = localStorage.getItem(`tc_hrms_order_ceo_${userEmail}`);
    if (saved) {
      try {
        const keys = JSON.parse(saved);
        const ordered = [];
        keys.forEach((k) => {
          const match = DEFAULT_CEO_TABS.find((n) => n.id === k);
          if (match) ordered.push(match);
        });
        DEFAULT_CEO_TABS.forEach((n) => {
          if (!ordered.some((o) => o.id === n.id)) {
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
        keys.forEach((k) => {
          const match = DEFAULT_CEO_TABS.find((n) => n.id === k);
          if (match) ordered.push(match);
        });
        DEFAULT_CEO_TABS.forEach((n) => {
          if (!ordered.some((o) => o.id === n.id)) {
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
    const keys = reordered.map((item) => item.id);
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
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [roleFilter, setRoleFilter] = useState("All");
  const [datePeriodFilter, setDatePeriodFilter] = useState("Today");
  const [rawAttendanceLogs, setRawAttendanceLogs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [permissionRequests, setPermissionRequests] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState({
    totalEmployees: 0,
    presentToday: 0,
    lateArrivals: 0,
    onLeave: 0,
    absent: 0,
    dailyLogs: []
  });
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [reviewAction, setReviewAction] = useState("Approved");
  const formatTimeOnly = (raw) => {
    if (!raw || raw === "\u2014" || raw === "--") return "\u2014";
    try {
      const s = String(raw).trim();
      if (s.match(/^\d{1,2}:\d{2}\s*(AM|PM)$/i)) return s;
      if (s.includes("T") || s.includes("-")) {
        const d = new Date(s);
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
        }
      }
      const match = s.match(/(\d{1,2}):(\d{2})/);
      if (match) {
        let h = parseInt(match[1], 10);
        const m = match[2];
        const ampm = h >= 12 ? "PM" : "AM";
        h = h % 12 || 12;
        return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
      }
      return s;
    } catch {
      return raw;
    }
  };
  const formatDDMMYYYY = (raw) => {
    if (!raw || raw === "\u2014" || raw === "--") return "\u2014";
    try {
      const s = String(raw).split("T")[0].split(" ")[0];
      const parts = s.split("-");
      if (parts.length === 3 && parts[0].length === 4) {
        const [y, m, d] = parts;
        return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
      }
      const dObj = new Date(raw);
      if (!isNaN(dObj.getTime())) {
        const day = String(dObj.getDate()).padStart(2, "0");
        const month = String(dObj.getMonth() + 1).padStart(2, "0");
        const year = dObj.getFullYear();
        return `${day}/${month}/${year}`;
      }
      return raw;
    } catch {
      return raw;
    }
  };
  useEffect(() => {
    async function fetchHrmsData() {
      setLoading(true);
      try {
        const [empRes, leaveRes, attRes] = await Promise.all([
          hrmsAPI.getEmployees().catch(() => null),
          attendanceAPI.getLeaveRequests().catch(() => null),
          attendanceAPI.getLogs().catch(() => null)
        ]);
        const rawLogs = attRes && attRes.data && Array.isArray(attRes.data) ? attRes.data : [];
        setRawAttendanceLogs(rawLogs);
        const todayStr2 = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
        const todayLogs = rawLogs.filter((l) => {
          const lDate = l.date || (l.check_in_time ? String(l.check_in_time).slice(0, 10) : "") || (l.created_at ? String(l.created_at).slice(0, 10) : "");
          return lDate === todayStr2 || l.is_today === true;
        });
        if (empRes && empRes.data && empRes.data.length > 0) {
          setEmployees(
            empRes.data.map((e, idx) => {
              const empCode = e.employee_code || e.employee_id || e.id || "";
              const empEmail = (e.email || "").toLowerCase().trim();
              const empName = (e.name || e.full_name || "").toLowerCase().trim();
              const empLog = todayLogs.find(
                (l) => l.employee_id && (l.employee_id === e.id || l.employee_id === empCode) || l.user_id && (l.user_id === e.id || l.user_id === empCode) || l.employee_code && l.employee_code === empCode || l.email && l.email.toLowerCase().trim() === empEmail || l.employee_name && l.employee_name.toLowerCase().trim() === empName || l.name && l.name.toLowerCase().trim() === empName
              );
              const hasCheckedIn = Boolean(empLog && (empLog.check_in_time || empLog.clockIn || empLog.login_time));
              const checkinTime = hasCheckedIn ? formatTimeOnly(empLog.check_in_time || empLog.clockIn || empLog.login_time) : "\u2014";
              const isAbsent = !hasCheckedIn;
              return {
                ...e,
                id: e.id || `EMP-${100 + idx}`,
                name: e.name || e.full_name || "Staff Member",
                email: e.email || "employee@tconnect.com",
                role: e.role || (idx === 0 ? "Admin" : idx < 3 ? "Sales Manager" : "Sales Executive"),
                department: e.department || "Sales",
                status: isAbsent ? "Absent" : "Present",
                checkin: checkinTime,
                hasCheckedIn
              };
            })
          );
        }
        if (leaveRes && leaveRes.data && leaveRes.data.length > 0) {
          const rawList = leaveRes.data.map((l, idx) => ({
            id: l.id || l.leave_id || `LV-${500 + idx}`,
            date: (l.from_date || l.start_date || l.date || l.created_at || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)).split("T")[0],
            employee_name: l.employee_name || l.name || l.executive_name || "Team Member",
            role: l.role || "Sales Executive",
            leave_type: l.leave_type || "Leave",
            duration: l.duration || "1 Day",
            reason: l.reason || "Personal necessity",
            status: l.status || "Pending",
            submitted_at: l.created_at || "Recent",
            reviewed_by: l.reviewed_by,
            type: l.leave_type || "Permission",
            timing: l.time_slot || "2 Hours",
            reporting_manager: l.reporting_manager,
            reporting_manager_name: l.reporting_manager_name,
            reporting_manager_email: l.reporting_manager_email
          }));
          const ceoExecutiveRequests = rawList.filter((r) => {
            const roleLower = (r.role || "").toLowerCase();
            return roleLower.includes("manager") || roleLower.includes("admin");
          });
          const leavesOnly = ceoExecutiveRequests.filter(
            (r) => !(r.leave_type || "").toLowerCase().includes("permission") && !(r.leave_type || "").toLowerCase().includes("early exit")
          );
          const permissionsOnly = ceoExecutiveRequests.filter(
            (r) => (r.leave_type || "").toLowerCase().includes("permission") || (r.leave_type || "").toLowerCase().includes("early exit")
          );
          setLeaveRequests(leavesOnly);
          setPermissionRequests(permissionsOnly);
        }
        if (rawLogs.length > 0) {
          const loggedInCount = rawLogs.filter((l) => l.status === "Logged in" || !l.clockOut || l.clockOut === "\u2014").length;
          const loggedOffCount = rawLogs.filter((l) => l.status === "Logged off" || l.clockOut && l.clockOut !== "\u2014").length;
          setAttendanceSummary((prev) => ({
            ...prev,
            presentToday: todayLogs.length,
            dailyLogs: rawLogs.map((l, idx) => ({
              id: l.id || `ATT-${idx + 1}`,
              name: l.name || l.employee_name || "Staff Member",
              date: l.date || "\u2014",
              clockIn: formatTimeOnly(l.clockIn || l.check_in_time),
              clockOut: formatTimeOnly(l.clockOut || l.check_out_time),
              workHours: l.workHours || l.total_working_hours || (l.clockOut && l.clockOut !== "\u2014" ? "8.5 hrs" : "In Progress"),
              mode: l.mode || "Biometric",
              status: l.status || (l.clockOut && l.clockOut !== "\u2014" ? "Logged off" : "Logged in")
            }))
          }));
        }
      } catch (err) {
        console.warn("HRMS loaded standard dataset:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchHrmsData();
  }, []);
  const handleOpenReview = (req, defaultAction = "Approved") => {
    setSelectedRequest(req);
    setReviewAction(defaultAction);
    setReviewRemarks("");
    setReviewModalOpen(true);
  };
  const handleConfirmDecision = async () => {
    if (!selectedRequest) return;
    const isLeave = selectedRequest.leave_type !== void 0;
    try {
      if (isLeave) {
        await attendanceAPI.updateLeaveStatus(selectedRequest.id, reviewAction, reviewRemarks);
        setLeaveRequests(
          (prev) => prev.map(
            (l) => l.id === selectedRequest.id ? { ...l, status: reviewAction, reviewed_by: "Chief Executive Officer", remarks: reviewRemarks } : l
          )
        );
      } else {
        await attendanceAPI.updateLeaveStatus(selectedRequest.id, reviewAction, reviewRemarks);
        setPermissionRequests(
          (prev) => prev.map(
            (p) => p.id === selectedRequest.id ? { ...p, status: reviewAction, reviewed_by: "Chief Executive Officer", remarks: reviewRemarks } : p
          )
        );
      }
      showToast(
        `${isLeave ? "Leave Request" : "Permission Request"} for ${selectedRequest.employee_name} has been ${reviewAction}`,
        reviewAction === "Approved" ? "success" : "info"
      );
      setReviewModalOpen(false);
    } catch (err) {
      showToast(`Failed to update leave status: ${err?.message || "Server Error"}`, "error");
    }
  };
  const getWeekRange = () => {
    const now = /* @__PURE__ */ new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { start: monday, end: sunday };
  };
  const filteredDailyLogs = React.useMemo(() => {
    const todayStr2 = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    return attendanceSummary.dailyLogs.filter((log) => {
      if (!log.date || log.date === "\u2014") return true;
      const logDateStr = log.date.split("T")[0].split(" ")[0];
      if (attendanceFilter === "Today") {
        return logDateStr === todayStr2;
      }
      if (attendanceFilter === "This Week") {
        const { start, end } = getWeekRange();
        const lDate = new Date(logDateStr);
        return lDate >= start && lDate <= end;
      }
      if (attendanceFilter === "Custom") {
        const lDate = new Date(logDateStr);
        if (customStart) {
          const sDate = new Date(customStart);
          sDate.setHours(0, 0, 0, 0);
          if (lDate < sDate) return false;
        }
        if (customEnd) {
          const eDate = new Date(customEnd);
          eDate.setHours(23, 59, 59, 999);
          if (lDate > eDate) return false;
        }
      }
      return true;
    });
  }, [attendanceSummary.dailyLogs, attendanceFilter, customStart, customEnd]);
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const processedEmployeeRows = employees.map((emp) => {
    const empCode = emp.employee_code || emp.employee_id || emp.id || "";
    const empEmail = (emp.email || "").toLowerCase().trim();
    const empName = (emp.name || emp.full_name || "").toLowerCase().trim();
    const empLog = rawAttendanceLogs.find((l) => {
      const matchEmp = l.employee_id && (l.employee_id === emp.id || l.employee_id === empCode) || l.user_id && (l.user_id === emp.id || l.user_id === empCode) || l.employee_code && l.employee_code === empCode || l.email && l.email.toLowerCase().trim() === empEmail || l.employee_name && l.employee_name.toLowerCase().trim() === empName || l.name && l.name.toLowerCase().trim() === empName;
      if (!matchEmp) return false;
      const lDate = l.date || (l.check_in_time ? String(l.check_in_time).slice(0, 10) : "") || (l.created_at ? String(l.created_at).slice(0, 10) : "");
      if (datePeriodFilter === "Today") return lDate === todayStr || l.is_today === true;
      if (datePeriodFilter === "This Month") return lDate.startsWith(todayStr.slice(0, 7));
      if (datePeriodFilter === "Custom") {
        if (customStart && lDate < customStart) return false;
        if (customEnd && lDate > customEnd) return false;
        return true;
      }
      return true;
    });
    const loginTime = empLog ? formatTimeOnly(empLog.check_in_time || empLog.clockIn || empLog.login_time) : emp.checkin || "\u2014";
    const logoutTime = empLog ? formatTimeOnly(empLog.check_out_time || empLog.clockOut || empLog.logout_time) : "\u2014";
    const logDate = empLog?.date ? String(empLog.date).slice(0, 10) : todayStr;
    let status = emp.status || "Absent";
    if (empLog) {
      if (logoutTime !== "\u2014") status = "Logged Off";
      else if (loginTime !== "\u2014") status = "Logged In";
      else status = "Present";
    }
    return {
      ...emp,
      date: logDate,
      loginTime,
      logoutTime,
      status
    };
  });
  const filteredEmployees = processedEmployeeRows.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase()) || e.role.toLowerCase().includes(searchQuery.toLowerCase()) || e.department.toLowerCase().includes(searchQuery.toLowerCase());
    let matchesRole = true;
    if (roleFilter === "Admin") {
      matchesRole = e.role.toLowerCase().includes("admin");
    } else if (roleFilter === "Sales Manager") {
      matchesRole = e.role.toLowerCase().includes("manager") || e.role.toLowerCase().includes("lead");
    } else if (roleFilter === "Sales Executive") {
      matchesRole = e.role.toLowerCase().includes("executive");
    }
    return matchesSearch && matchesRole;
  });
  const pendingLeaves = leaveRequests.filter((l) => l.status === "Pending");
  const pendingPermissions = permissionRequests.filter((p) => p.status === "Pending");
  const getBadgeValue = (id) => {
    if (id === "employees") return employees.length;
    if (id === "leaves") return pendingLeaves.length;
    if (id === "permissions") return pendingPermissions.length;
    return null;
  };
  const hasAlert = (id) => {
    if (id === "leaves") return pendingLeaves.length > 0;
    if (id === "permissions") return pendingPermissions.length > 0;
    return false;
  };
  return /* @__PURE__ */ React.createElement("div", { className: "mx-auto max-w-[1600px] space-y-6 pb-12" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "grid size-8 place-items-center rounded-lg bg-[#F8CAE4]/30 text-[#832D51]" }, /* @__PURE__ */ React.createElement(Briefcase, { className: "size-4.5" })), /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-black text-slate-900 tracking-tight" }, "Executive HRMS & Clearances")), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-xs text-slate-500 font-medium max-w-3xl" }, "Direct CEO management of organizational staff, leave approvals, field permission requests, and daily attendance logs.")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "rounded-xl bg-[#F8CAE4]/20 border border-[#EA6993]/20 px-3 py-1.5 text-xs font-bold text-[#832D51]" }, pendingLeaves.length + pendingPermissions.length, " Pending Clearances"))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center flex-nowrap whitespace-nowrap gap-1 overflow-x-auto bg-white p-1.5 rounded-xl border border-slate-200/80 shadow-2xs scrollbar-thin" }, hrmsTabs.map((tabItem, index) => {
    const Icon = tabItem.icon;
    const isActive = activeTab === tabItem.id;
    const badgeVal = getBadgeValue ? getBadgeValue(tabItem.id) : tabItem.id === "employees" ? employees.length : tabItem.id === "leaves" ? pendingLeaves.length : tabItem.id === "permissions" ? pendingPermissions.length : null;
    const alertVal = hasAlert ? hasAlert(tabItem.id) : tabItem.id === "leaves" ? pendingLeaves.length > 0 : tabItem.id === "permissions" ? pendingPermissions.length > 0 : false;
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        key: tabItem.id,
        draggable: "true",
        onDragStart: (e) => handleTabDragStart(e, index),
        onDragOver: (e) => handleTabDragOver(e, index),
        onDrop: (e) => handleTabDrop(e, index),
        onDragEnd: handleTabDragEnd,
        className: `flex items-center shrink-0 whitespace-nowrap transition cursor-pointer ${draggedTabKey === index ? "opacity-40" : ""}`
      },
      /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setActiveTab(tabItem.id),
          className: `flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${isActive ? "bg-[#832D51] text-white shadow-2xs" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`
        },
        /* @__PURE__ */ React.createElement(Icon, { className: "size-3.5" }),
        /* @__PURE__ */ React.createElement("span", null, tabItem.label),
        badgeVal !== null && badgeVal !== void 0 && /* @__PURE__ */ React.createElement(
          "span",
          {
            className: `rounded-full px-2 py-0.2 text-[10px] font-black ${isActive ? "bg-white text-[#832D51]" : alertVal ? "bg-[#EA6993] text-white" : "bg-slate-200 text-slate-700"}`
          },
          badgeVal
        )
      )
    );
  }), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: resetHrmsTabs,
      className: "ml-auto px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 transition cursor-pointer shrink-0"
    },
    "Reset Order"
  )), activeTab === "employees" && /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-slate-100 pb-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-base font-extrabold text-slate-900 tracking-tight" }, "Corporate Employee Directory"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500 font-medium" }, "All registered corporate personnel & daily attendance logs")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2.5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700" }, /* @__PURE__ */ React.createElement(Filter, { className: "size-3.5 text-[#832D51]" }), /* @__PURE__ */ React.createElement("span", null, "Role:"), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: roleFilter,
      onChange: (e) => setRoleFilter(e.target.value),
      className: "bg-transparent font-extrabold text-slate-900 outline-none cursor-pointer text-xs"
    },
    /* @__PURE__ */ React.createElement("option", { value: "All" }, "All Roles"),
    /* @__PURE__ */ React.createElement("option", { value: "Admin" }, "Admin"),
    /* @__PURE__ */ React.createElement("option", { value: "Sales Manager" }, "Sales Manager"),
    /* @__PURE__ */ React.createElement("option", { value: "Sales Executive" }, "Sales Executive")
  )), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700" }, /* @__PURE__ */ React.createElement(Calendar, { className: "size-3.5 text-[#832D51]" }), /* @__PURE__ */ React.createElement("span", null, "Period:"), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: datePeriodFilter,
      onChange: (e) => setDatePeriodFilter(e.target.value),
      className: "bg-transparent font-extrabold text-slate-900 outline-none cursor-pointer text-xs"
    },
    /* @__PURE__ */ React.createElement("option", { value: "Today" }, "Today"),
    /* @__PURE__ */ React.createElement("option", { value: "This Month" }, "This Month"),
    /* @__PURE__ */ React.createElement("option", { value: "Custom" }, "Custom Date")
  )), datePeriodFilter === "Custom" && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1 text-xs" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "date",
      value: customStart,
      onChange: (e) => setCustomStart(e.target.value),
      className: "bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 outline-none"
    }
  ), /* @__PURE__ */ React.createElement("span", { className: "text-slate-400 font-bold" }, "to"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "date",
      value: customEnd,
      onChange: (e) => setCustomEnd(e.target.value),
      className: "bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 outline-none"
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "relative w-full sm:w-60" }, /* @__PURE__ */ React.createElement(Search, { className: "pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" }), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      placeholder: "Search staff, role, dept...",
      value: searchQuery,
      onChange: (e) => setSearchQuery(e.target.value),
      className: "h-8.5 w-full rounded-xl border border-slate-200 pl-8 pr-3 text-xs font-semibold placeholder:text-slate-400 outline-none focus:border-[#832D51]"
    }
  )))), /* @__PURE__ */ React.createElement("div", { className: "overflow-x-auto" }, /* @__PURE__ */ React.createElement("table", { className: "w-full text-left text-xs border-collapse" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]" }, /* @__PURE__ */ React.createElement("th", { className: "pb-3 px-2" }, "Date"), /* @__PURE__ */ React.createElement("th", { className: "pb-3 px-2" }, "Employee"), /* @__PURE__ */ React.createElement("th", { className: "pb-3 px-2" }, "Designation"), /* @__PURE__ */ React.createElement("th", { className: "pb-3 px-2" }, "Department"), /* @__PURE__ */ React.createElement("th", { className: "pb-3 px-2 text-center" }, "Login Time"), /* @__PURE__ */ React.createElement("th", { className: "pb-3 px-2 text-center" }, "Logout Time"), /* @__PURE__ */ React.createElement("th", { className: "pb-3 px-2 text-center" }, "Status"), /* @__PURE__ */ React.createElement("th", { className: "pb-3 px-2 text-right" }, "Actions"))), /* @__PURE__ */ React.createElement("tbody", { className: "divide-y divide-slate-100 font-medium" }, filteredEmployees.map((emp) => /* @__PURE__ */ React.createElement("tr", { key: emp.id, className: "hover:bg-slate-50/70 transition" }, /* @__PURE__ */ React.createElement("td", { className: "py-3 px-2 font-bold text-slate-600" }, formatDDMMYYYY(emp.date)), /* @__PURE__ */ React.createElement("td", { className: "py-3 px-2" }, /* @__PURE__ */ React.createElement("p", { className: "font-extrabold text-slate-900" }, emp.name), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-400" }, emp.email)), /* @__PURE__ */ React.createElement("td", { className: "py-3 px-2" }, /* @__PURE__ */ React.createElement("span", { className: "inline-flex rounded-md bg-[#F8CAE4]/20 px-2 py-0.5 text-[10px] font-black text-[#832D51]" }, emp.role)), /* @__PURE__ */ React.createElement("td", { className: "py-3 px-2 text-slate-700" }, emp.department), /* @__PURE__ */ React.createElement("td", { className: "py-3 px-2 text-center font-extrabold text-xs" }, emp.loginTime && emp.loginTime !== "\u2014" ? /* @__PURE__ */ React.createElement("span", { className: "text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200" }, emp.loginTime) : /* @__PURE__ */ React.createElement("span", { className: "text-slate-400 font-semibold italic" }, "\u2014")), /* @__PURE__ */ React.createElement("td", { className: "py-3 px-2 text-center font-extrabold text-xs" }, emp.logoutTime && emp.logoutTime !== "\u2014" ? /* @__PURE__ */ React.createElement("span", { className: "text-blue-700 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200" }, emp.logoutTime) : /* @__PURE__ */ React.createElement("span", { className: "text-slate-400 font-semibold italic" }, "\u2014")), /* @__PURE__ */ React.createElement("td", { className: "py-3 px-2 text-center" }, /* @__PURE__ */ React.createElement("span", { className: `inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black border ${emp.status === "Logged In" || emp.status === "Present" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : emp.status === "Logged Off" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-rose-50 text-rose-700 border-rose-200"}` }, emp.status)), /* @__PURE__ */ React.createElement("td", { className: "py-3 px-2 text-right" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setSelectedEmployee(emp),
      className: "px-2.5 py-1.5 bg-[#832D51] hover:bg-[#68243f] text-white font-extrabold rounded-xl text-[10px] shadow-xs transition cursor-pointer"
    },
    "View Profile"
  )))))))), activeTab === "leaves" && /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between border-b border-slate-100 pb-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-base font-extrabold text-slate-900 tracking-tight" }, "Leave Requests & Approval Queue"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500 font-medium" }, "Review and approve/reject staff leave applications")), /* @__PURE__ */ React.createElement("span", { className: "rounded-full bg-[#3a7d63]/10 px-3 py-1 text-xs font-black text-[#3a7d63]" }, pendingLeaves.length, " Pending Actions")), /* @__PURE__ */ React.createElement("div", { className: "overflow-x-auto" }, /* @__PURE__ */ React.createElement("table", { className: "w-full text-left text-xs" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]" }, /* @__PURE__ */ React.createElement("th", { className: "pb-3 px-2" }, "Date"), /* @__PURE__ */ React.createElement("th", { className: "pb-3 px-2" }, "Applicant & Role"), /* @__PURE__ */ React.createElement("th", { className: "pb-3 px-2" }, "Leave Type"), /* @__PURE__ */ React.createElement("th", { className: "pb-3 px-2" }, "Duration & Dates"), /* @__PURE__ */ React.createElement("th", { className: "pb-3 px-2" }, "Reason"), /* @__PURE__ */ React.createElement("th", { className: "pb-3 px-2" }, "Status"), /* @__PURE__ */ React.createElement("th", { className: "pb-3 px-2 text-right" }, "CEO Review"))), /* @__PURE__ */ React.createElement("tbody", { className: "divide-y divide-slate-100 font-medium" }, leaveRequests.map((leave) => /* @__PURE__ */ React.createElement("tr", { key: leave.id, className: "hover:bg-slate-50/70 transition" }, /* @__PURE__ */ React.createElement("td", { className: "py-3.5 px-2 font-bold text-slate-600" }, formatDDMMYYYY(leave.date || leave.submitted_at)), /* @__PURE__ */ React.createElement("td", { className: "py-3.5 px-2" }, /* @__PURE__ */ React.createElement("p", { className: "font-extrabold text-slate-900" }, leave.employee_name), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-400" }, leave.role)), /* @__PURE__ */ React.createElement("td", { className: "py-3.5 px-2 font-bold text-slate-800" }, leave.leave_type), /* @__PURE__ */ React.createElement("td", { className: "py-3.5 px-2 text-slate-700" }, leave.duration), /* @__PURE__ */ React.createElement("td", { className: "py-3.5 px-2 text-slate-600 max-w-xs truncate" }, leave.reason), /* @__PURE__ */ React.createElement("td", { className: "py-3.5" }, /* @__PURE__ */ React.createElement(
    "span",
    {
      className: `inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black ${leave.status === "Approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : leave.status === "Rejected" ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-amber-50 text-amber-800 border border-amber-200"}`
    },
    leave.status
  )), /* @__PURE__ */ React.createElement("td", { className: "py-3.5 text-right" }, leave.status === "Pending" ? /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-end gap-1.5" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleOpenReview(leave, "Rejected"),
      className: "rounded-lg px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50"
    },
    "Reject"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleOpenReview(leave, "Approved"),
      className: "rounded-lg bg-[#832D51] text-white px-3 py-1 text-xs font-bold hover:bg-[#6a2240]"
    },
    "Approve"
  )) : /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-slate-400 font-semibold" }, "Processed by ", leave.reviewed_by || "CEO")))))))), activeTab === "permissions" && /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between border-b border-slate-100 pb-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-base font-extrabold text-slate-900 tracking-tight" }, "Permission Requests & Field Permissions"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500 font-medium" }, "Review early exits, half-days, and on-duty customer field permissions")), /* @__PURE__ */ React.createElement("span", { className: "rounded-full bg-[#3a7d63]/10 px-3 py-1 text-xs font-black text-[#3a7d63]" }, pendingPermissions.length, " Pending Actions")), /* @__PURE__ */ React.createElement("div", { className: "overflow-x-auto" }, /* @__PURE__ */ React.createElement("table", { className: "w-full text-left text-xs" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]" }, /* @__PURE__ */ React.createElement("th", { className: "pb-3 px-2" }, "Date"), /* @__PURE__ */ React.createElement("th", { className: "pb-3 px-2" }, "Staff Member"), /* @__PURE__ */ React.createElement("th", { className: "pb-3 px-2" }, "Permission Type"), /* @__PURE__ */ React.createElement("th", { className: "pb-3 px-2" }, "Time Window"), /* @__PURE__ */ React.createElement("th", { className: "pb-3 px-2" }, "Justification"), /* @__PURE__ */ React.createElement("th", { className: "pb-3 px-2" }, "Status"), /* @__PURE__ */ React.createElement("th", { className: "pb-3 px-2 text-right" }, "CEO Action"))), /* @__PURE__ */ React.createElement("tbody", { className: "divide-y divide-slate-100 font-medium" }, permissionRequests.map((perm) => /* @__PURE__ */ React.createElement("tr", { key: perm.id, className: "hover:bg-slate-50/70 transition" }, /* @__PURE__ */ React.createElement("td", { className: "py-3.5 px-2 font-bold text-slate-600" }, formatDDMMYYYY(perm.date || perm.submitted_at)), /* @__PURE__ */ React.createElement("td", { className: "py-3.5 px-2" }, /* @__PURE__ */ React.createElement("p", { className: "font-extrabold text-slate-900" }, perm.employee_name), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-400" }, perm.role)), /* @__PURE__ */ React.createElement("td", { className: "py-3.5 px-2 font-bold text-slate-800" }, perm.type), /* @__PURE__ */ React.createElement("td", { className: "py-3.5 px-2 text-slate-700" }, perm.timing), /* @__PURE__ */ React.createElement("td", { className: "py-3.5 px-2 text-slate-600 max-w-xs truncate" }, perm.reason), /* @__PURE__ */ React.createElement("td", { className: "py-3.5" }, /* @__PURE__ */ React.createElement(
    "span",
    {
      className: `inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black ${perm.status === "Approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : perm.status === "Rejected" ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-amber-50 text-amber-800 border border-amber-200"}`
    },
    perm.status
  )), /* @__PURE__ */ React.createElement("td", { className: "py-3.5 text-right" }, perm.status === "Pending" ? /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-end gap-1.5" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleOpenReview(perm, "Rejected"),
      className: "rounded-lg px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50"
    },
    "Reject"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleOpenReview(perm, "Approved"),
      className: "rounded-lg bg-[#832D51] text-white px-3 py-1 text-xs font-bold hover:bg-[#6a2240]"
    },
    "Approve"
  )) : /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-slate-400 font-semibold" }, "Processed by ", perm.reviewed_by || "CEO")))))))), activeTab === "attendance" && /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 sm:grid-cols-4" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200 bg-white p-5 shadow-xs" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-slate-500 uppercase" }, "Present Today"), /* @__PURE__ */ React.createElement("p", { className: "text-2xl font-black text-emerald-600 mt-2" }, attendanceSummary.presentToday)), /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200 bg-white p-5 shadow-xs" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-slate-500 uppercase" }, "Late Arrivals"), /* @__PURE__ */ React.createElement("p", { className: "text-2xl font-black text-amber-600 mt-2" }, attendanceSummary.lateArrivals)), /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200 bg-white p-5 shadow-xs" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-slate-500 uppercase" }, "On Approved Leave"), /* @__PURE__ */ React.createElement("p", { className: "text-2xl font-black text-blue-600 mt-2" }, attendanceSummary.onLeave)), /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200 bg-white p-5 shadow-xs" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-slate-500 uppercase" }, "Absent"), /* @__PURE__ */ React.createElement("p", { className: "text-2xl font-black text-slate-400 mt-2" }, attendanceSummary.absent))), /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-base font-extrabold text-slate-900 tracking-tight" }, attendanceFilter === "Today" ? "Today's" : attendanceFilter === "This Week" ? "This Week's" : "Custom Period", " Attendance Logs"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500 font-medium font-semibold" }, "Real-time check-in & check-out telemetry")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200" }, ["Today", "This Week", "Custom"].map((mode) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: mode,
      onClick: () => setAttendanceFilter(mode),
      className: `px-3.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${attendanceFilter === mode ? "bg-[#832D51] text-white shadow-xs" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`
    },
    mode
  ))), attendanceFilter === "Custom" && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5 text-xs font-bold" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "date",
      value: customStart,
      onChange: (e) => setCustomStart(e.target.value),
      className: "rounded-xl border border-slate-200 p-1.5 text-slate-700 outline-none focus:border-[#832D51]"
    }
  ), /* @__PURE__ */ React.createElement("span", { className: "text-slate-400" }, "to"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "date",
      value: customEnd,
      onChange: (e) => setCustomEnd(e.target.value),
      className: "rounded-xl border border-slate-200 p-1.5 text-slate-700 outline-none focus:border-[#832D51]"
    }
  )))), /* @__PURE__ */ React.createElement("div", { className: "overflow-x-auto" }, /* @__PURE__ */ React.createElement("table", { className: "w-full text-left text-xs" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider" }, /* @__PURE__ */ React.createElement("th", { className: "pb-3" }, "Employee"), /* @__PURE__ */ React.createElement("th", { className: "pb-3" }, "Date"), /* @__PURE__ */ React.createElement("th", { className: "pb-3" }, "Clock In (Logged In)"), /* @__PURE__ */ React.createElement("th", { className: "pb-3" }, "Clock Out (Logged Off)"), /* @__PURE__ */ React.createElement("th", { className: "pb-3" }, "Total Working Hours"), /* @__PURE__ */ React.createElement("th", { className: "pb-3" }, "Mode"), /* @__PURE__ */ React.createElement("th", { className: "pb-3" }, "Status"))), /* @__PURE__ */ React.createElement("tbody", { className: "divide-y divide-slate-100 font-medium" }, filteredDailyLogs.map((log) => {
    const isLoggedOut = log.status === "Logged off" || log.clockOut && log.clockOut !== "\u2014";
    return /* @__PURE__ */ React.createElement("tr", { key: log.id, className: "hover:bg-slate-50/70 transition" }, /* @__PURE__ */ React.createElement("td", { className: "py-3 font-extrabold text-slate-900" }, log.name), /* @__PURE__ */ React.createElement("td", { className: "py-3 text-slate-600 font-semibold" }, log.date), /* @__PURE__ */ React.createElement("td", { className: "py-3 font-bold text-[#832D51]" }, log.clockIn), /* @__PURE__ */ React.createElement("td", { className: "py-3 font-bold text-slate-600" }, log.clockOut || "\u2014"), /* @__PURE__ */ React.createElement("td", { className: "py-3 font-semibold text-slate-700" }, log.workHours || "In Progress"), /* @__PURE__ */ React.createElement("td", { className: "py-3 text-slate-500" }, log.mode || "Biometric"), /* @__PURE__ */ React.createElement("td", { className: "py-3" }, /* @__PURE__ */ React.createElement(
      "span",
      {
        className: `inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black border ${isLoggedOut ? "bg-slate-100 text-slate-700 border-slate-300" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`
      },
      isLoggedOut ? "Logged off" : "Logged in"
    )));
  })))))), activeTab === "approval_history" && /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4" }, /* @__PURE__ */ React.createElement("h2", { className: "text-base font-extrabold text-slate-900 tracking-tight" }, "CEO Clearances & Approvals Audit Trail"), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, [...leaveRequests, ...permissionRequests].filter((r) => r.status !== "Pending").map((item) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: item.id,
      className: "flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 text-xs"
    },
    /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-extrabold text-slate-900" }, item.employee_name), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-500" }, item.leave_type || item.type, " \xB7 ", item.duration || item.timing)),
    /* @__PURE__ */ React.createElement("div", { className: "text-right" }, /* @__PURE__ */ React.createElement(
      "span",
      {
        className: `inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black ${item.status === "Approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`
      },
      item.status
    ), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-400 mt-0.5" }, "Reviewed by Chief Executive Officer"))
  )))), reviewModalOpen && selectedRequest && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs" }, /* @__PURE__ */ React.createElement("div", { className: "w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between border-b border-slate-100 pb-3" }, /* @__PURE__ */ React.createElement("h3", { className: "text-base font-black text-slate-900" }, reviewAction, " Request for ", selectedRequest.employee_name), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setReviewModalOpen(false),
      className: "rounded-full p-1 text-slate-400 hover:bg-slate-100"
    },
    /* @__PURE__ */ React.createElement(X, { className: "size-5" })
  )), /* @__PURE__ */ React.createElement("div", { className: "space-y-3 text-xs" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-xl bg-slate-50 p-3 border border-slate-200/70" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold text-slate-500 uppercase text-[10px]" }, "Details"), /* @__PURE__ */ React.createElement("p", { className: "font-black text-slate-900 mt-1" }, selectedRequest.leave_type || selectedRequest.type), /* @__PURE__ */ React.createElement("p", { className: "text-slate-600 mt-0.5" }, selectedRequest.reason)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block font-bold text-slate-700 mb-1" }, "CEO Remarks / Instructions (Optional)"), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      value: reviewRemarks,
      onChange: (e) => setReviewRemarks(e.target.value),
      placeholder: "e.g. Approved. Ensure critical deals are handed over.",
      className: "w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 outline-none focus:border-[#832D51]",
      rows: 3
    }
  ))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end gap-2 pt-3 border-t border-slate-100" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setReviewModalOpen(false),
      className: "rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
    },
    "Cancel"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleConfirmDecision,
      className: `rounded-xl px-5 py-2 text-xs font-bold text-white shadow-xs ${reviewAction === "Approved" ? "bg-[#832D51] hover:bg-[#6a2240]" : "bg-rose-600 hover:bg-rose-700"}`
    },
    "Confirm ",
    reviewAction
  )))), selectedEmployee && /* @__PURE__ */ React.createElement(
    EmployeeProfileModal,
    {
      employee: selectedEmployee,
      onClose: () => setSelectedEmployee(null)
    }
  ));
}
export default CeoHrms;
