// HRMS Module - Sales Executive Portal
import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
  ChevronRight,
  CheckCircle2,
  Clock3,
  Send,
  Medal,
  Upload,
  X,
  Eye,
  FileUp,
  Plus,
  ShieldCheck,
} from "lucide-react";
import useCurrentUser from "../../hooks/useCurrentUser.js";
import { filterUserItems, isItemOwnedByUser } from "../../utils/userScope.js";
import { formatDate } from "../../utils/dateUtils.js";
import { reportAPI, attendanceAPI, hrmsAPI } from "../../services/api.js";
import { useToast } from "../../common/ToastContext.jsx";
import Attendance, { calculateWorkHours } from "./Attendance.jsx";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "attendance", label: "Attendance Portal", icon: UserCheck },
  { key: "daily_report", label: "Daily Work Report", icon: ClipboardList },
  { key: "leave", label: "Leave Management", icon: CalendarOff },
  { key: "calendar", label: "Holiday Calendar", icon: CalendarDays },
  { key: "career", label: "Career Ladder", icon: TrendingUp },
  { key: "handbook", label: "Twite Handbook", icon: BookOpen },
  { key: "activity", label: "Activity Logs", icon: Activity },
];

const HOLIDAYS = [
  { date: "15 Aug 2026", name: "Independence Day", type: "National" },
  { date: "02 Oct 2026", name: "Gandhi Jayanti", type: "National" },
  { date: "24 Oct 2026", name: "Diwali", type: "Festival" },
  { date: "25 Dec 2026", name: "Christmas", type: "Festival" },
  { date: "01 Jan 2027", name: "New Year", type: "Festival" },
  { date: "14 Jan 2027", name: "Pongal", type: "Regional" },
];

const HANDBOOK = [
  { title: "Sales Process", icon: "📋", content: "Every lead must be logged with accurate contact details. Follow LEAD → FOLLOWUP → VISIT → CUSTOMER pipeline." },
  { title: "Call Etiquette", icon: "📞", content: "Introduce clearly. Listen actively. Log call outcome within 30 minutes of every call." },
  { title: "Visit Protocol", icon: "🗺️", content: "Confirm visit 1 day prior. Carry brochure. Log GPS check-in/out. Submit visit report same day." },
  { title: "Lead Classification", icon: "🔥", content: "Hot: Buy within 7 days. Warm: Interested, needs nurturing. Cold: Not interested / no response." },
  { title: "Commission", icon: "💰", content: "Starter: ₹500/deal. Mid (5+ deals): ₹1,000/deal. Senior (15+ deals): ₹2,000/deal." },
  { title: "Daily Reporting", icon: "📊", content: "Submit Daily Work Report before 6:30 PM every working day. Include calls, visits, pipeline updates." },
];

export default function SalesHRMS() {
  const toastCtx = useToast();
  const showToast = (msg, type) => {
    if (toastCtx && toastCtx.showToast) toastCtx.showToast(msg, type);
  };

  const currentUser = useCurrentUser();
  const userEmail = (currentUser.email || "").toLowerCase().trim();
  const userName = currentUser.name || currentUser.full_name || userEmail.split("@")[0] || "Sales Executive";
  const empCode = currentUser.employee_code || currentUser.employee_id || `EMP-${userEmail ? userEmail.split('@')[0].toUpperCase() : '001'}`;
  const userId = currentUser.id || currentUser.user_id || "";

  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = searchParams.get("tab") || "dashboard";
  const setActiveSection = (val) => setSearchParams({ tab: val });

  const [hrmsTabs, setHrmsTabs] = useState(() => {
    const saved = localStorage.getItem(`tc_hrms_order_sales_${userEmail}`);
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
    const saved = localStorage.getItem(`tc_hrms_order_sales_${userEmail}`);
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
    const keys = reordered.map(item => item.key);
    localStorage.setItem(`tc_hrms_order_sales_${userEmail}`, JSON.stringify(keys));
    showToast("HRMS tab order updated!", "success");
  };
  const handleTabDragEnd = () => {
    setDraggedTabKey(null);
  };
  const resetHrmsTabs = () => {
    localStorage.removeItem(`tc_hrms_order_sales_${userEmail}`);
    setHrmsTabs(NAV_ITEMS);
    showToast("HRMS tabs reset to default.", "info");
  };

  const [reportFilterMode, setReportFilterMode] = useState("THIS MONTH");
  const [customDateFilter, setCustomDateFilter] = useState("");

  // ── Leave & Permission State ────────────────────────────────────────────────
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveType, setLeaveType] = useState("Full Day Leave");
  const [leaveFromDate, setLeaveFromDate] = useState(new Date().toISOString().split("T")[0]);
  const [leaveToDate, setLeaveToDate] = useState(new Date().toISOString().split("T")[0]);
  const [leaveTimeSlot, setLeaveTimeSlot] = useState("Full Day");
  const [leaveReason, setLeaveReason] = useState("");
  const [myLeaveRequests, setMyLeaveRequests] = useState([]);

  // ── Real Live Attendance Logs ────────────────────────────────────────────────
  const [realAttendanceLogs, setRealAttendanceLogs] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("tc_attendance_logs") || "[]");
      return Array.isArray(saved) ? filterUserItems(saved, currentUser) : [];
    } catch {
      return [];
    }
  });

  const [profile, setProfile] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("tc_se_profile") || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const code = empCode || currentUser.employee_code || currentUser.id;
    if (code) {
      hrmsAPI.getEmployeeById(code)
        .then((res) => {
          if (res && res.data) {
            const emp = res.data;
            const mapped = {
              fullName: emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.fullName,
              employeeId: emp.employee_code || emp.employee_id,
              officialEmail: emp.email,
              role: emp.role,
              team: emp.department,
              designation: emp.designation,
              reportingManager: emp.reporting_manager_name || "Not Assigned",
              reportingManagerEmail: emp.reporting_manager_email || "",
            };
            setProfile(mapped);
            localStorage.setItem("tc_se_profile", JSON.stringify(mapped));
          }
        })
        .catch(() => null);
    }
  }, [empCode, currentUser]);


  const isUserAdmin = currentUser.role?.includes('Admin') || profile.role?.includes('Admin');
  const managerName = isUserAdmin ? 'Dr. Twite Executive' : (profile.reportingManager && profile.reportingManager !== "Not Assigned" ? profile.reportingManager : (currentUser.reporting_manager_name || "Not Assigned"));



  useEffect(() => {
    attendanceAPI.getLogs()
      .then((res) => {
        const raw = Array.isArray(res) ? res : (res?.data || []);
        if (Array.isArray(raw) && raw.length > 0) {
          const scoped = filterUserItems(raw, currentUser);
          setRealAttendanceLogs((prev) => {
            const merged = [...scoped];
            prev.forEach((p) => {
              const pDate = p.date || p.attendance_date;
              const pIn = p.loginTime || p.check_in_time;
              if (!merged.some((m) => (m.date === pDate || m.attendance_date === pDate) && (m.loginTime === pIn || m.check_in_time === pIn))) {
                merged.unshift(p);
              }
            });
            return merged;
          });
        }
      })
      .catch(() => null);
  }, []);

  // Fetch Leave & Permission requests from API on mount
  useEffect(() => {
    attendanceAPI.getLeaveRequests()
      .then((res) => {
        const raw = Array.isArray(res) ? res : (res?.data || []);
        if (Array.isArray(raw)) {
          setMyLeaveRequests(raw);
        }
      })
      .catch(() => null);
  }, []);

  const handleSubmitLeaveRequest = async (e) => {
    e.preventDefault();
    if (!leaveReason.trim()) {
      showToast("Please provide a reason for your leave/permission request!", "error");
      return;
    }

    const payload = {
      id: `leave_${Date.now()}`,
      leave_type: leaveType,
      from_date: leaveFromDate,
      to_date: leaveToDate,
      time_slot: leaveTimeSlot,
      reason: leaveReason.trim(),
      executive_name: userName,
      executive_email: userEmail,
      employee_code: empCode,
      status: "Pending",
      duration: leaveType.includes("Half") ? "0.5 Day" : leaveType.includes("Permission") ? "2 Hours" : "1 Day",
      created_at: new Date().toISOString()
    };

    setMyLeaveRequests((prev) => [payload, ...prev]);
    setShowLeaveModal(false);
    setLeaveReason("");

    try {
      await attendanceAPI.submitLeaveRequest(payload);
      showToast(`🏖️ ${leaveType} Request submitted to Sales Manager!`, "success");
    } catch (err) {
      showToast(`Notice: Request submitted to manager.`, "info");
    }
  };

  // ── Load live stats from localStorage ─────────────────────────────────────
  const getArr = (key) => { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } };

  const matchesUser = (item) => {
    if (!item) return false;
    const ass = (item.assignedTo || item.assigned_to || item.accountManager || item.executive || item.executiveName || "").toLowerCase().trim();
    const email = (item.assignedToEmail || item.assigned_to_email || item.executiveEmail || item.email || "").toLowerCase().trim();
    const emp = (item.employee_id || item.employee_code || "").toLowerCase().trim();
    const uid = (item.user_id || item.userId || "").toLowerCase().trim();

    if (userEmail && (email === userEmail || ass === userEmail)) return true;
    if (empCode && emp === empCode.toLowerCase()) return true;
    if (userId && uid === userId.toLowerCase()) return true;
    if (userName && (ass.includes(userName.toLowerCase()) || userName.toLowerCase().includes(ass))) return true;

    return false;
  };

  const allLeads = getArr("tc_sm_leads").filter(matchesUser);
  const allVisits = getArr("tc_sales_visits").filter(matchesUser);
  const allFollowups = getArr("tc_sales_followups").filter(matchesUser);
  const allCustomers = getArr("tc_customer_accounts").filter(matchesUser);

  const convertedClients = allLeads.filter(l => l.status === "Converted to Customer" || l.status === "Converted").length;
  const hotLeads = allLeads.filter(l => l.category === "Hot" && l.status !== "Converted to Customer").length;
  const convRate = allLeads.length > 0 ? Math.round((convertedClients / allLeads.length) * 100) : 0;

  const [manualProgress, setManualProgress] = useState(45);
  useEffect(() => {
    const saved = localStorage.getItem("tc_manual_progress");
    if (saved !== null) {
      setManualProgress(Number(saved));
    } else {
      setManualProgress(convRate || 0);
    }
  }, [convRate]);

  // ── Report state ───────────────────────────────────────────────────────────
  const [report, setReport] = useState({ callsMade: "", visitsCompleted: "", leadsGenerated: "", clientsInterested: "", followupsScheduled: "", dealsClosed: "", highlights: "", blockers: "", nextDayPlan: "" });
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const pastReports = getArr("tc_se_daily_reports");

  const handleReportSubmit = (e) => {
    e.preventDefault();
    const todayISO = new Date().toISOString().split("T")[0];
    const newEodObj = {
      id: `eod_${Date.now()}`,
      executive: userName,
      executiveEmail: userEmail,
      executive_name: userName,
      executive_email: userEmail,
      employee_code: empCode || "EMP000012",
      date: todayISO,
      submittedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      callsMade: parseInt(report.callsMade || 0),
      visitsCompleted: parseInt(report.visitsCompleted || 0),
      leadsGenerated: parseInt(report.leadsGenerated || 0),
      clientsInterested: parseInt(report.clientsInterested || 0),
      followupsScheduled: parseInt(report.followupsScheduled || 0),
      dealsClosed: parseInt(report.dealsClosed || 0),
      highlights: report.highlights || "Completed daily client meetings and product presentations.",
      blockers: report.blockers || "None",
      nextDayPlan: report.nextDayPlan || "Follow up with interested clients and schedule site demos.",
      status: "Submitted",
      reportingManager: managerName,
      // Pass manager email so backend stores it directly (avoids re-resolve failures)
      reporting_manager_email: profile.reportingManagerEmail || currentUser.reporting_manager_email || "",
    };

    const saved = getArr("tc_se_daily_reports");
    const updated = [newEodObj, ...saved];
    localStorage.setItem("tc_se_daily_reports", JSON.stringify(updated));

    const eodSaved = getArr("tc_eod_reports");
    localStorage.setItem("tc_eod_reports", JSON.stringify([newEodObj, ...eodSaved]));

    // Send EOD Report to backend via API
    try {
      reportAPI.submitEODReport(newEodObj);
    } catch (apiErr) {
      console.warn("Backend EOD submit notice:", apiErr);
    }

    setReportSubmitted(true);
    showToast("📑 Daily Work Report submitted to Sales Manager successfully!", "success");
  };


  // ── Document State ──────────────────────────────────────────────────────────
  const [documentsList, setDocumentsList] = useState(() => {
    return getArr("tc_se_documents").length > 0
      ? getArr("tc_se_documents")
      : [
        { id: "doc_1", name: "Aadhar Card", status: "pending", note: "Required document", fileUrl: null, fileName: "" },
        { id: "doc_2", name: "Offer Letter", status: "pending", note: "Required document", fileUrl: null, fileName: "" },
        { id: "doc_3", name: "PAN Card", status: "pending", note: "Required document", fileUrl: null, fileName: "" },
      ];
  });

  const [previewDoc, setPreviewDoc] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem("tc_se_documents", JSON.stringify(documentsList));
    } catch (e) { }
  }, [documentsList]);

  // ── Activity log ───────────────────────────────────────────────────────────
  const activityLog = [
    ...allLeads.slice(0, 3).map(l => ({ icon: "🪪", text: `Lead added: ${l.company}`, time: l.createdAt || "Recently" })),
    ...allVisits.slice(0, 2).map(v => ({ icon: "📍", text: `Visit: ${v.customerName || v.customer}`, time: v.visitDate || "Recently" })),
    ...allCustomers.slice(0, 2).map(c => ({ icon: "🎉", text: `Converted: ${c.name}`, time: c.onboardDate || "Recently" })),
  ].slice(0, 8);

  return (
    <div className="space-y-6 font-sans text-slate-900 min-w-0 w-full p-2 sm:p-6">

      {/* Top Header & Sub-Navigation Tabs */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              {isUserAdmin ? "TwiteHRMS Admin Portal" : "TwiteHRMS Employee Portal"}
            </h1>
          </div>
        </div>

        {/* Horizontal Navigation Tabs Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-slate-100 pt-2.5">
          {hrmsTabs.map(({ key, label, icon: Icon }, index) => (
            <div
              key={key}
              draggable="true"
              onDragStart={(e) => handleTabDragStart(e, index)}
              onDragOver={(e) => handleTabDragOver(e, index)}
              onDrop={(e) => handleTabDrop(e, index)}
              onDragEnd={handleTabDragEnd}
              className={`flex items-center transition cursor-pointer ${
                draggedTabKey === index ? "opacity-40" : ""
              }`}
            >
              <button
                onClick={() => setActiveSection(key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer ${activeSection === key
                    ? "bg-[#1a1f36] text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100"
                  }`}
              >
                <Icon size={14} />
                {label}
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={resetHrmsTabs}
            className="ml-auto px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 transition cursor-pointer shrink-0"
          >
            Reset Order
          </button>
        </div>
      </div>

      {/* ── MAIN SECTION CONTENT ────────────────────────────────── */}
      <div className="w-full">

        {/* ── ATTENDANCE PORTAL ── */}
        {activeSection === "attendance" && (
          <div className="max-w-5xl">
            <Attendance />
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {activeSection === "dashboard" && (
          <div className="space-y-4 max-w-5xl">

            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                {isUserAdmin ? "Today's Operations Summary" : "Today's Performance"}
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                {(isUserAdmin ? [
                  { label: "Users Managed", value: "23", icon: Users, bg: "bg-blue-50 border-blue-200", text: "text-blue-700" },
                  { label: "System Audits", value: "148", icon: ShieldCheck, bg: "bg-purple-50 border-purple-200", text: "text-purple-700" },
                  { label: "Pending Requests", value: String(myLeaveRequests.filter(r => r.status === "Pending").length), icon: Clock3, bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
                  { label: "System Status", value: "Active", icon: Activity, bg: "bg-rose-50 border-rose-200", text: "text-rose-700" },
                ] : [
                  { label: "Calls Made", value: String(allFollowups.length), icon: Phone, bg: "bg-blue-50 border-blue-200", text: "text-blue-700" },
                  { label: "Visits Done", value: String(allVisits.length), icon: MapPin, bg: "bg-purple-50 border-purple-200", text: "text-purple-700" },
                  { label: "Clients Said OK", value: String(convertedClients), icon: UserCheck, bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
                  { label: "Hot Leads Active", value: String(hotLeads), icon: Target, bg: "bg-rose-50 border-rose-200", text: "text-rose-700" },
                ]).map(({ label, value, icon: Icon, bg, text }) => (
                  <div key={label} className={`bg-white rounded-xl p-2.5 sm:p-3 border shadow-2xs ${bg}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className={`text-[9px] font-black uppercase tracking-wider ${text}`}>{label}</p>
                        <h2 className={`text-xl sm:text-2xl font-black mt-0.5 ${text}`}>{value}</h2>
                      </div>
                      <div className={`w-7 h-7 rounded-lg ${bg.split(" ")[0]} ${text} flex items-center justify-center shrink-0`}>
                        <Icon size={15} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {!isUserAdmin && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { label: "Total My Leads", value: allLeads.length, icon: Users, color: "sky" },
                  { label: "Active Customers", value: allCustomers.length, icon: UserCheck, color: "emerald" },
                  { label: "Conversion Rate", value: `${convRate}%`, icon: TrendingUp, color: "violet" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className={`bg-white rounded-xl p-2.5 sm:p-3 border border-${color}-200 shadow-2xs flex items-center gap-3`}>
                    <div className={`w-8 h-8 rounded-lg bg-${color}-50 text-${color}-700 flex items-center justify-center shrink-0`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
                      <h2 className={`text-lg sm:text-xl font-black text-${color}-700`}>{value}</h2>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── 1. ATTENDANCE SUMMARY CARDS (COMPACT INLINE CARDS) ── */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-2.5">
              <h2 className="text-sm font-black text-slate-900">Attendance Summary</h2>

              <div className="grid grid-cols-2 gap-3">
                {/* Green Present Box */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center space-y-0.5">
                  <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">No of Present</span>
                  <div className="text-2xl font-black text-emerald-600">
                    {realAttendanceLogs.filter(a => a.status === "Present" || a.loginTime || a.check_in_time).length}
                  </div>
                </div>

                {/* Red Absent Box */}
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center space-y-0.5">
                  <span className="text-[10px] font-black text-rose-800 uppercase tracking-wider block">No of Absent</span>
                  <div className="text-2xl font-black text-rose-600">0</div>
                </div>
              </div>
            </div>

            {/* ── 2. ATTENDANCE REPORT TABLE (DYNAMIC REAL DATA FROM ATTENDANCE PAGE) ── */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black text-slate-900">Attendance Report</h2>
                <button
                  type="button"
                  onClick={() => setActiveSection("attendance")}
                  className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs transition cursor-pointer shadow-2xs"
                >
                  Mark Attendance Now 📹
                </button>
              </div>

              {/* Filter Controls Bar (TODAY | YESTERDAY | THIS MONTH | CUSTOM) */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-0.5 bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/80 flex-wrap">
                  {["TODAY", "YESTERDAY", "THIS MONTH", "CUSTOM"].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setReportFilterMode(mode)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wide transition cursor-pointer ${reportFilterMode === mode ? "bg-teal-600 text-white shadow-2xs" : "text-slate-500 hover:text-slate-900"
                        }`}
                    >
                      {mode === "CUSTOM" ? "CUSTOM DATE" : mode}
                    </button>
                  ))}
                </div>

                {/* Custom Date Input */}
                {reportFilterMode === "CUSTOM" && (
                  <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1 bg-white text-[11px] font-bold text-slate-700 shadow-2xs">
                    <span className="text-slate-400 font-medium">Select Date:</span>
                    <input
                      type="date"
                      value={customDateFilter}
                      onChange={(e) => setCustomDateFilter(e.target.value)}
                      className="text-xs font-bold bg-transparent focus:outline-none cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Attendance Report Data Table */}
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
                    // THIS MONTH
                    return true;
                  });

                  if (filteredLogs.length === 0) {
                    return (
                      <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-500 space-y-2">
                        <p className="font-extrabold text-slate-700 text-sm">No attendance records logged for this filter ({reportFilterMode}).</p>
                        <p>Switch filter to <b>THIS MONTH</b> or check in with camera!</p>
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

            {!isUserAdmin && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-black text-slate-900 text-sm">Monthly Conversion Progress (Adjustable Slider)</h3>
                  <span className="text-emerald-700 font-black text-sm">{convertedClients} / {allLeads.length || "—"} leads</span>
                </div>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={manualProgress}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setManualProgress(val);
                      localStorage.setItem("tc_manual_progress", val);
                    }}
                    className="custom-slider w-full cursor-pointer accent-teal-600 focus:outline-none"
                    style={{
                      background: `linear-gradient(to right, #0d9488 0%, #0d9488 ${manualProgress}%, #e2e8f0 ${manualProgress}%, #e2e8f0 100%)`
                    }}
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                    <span>0%</span>
                    <span>{manualProgress}% (Adjusted Target)</span>
                    <span>100%</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">Adjust target conversion progress dynamically according to your preference</p>
              </div>
            )}
          </div>
        )}

        {/* ── DAILY WORK REPORT ── */}
        {activeSection === "daily_report" && (
          <div className="max-w-3xl space-y-5">
            <div>
              <h1 className="text-2xl font-black text-slate-900">Daily Work Report</h1>
              <p className="text-slate-500 text-sm mt-0.5 font-semibold">
                Submit your daily {isUserAdmin ? "operations" : "sales activity"} report before 6:30 PM.
              </p>
            </div>

            {reportSubmitted ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center space-y-3">
                <CheckCircle2 size={40} className="text-emerald-600 mx-auto" />
                <h2 className="text-xl font-black text-emerald-900">Report Submitted! ✅</h2>
                <p className="text-emerald-700 font-semibold text-sm">Your daily report for {formatDate(new Date())} has been saved.</p>
                <button onClick={() => setReportSubmitted(false)} className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer">Submit Another</button>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <CalendarDays size={18} className="text-teal-600" />
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Report Date</p>
                      <p className="text-sm font-black text-slate-900">{formatDate(new Date())}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 font-bold">Reporting Manager</p>
                    <p className="text-sm font-black text-teal-700">{managerName}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">
                    {isUserAdmin ? "Today's Operational Metrics" : "Today's Numbers"}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(isUserAdmin ? [
                      { field: "usersOnboarded", label: "Users Onboarded", icon: UserCheck, ph: "e.g. 2" },
                      { field: "roleChanges", label: "Role Changes", icon: ShieldCheck, ph: "e.g. 1" },
                      { field: "ticketsResolved", label: "Tasks Resolved", icon: CheckCircle2, ph: "e.g. 5" },
                      { field: "maintenanceHours", label: "Maintenance Hours", icon: Clock3, ph: "e.g. 4" },
                    ] : [
                      { field: "callsMade", label: "Calls Made", icon: Phone, ph: "e.g. 12" },
                      { field: "visitsCompleted", label: "Visits Completed", icon: MapPin, ph: "e.g. 2" },
                      { field: "leadsGenerated", label: "New Leads", icon: Users, ph: "e.g. 5" },
                      { field: "clientsInterested", label: "Clients Interested", icon: UserCheck, ph: "e.g. 3" },
                      { field: "followupsScheduled", label: "Follow-ups Scheduled", icon: Clock3, ph: "e.g. 4" },
                      { field: "dealsClosed", label: "Deals Closed (Won)", icon: CheckCircle2, ph: "e.g. 1" },
                    ]).map(({ field, label, icon: Icon, ph }) => (
                      <div key={field} className="border border-slate-200 rounded-xl p-3 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                          <Icon size={12} className="text-teal-600" /> {label}
                        </div>
                        <input type="number" min="0" placeholder={ph} value={report[field] || ""}
                          onChange={e => setReport(p => ({ ...p, [field]: e.target.value }))}
                          className="w-full text-xl font-black text-slate-900 border-0 focus:outline-none bg-transparent" />
                      </div>
                    ))}
                  </div>
                </div>
                {[
                  { field: "highlights", label: isUserAdmin ? "Key Actions & Operations Highlights" : "Key Highlights / Wins Today", ph: isUserAdmin ? "User additions, system logs audited, permissions updated..." : "Best calls, site visits, promising leads..." },
                  { field: "blockers", label: isUserAdmin ? "Operational Blockers / System Alerts" : "Blockers / Issues", ph: isUserAdmin ? "Server latency, DB access limits, user authentication issues..." : "Challenges, rejections, travel issues..." },
                  { field: "nextDayPlan", label: isUserAdmin ? "Tomorrow's Operational Plan" : "Tomorrow's Plan", ph: isUserAdmin ? "Perform security check, sync employee records, verify logs..." : "Which clients to call, follow up..." },
                ].map(({ field, label, ph }) => (
                  <div key={field}>
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">{label}</label>
                    <textarea rows={3} placeholder={ph} value={report[field] || ""}
                      onChange={e => setReport(p => ({ ...p, [field]: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:border-teal-500 resize-none bg-slate-50 focus:bg-white transition" />
                  </div>
                ))}
                <button type="submit" className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-sm flex items-center justify-center gap-2 transition cursor-pointer">
                  <Send size={16} /> Submit Daily Report
                </button>
              </form>
            )}
            {pastReports.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs">
                <div className="px-5 py-4 border-b border-slate-100"><h3 className="font-black text-slate-900 text-sm">Past Reports</h3></div>
                <div className="divide-y divide-slate-100">
                  {pastReports.slice(0, 5).map((r, i) => (
                    <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-900">{formatDate(new Date(r.date))}</p>
                        <p className="text-xs text-slate-500 font-semibold">📞 {r.callsMade || 0} calls · 📍 {r.visitsCompleted || 0} visits · ✅ {r.dealsClosed || 0} deals</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">Manager: {r.reportingManager || managerName}</p>
                      </div>
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Submitted</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── DOCUMENTS (Working Local File Upload) ── */}
        {activeSection === "documents" && (
          <div className="max-w-2xl space-y-5">
            <h1 className="text-2xl font-black text-slate-900">My Documents</h1>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 divide-y divide-slate-100">
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider pb-3">Mandatory Documents</p>
              {documentsList.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-black text-slate-900">{doc.name}</p>
                    <p className={`text-[11px] font-semibold ${doc.status === "uploaded" ? "text-emerald-600" : "text-slate-400"}`}>
                      {doc.status === "uploaded" ? `✅ Uploaded: ${doc.fileName || "File Attached"}` : "📄 Required document"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Hidden Local File Input */}
                    <input
                      type="file"
                      id={`file_input_${doc.id}`}
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const base64 = event.target.result;
                          setDocumentsList((prev) =>
                            prev.map((item) =>
                              item.id === doc.id
                                ? {
                                  ...item,
                                  status: "uploaded",
                                  fileName: file.name,
                                  fileUrl: base64,
                                  note: `Uploaded ${new Date().toLocaleDateString("en-GB")}`,
                                }
                                : item
                            )
                          );
                        };
                        reader.readAsDataURL(file);
                      }}
                    />

                    {doc.status === "uploaded" ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(doc)}
                          className="text-xs font-extrabold px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer transition flex items-center gap-1"
                        >
                          <Eye size={13} /> View
                        </button>

                        <button
                          type="button"
                          onClick={() => document.getElementById(`file_input_${doc.id}`)?.click()}
                          className="text-xs font-extrabold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer transition flex items-center gap-1"
                        >
                          <Upload size={13} /> Re-upload
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => document.getElementById(`file_input_${doc.id}`)?.click()}
                        className="text-xs font-extrabold px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-900 cursor-pointer transition flex items-center gap-1 shadow-2xs"
                      >
                        <Upload size={13} /> Upload
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Other Document Drag & Drop Box */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Upload Other Document</p>

              <input
                type="file"
                id="file_input_custom"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const base64 = event.target.result;
                    const newCustomDoc = {
                      id: `doc_${Date.now()}`,
                      name: file.name.split(".")[0],
                      status: "uploaded",
                      fileName: file.name,
                      fileUrl: base64,
                      note: `Uploaded ${new Date().toLocaleDateString("en-GB")}`,
                    };
                    setDocumentsList((prev) => [...prev, newCustomDoc]);
                  };
                  reader.readAsDataURL(file);
                }}
              />

              <div
                onClick={() => document.getElementById("file_input_custom")?.click()}
                className="border-2 border-dashed border-teal-300 hover:border-teal-500 bg-teal-50/40 hover:bg-teal-50/80 rounded-2xl p-8 text-center transition cursor-pointer group"
              >
                <FileUp size={32} className="text-teal-600 group-hover:scale-110 transition mx-auto mb-2" />
                <p className="text-sm font-black text-slate-900">Click to upload document from your computer</p>
                <p className="text-[11px] font-bold text-slate-500 mt-1">Supports PDF, JPG, PNG, Word, Excel files</p>
              </div>
            </div>

            {/* Modal Document Viewer */}
            {previewDoc && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-base font-black text-slate-900">{previewDoc.name}</h3>
                      <p className="text-xs text-slate-500 font-semibold">{previewDoc.fileName}</p>
                    </div>
                    <button
                      onClick={() => setPreviewDoc(null)}
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="max-h-[60vh] overflow-auto rounded-2xl border border-slate-100 p-2 bg-slate-50 flex items-center justify-center">
                    {previewDoc.fileUrl?.startsWith("data:image/") ? (
                      <img src={previewDoc.fileUrl} alt={previewDoc.name} className="max-w-full rounded-xl shadow-md" />
                    ) : (
                      <iframe src={previewDoc.fileUrl} title={previewDoc.name} className="w-full h-80 rounded-xl" />
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => setPreviewDoc(null)}
                      className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer"
                    >
                      Close Viewer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── LEAVE MANAGEMENT (Twite HRMS UI Match) ── */}
        {activeSection === "leave" && (
          <div className="space-y-6 max-w-5xl">
            {/* 1. Leave & Permission Header & Apply Action */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <CalendarDays size={20} className="text-teal-600" /> My Leave & Permission Management
                </h2>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Apply for Full-Day Leave, Half-Day Permission, or Short 2-Hour Permission. Requests route directly to {isUserAdmin ? "the CEO" : "your assigned Sales Manager"} for approval.
                </p>
              </div>

              <button
                onClick={() => setShowLeaveModal(true)}
                className="px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs shadow-xs transition flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Plus size={16} /> Apply for Leave / Permission
              </button>
            </div>

            {/* 2. Leave Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-emerald-100/70 border border-emerald-200 rounded-2xl p-4 space-y-1.5">
                <span className="text-xs font-black text-emerald-900 block uppercase tracking-wider">Full Day Leave</span>
                <div className="text-3xl font-black text-emerald-950">12 Days</div>
                <span className="text-[11px] font-extrabold text-emerald-800">12 / 12 Days Remaining</span>
              </div>

              <div className="bg-amber-100/70 border border-amber-200 rounded-2xl p-4 space-y-1.5">
                <span className="text-xs font-black text-amber-900 block uppercase tracking-wider">Half-Day Permission</span>
                <div className="text-3xl font-black text-amber-950">6 Slots</div>
                <span className="text-[11px] font-extrabold text-amber-800">Morning or Afternoon</span>
              </div>

              <div className="bg-sky-100/70 border border-sky-200 rounded-2xl p-4 space-y-1.5">
                <span className="text-xs font-black text-sky-900 block uppercase tracking-wider">Short Permission</span>
                <div className="text-3xl font-black text-sky-950">2 Hours</div>
                <span className="text-[11px] font-extrabold text-sky-800">Max 2 Slots / Month</span>
              </div>
            </div>

            {/* 3. Leave & Permission History Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900">My Leave & Permission Requests History</h3>
                <span className="text-xs text-slate-500 font-bold">Live Status from {isUserAdmin ? "CEO" : "Sales Manager"}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-3">Request Type</th>
                      <th className="py-3 px-3">Dates & Slot</th>
                      <th className="py-3 px-3">Reason</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Manager Comment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                    {myLeaveRequests.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-slate-400 font-bold">
                          No leave or permission requests submitted yet. Click "Apply for Leave / Permission" above to submit one.
                        </td>
                      </tr>
                    ) : (
                      myLeaveRequests.map((req, idx) => (
                        <tr key={req.id || idx} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-3">
                            <span className={`inline-block px-2.5 py-1 rounded-xl text-xs font-black border ${req.leave_type?.includes("Half")
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : req.leave_type?.includes("Permission")
                                  ? "bg-sky-50 text-sky-800 border-sky-200"
                                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
                              }`}>
                              {req.leave_type}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 font-mono text-slate-900">
                            <div>{req.from_date} {req.to_date !== req.from_date ? `to ${req.to_date}` : ""}</div>
                            <div className="text-[10px] text-slate-400 font-semibold">{req.time_slot || req.duration || "Full Day"}</div>
                          </td>
                          <td className="py-3.5 px-3 max-w-[220px] text-slate-800 font-semibold truncate">
                            {req.raw_reason || req.reason?.split("|")[0]?.strip?.() || req.reason}
                          </td>
                          <td className="py-3.5 px-3">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black border ${req.status?.toLowerCase() === "approved" || req.status?.toLowerCase().includes("approv")
                                ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                                : req.status?.toLowerCase() === "rejected" || req.status?.toLowerCase().includes("reject")
                                  ? "bg-rose-100 text-rose-900 border-rose-300"
                                  : "bg-amber-100 text-amber-950 border-amber-300"
                              }`}>
                              {req.status?.toLowerCase() === "approved" || req.status?.toLowerCase().includes("approv")
                                ? "✅ Approved"
                                : req.status?.toLowerCase() === "rejected" || req.status?.toLowerCase().includes("reject")
                                  ? "❌ Rejected"
                                  : "⏳ Pending"}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-slate-500 italic">
                            {req.manager_comment || "Awaiting manager review..."}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Attendance Summary & Reports */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
              <h2 className="text-lg font-black text-slate-900">Attendance Report</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[760px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-3">DATE</th>
                      <th className="py-3 px-3">LOGIN TIME</th>
                      <th className="py-3 px-3">LOGOUT TIME</th>
                      <th className="py-3 px-3">LOGIN LOCATION</th>
                      <th className="py-3 px-3">LOGOUT LOCATION</th>
                      <th className="py-3 px-3">WORK HOURS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                    {(() => {
                      const logs = getArr("tc_attendance_logs");
                      const userLogs = filterUserItems(logs, currentUser);

                      if (userLogs.length === 0) {
                        return (
                          <tr>
                            <td colSpan="6" className="py-8 text-center text-slate-400 font-bold">
                              No attendance logs recorded for your account yet.
                            </td>
                          </tr>
                        );
                      }

                      return userLogs.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition">
                          <td className="py-4 px-3 text-slate-900">{row.date}</td>
                          <td className="py-4 px-3">{row.loginTime}</td>
                          <td className="py-4 px-3">{row.logoutTime}</td>
                          <td className="py-4 px-3 max-w-[220px] text-slate-600 font-medium text-[11px] leading-relaxed">
                            {row.loginLocation}
                          </td>
                          <td className="py-4 px-3 max-w-[220px] text-slate-600 font-medium text-[11px] leading-relaxed">
                            {row.logoutLocation}
                          </td>
                          <td className="py-4 px-3 font-extrabold text-slate-900">{row.workHours}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. APPLY LEAVE / PERMISSION MODAL */}
            {showLeaveModal && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      🏖️ Apply for Leave / Permission
                    </h3>
                    <button
                      onClick={() => setShowLeaveModal(false)}
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleSubmitLeaveRequest} className="space-y-4">
                    {/* Request Type Toggle */}
                    <div>
                      <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
                        Select Request Type
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { type: "Full Day Leave", label: "Full Day Leave" },
                          { type: "Half-Day Permission", label: "Half-Day" },
                          { type: "Short Permission (2 Hours)", label: "2-Hr Permission" },
                        ].map((item) => (
                          <button
                            key={item.type}
                            type="button"
                            onClick={() => {
                              setLeaveType(item.type);
                              if (item.type.includes("Permission")) {
                                setLeaveTimeSlot("10:00 AM - 12:00 PM");
                              } else if (item.type.includes("Half")) {
                                setLeaveTimeSlot("Morning (9:00 AM - 1:00 PM)");
                              } else {
                                setLeaveTimeSlot("Full Day");
                              }
                            }}
                            className={`py-2 px-2.5 rounded-xl text-xs font-black border transition cursor-pointer ${leaveType === item.type
                                ? "bg-teal-600 text-white border-teal-600 shadow-2xs"
                                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">From Date</label>
                        <input
                          type="date"
                          value={leaveFromDate}
                          onChange={(e) => setLeaveFromDate(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-slate-50 text-slate-900 focus:outline-none focus:border-teal-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">To Date</label>
                        <input
                          type="date"
                          value={leaveToDate}
                          onChange={(e) => setLeaveToDate(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-slate-50 text-slate-900 focus:outline-none focus:border-teal-500"
                          required
                        />
                      </div>
                    </div>

                    {/* Half Day / Short Permission Slot Selection */}
                    {leaveType.includes("Half") && (
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Half-Day Time Slot</label>
                        <select
                          value={leaveTimeSlot}
                          onChange={(e) => setLeaveTimeSlot(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-slate-50 text-slate-900 focus:outline-none focus:border-teal-500"
                        >
                          <option value="Morning (9:00 AM - 1:00 PM)">Morning Slot (9:00 AM - 1:00 PM)</option>
                          <option value="Afternoon (2:00 PM - 6:00 PM)">Afternoon Slot (2:00 PM - 6:00 PM)</option>
                        </select>
                      </div>
                    )}

                    {leaveType.includes("Permission") && (
                      <div className="bg-sky-50/80 border border-sky-200 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-sky-950 uppercase tracking-wider block">
                            ⏰ Select 2-Hour Permission Time
                          </label>
                          <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md">
                            2 Hours Maximum
                          </span>
                        </div>

                        {/* Quick Presets */}
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 block mb-1.5">Quick Time Presets:</span>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              "10:00 AM - 12:00 PM",
                              "11:00 AM - 01:00 PM",
                              "02:00 PM - 04:00 PM",
                              "04:00 PM - 06:00 PM",
                            ].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setLeaveTimeSlot(preset)}
                                className={`py-1.5 px-2 rounded-xl text-[11px] font-extrabold border transition cursor-pointer ${leaveTimeSlot === preset
                                    ? "bg-sky-600 text-white border-sky-600 shadow-2xs"
                                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                  }`}
                              >
                                {preset}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Custom Time Slot Input */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">Or Enter Custom Time Slot:</label>
                          <input
                            type="text"
                            value={leaveTimeSlot}
                            onChange={(e) => setLeaveTimeSlot(e.target.value)}
                            placeholder="e.g. 09:30 AM - 11:30 AM"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-white text-slate-900 focus:outline-none focus:border-sky-500"
                            required
                          />
                        </div>
                      </div>
                    )}

                    {/* Reason */}
                    <div>
                      <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-1.5">Reason for Request</label>
                      <textarea
                        rows={3}
                        value={leaveReason}
                        onChange={(e) => setLeaveReason(e.target.value)}
                        placeholder="State reason clearly (e.g. Doctor appointment, family function...)"
                        className="w-full border-2 border-slate-300 focus:border-teal-600 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 bg-slate-50 focus:bg-white transition-all focus:outline-none resize-none shadow-xs"
                        required
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowLeaveModal(false)}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs cursor-pointer shadow-xs"
                      >
                        Submit Request
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── HOLIDAY CALENDAR ── */}
        {activeSection === "calendar" && (
          <div className="max-w-2xl space-y-5">
            <h1 className="text-2xl font-black text-slate-900">Holiday Calendar 2026–27</h1>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100">
              {HOLIDAYS.map(h => (
                <div key={h.date} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-lg shrink-0">
                      {h.type === "National" ? "🇮🇳" : h.type === "Festival" ? "🎉" : "🌅"}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{h.name}</p>
                      <p className="text-[11px] text-slate-500 font-semibold">{h.date}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${h.type === "National" ? "bg-blue-50 text-blue-700 border-blue-200" : h.type === "Festival" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-violet-50 text-violet-700 border-violet-200"}`}>{h.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CAREER LADDER ── */}
        {activeSection === "career" && (
          <div className="max-w-2xl space-y-5">
            <h1 className="text-2xl font-black text-slate-900">Career Ladder</h1>
            <p className="text-slate-500 text-sm font-semibold">Your growth path at TwiteConnect based on deals closed.</p>
            <div className="space-y-3">
              {[
                { level: "1", title: "Sales Executive Trainee", target: "0–5 deals", done: convertedClients > 5, current: convertedClients <= 5 },
                { level: "2", title: "Sales Executive", target: "6–15 deals", done: convertedClients > 15, current: convertedClients > 5 && convertedClients <= 15 },
                { level: "3", title: "Senior Sales Executive", target: "16–30 deals", done: convertedClients > 30, current: convertedClients > 15 && convertedClients <= 30 },
                { level: "4", title: "Sales Team Lead", target: "31+ deals", done: false, current: convertedClients > 30 },
                { level: "5", title: "Sales Manager", target: "Promotion", done: false, current: false },
              ].map(step => (
                <div key={step.level} className={`flex items-center gap-4 p-4 rounded-2xl border transition ${step.current ? "bg-teal-50 border-teal-300" : step.done ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200"}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${step.done ? "bg-emerald-600 text-white" : step.current ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                    {step.done ? <CheckCircle2 size={18} /> : step.level}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-black text-sm ${step.current ? "text-teal-900" : step.done ? "text-emerald-900" : "text-slate-500"}`}>{step.title}</p>
                    <p className="text-[11px] font-semibold text-slate-400">{step.target}</p>
                  </div>
                  {step.current && <span className="text-[10px] font-black text-teal-700 bg-teal-100 px-2.5 py-0.5 rounded-full border border-teal-300 shrink-0">Current Level</span>}
                  {step.done && <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shrink-0">✅ Achieved</span>}
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
              <div className="flex items-center gap-3 mb-3"><Medal size={20} className="text-amber-500" /><h3 className="font-black text-slate-900 text-sm">Your Total Conversions</h3></div>
              <p className="text-4xl font-black text-amber-600">{convertedClients}</p>
              <p className="text-xs text-slate-400 font-semibold mt-1">deals closed across all time</p>
            </div>
          </div>
        )}

        {/* ── HANDBOOK ── */}
        {activeSection === "handbook" && (
          <div className="max-w-3xl space-y-5">
            <h1 className="text-2xl font-black text-slate-900">Twite Sales Handbook</h1>
            <p className="text-slate-500 text-sm font-semibold">Guidelines, processes, and policies for TwiteConnect Sales Executives.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {HANDBOOK.map(s => (
                <div key={s.title} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-2">
                  <div className="flex items-center gap-2"><span className="text-xl">{s.icon}</span><h3 className="font-black text-slate-900 text-sm">{s.title}</h3></div>
                  <p className="text-xs text-slate-600 font-semibold leading-relaxed">{s.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ACTIVITY LOGS ── */}
        {activeSection === "activity" && (
          <div className="max-w-2xl space-y-5">
            <h1 className="text-2xl font-black text-slate-900">Activity Logs</h1>
            <p className="text-slate-500 text-sm font-semibold">All your recent actions — leads, visits, and conversions.</p>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100">
              {!activityLog.length ? (
                <p className="text-center text-slate-400 text-sm py-8 font-semibold">No activity recorded yet. Start adding leads!</p>
              ) : activityLog.map((a, i) => (
                <div key={i} className="px-5 py-3.5 flex items-center gap-3">
                  <span className="text-lg shrink-0">{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-900 truncate">{a.text}</p>
                    <p className="text-[11px] text-slate-400 font-semibold">{a.time}</p>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}