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
import { reportAPI, attendanceAPI, hrmsAPI, adminAPI, holidaysAPI, handbookAPI } from "../../services/api.js";
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

export default function SalesHRMS(props) {
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
  const isCurrentUserAdmin = currentUser.role?.includes('Admin') || String(currentUser.role).toLowerCase().includes('admin');
  const activeSection = searchParams.get("tab") || (isCurrentUserAdmin ? "attendance" : "dashboard");
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

  const [dbHolidays, setDbHolidays] = useState([]);
  const [dbHandbook, setDbHandbook] = useState([]);
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [loadingHandbook, setLoadingHandbook] = useState(false);

  useEffect(() => {
    async function loadMasterData() {
      try {
        setLoadingHolidays(true);
        const hRes = await holidaysAPI.getHolidays();
        if (Array.isArray(hRes)) setDbHolidays(hRes);
      } catch (err) {
        console.warn("Failed fetching holidays:", err);
      } finally {
        setLoadingHolidays(false);
      }

      try {
        setLoadingHandbook(true);
        const hbRes = await handbookAPI.getPublishedDocs();
        if (Array.isArray(hbRes)) setDbHandbook(hbRes);
      } catch (err) {
        console.warn("Failed fetching handbook:", err);
      } finally {
        setLoadingHandbook(false);
      }
    }
    loadMasterData();
  }, []);

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
  const [selectedLeaveDetailType, setSelectedLeaveDetailType] = useState(null);

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
    async function loadUserProfile() {
      try {
        let emp = null;
        const selfRes = await hrmsAPI.getEmployeeById("self").catch(() => null);
        if (selfRes && selfRes.data) {
          emp = selfRes.data;
        } else {
          const listRes = await hrmsAPI.getEmployees().catch(() => null);
          const allEmps = listRes?.data || [];
          const userEmailStr = String(currentUser.email || '').toLowerCase().trim();
          const empCodeStr = String(empCode || currentUser.employee_code || currentUser.employee_id || '').toLowerCase().trim();
          emp = allEmps.find(e => 
            (e.email && String(e.email).toLowerCase().trim() === userEmailStr) ||
            (empCodeStr && (String(e.employee_code || e.employee_id || '').toLowerCase().trim() === empCodeStr))
          );
        }

        if (emp) {
          const mapped = {
            fullName: emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.fullName,
            employeeId: emp.employee_code || emp.employee_id,
            officialEmail: emp.email,
            role: emp.role,
            team: emp.department,
            designation: emp.designation,
            reportingManager: emp.reporting_manager_name || "Not Assigned",
            reportingManagerEmail: emp.reporting_manager_email || "",
            annualLeaves: emp.annual_leaves ?? emp.annualLeaves,
            halfDayPermissions: emp.half_day_permissions ?? emp.halfDayPermissions,
            shortPermissions: emp.short_permissions ?? emp.shortPermissions,
            annual_leaves: emp.annual_leaves ?? emp.annualLeaves,
            half_day_permissions: emp.half_day_permissions ?? emp.halfDayPermissions,
            short_permissions: emp.short_permissions ?? emp.shortPermissions,
          };
          setProfile(mapped);
          localStorage.setItem("tc_se_profile", JSON.stringify(mapped));
        }
      } catch (err) {
        console.warn("Could not load employee profile for leaves:", err);
      }
    }
    loadUserProfile();
  }, [empCode, currentUser]);


  const isUserAdmin = currentUser.role?.includes('Admin') || profile.role?.includes('Admin') || String(currentUser.role).toLowerCase().includes('admin');
  const managerName = isUserAdmin ? 'Dr. Twite Executive' : (profile.reportingManager && profile.reportingManager !== "Not Assigned" ? profile.reportingManager : (currentUser.reporting_manager_name || "Not Assigned"));

  const [employeesCount, setEmployeesCount] = useState(0);
  const [adminKPIs, setAdminKPIs] = useState(null);

  useEffect(() => {
    if (isUserAdmin) {
      hrmsAPI.getEmployees()
        .then(res => {
          if (res && res.data) {
            setEmployeesCount(res.data.length);
          }
        })
        .catch(() => null);

      adminAPI.getKPIs("today")
        .then(res => {
          if (res && res.data) {
            setAdminKPIs(res.data);
          }
        })
        .catch(() => null);
    }
  }, [isUserAdmin]);



  useEffect(() => {
    attendanceAPI.getLogs()
      .then((res) => {
        const raw = Array.isArray(res) ? res : (res?.data || []);
        if (Array.isArray(raw) && raw.length > 0) {
          const userEmailStr = String(currentUser.email || '').toLowerCase().trim();
          const userEmpCodeStr = String(empCode || currentUser.employee_code || currentUser.employee_id || '').toLowerCase().trim();
          const userIdStr = String(currentUser.id || '').toLowerCase().trim();

          const scoped = raw.filter(p => {
            const pId = String(p.employee_id || p.user_id || '').toLowerCase().trim();
            const pEmail = String(p.email || p.user_email || '').toLowerCase().trim();
            return (userEmpCodeStr && pId === userEmpCodeStr) || (userIdStr && pId === userIdStr) || (userEmailStr && pEmail === userEmailStr);
          });

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
          const userEmailStr = String(currentUser.email || '').toLowerCase().trim();
          const userEmpCodeStr = String(empCode || currentUser.employee_code || currentUser.employee_id || '').toLowerCase().trim();
          const userIdStr = String(currentUser.id || '').toLowerCase().trim();

          const scoped = raw.filter(p => {
            const pId = String(p.employee_id || p.user_id || p.employee_code || '').toLowerCase().trim();
            const pEmail = String(p.email || p.executive_email || p.user_email || '').toLowerCase().trim();
            return (userEmpCodeStr && pId === userEmpCodeStr) || (userIdStr && pId === userIdStr) || (userEmailStr && pEmail === userEmailStr);
          });
          setMyLeaveRequests(scoped);
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
      role: currentUser.role || profile.role || "Sales Executive",
      duration: leaveType.includes("Half") ? "0.5 Day" : leaveType.includes("Permission") ? "2 Hours" : "1 Day",
      created_at: new Date().toISOString()
    };

    setMyLeaveRequests((prev) => [payload, ...prev]);
    setShowLeaveModal(false);
    setLeaveReason("");

    try {
      await attendanceAPI.submitLeaveRequest(payload);
      showToast(`🏖️ ${leaveType} Request submitted successfully!`, "success");
    } catch (err) {
      showToast(`Notice: Request submitted.`, "info");
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
  const [selectedReport, setSelectedReport] = useState(null);
  const [showPastReportsModal, setShowPastReportsModal] = useState(false);
  const [pastReports, setPastReports] = useState([]);

  const fetchPastReports = async () => {
    try {
      const res = await reportAPI.getEODReports();
      const reportsData = Array.isArray(res) ? res : (res?.data || []);
      if (Array.isArray(reportsData) && reportsData.length > 0) {
        setPastReports(reportsData);
      } else {
        setPastReports(getArr("tc_se_daily_reports"));
      }
    } catch (err) {
      console.warn("Failed to fetch past EOD reports:", err);
      setPastReports(getArr("tc_se_daily_reports"));
    }
  };

  useEffect(() => {
    if (userEmail) {
      fetchPastReports();
    }
  }, [userEmail]);

  const handleReportSubmit = async (e) => {
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
      await reportAPI.submitEODReport(newEodObj);
      showToast("📑 Daily Work Report submitted to Sales Manager successfully!", "success");
      await fetchPastReports();
    } catch (apiErr) {
      console.warn("Backend EOD submit notice:", apiErr);
      showToast("Daily Work Report saved locally (Offline mode)", "info");
    }

    setReportSubmitted(true);
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

  const todayObj = new Date();
  const isSameDay = (d1, d2) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };
  const getStartOfWeek = (d) => {
    const temp = new Date(d);
    const day = temp.getDay();
    const diff = temp.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(temp.setDate(diff));
  };

  const getLogDateKey = (log) => {
    const raw = log.date || log.attendance_date || log.created_at || log.check_in_time || '';
    if (!raw) return '';
    try {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
      }
    } catch {}
    return String(raw).trim();
  };

  const filteredLogs = realAttendanceLogs.filter((log) => {
    const dStr = String(log.date || log.attendance_date || "");
    const logDate = new Date(dStr);
    if (isNaN(logDate.getTime())) {
      return true;
    }
    if (reportFilterMode === "TODAY") {
      return isSameDay(logDate, todayObj);
    }
    if (reportFilterMode === "YESTERDAY") {
      const yesterdayObj = new Date();
      yesterdayObj.setDate(yesterdayObj.getDate() - 1);
      return isSameDay(logDate, yesterdayObj);
    }
    if (reportFilterMode === "THIS WEEK") {
      const startOfWeek = getStartOfWeek(todayObj);
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 7);
      return logDate >= startOfWeek && logDate < endOfWeek;
    }
    if (reportFilterMode === "THIS MONTH") {
      return logDate.getFullYear() === todayObj.getFullYear() && logDate.getMonth() === todayObj.getMonth();
    }
    if (reportFilterMode === "CUSTOM" && customDateFilter) {
      const customDateObj = new Date(customDateFilter);
      return !isNaN(customDateObj.getTime()) && isSameDay(logDate, customDateObj);
    }
    return true;
  });

  // Calculate UNIQUE present days / employee-days so multiple logins on the same day count as 1 Present
  const distinctPresentKeys = new Set(
    filteredLogs.map((l) => {
      const dateKey = getLogDateKey(l);
      if (isUserAdmin) {
        const empId = l.employee_id || l.user_id || l.employee_code || l.email || l.name || 'emp';
        return `${empId}___${dateKey}`;
      }
      return dateKey;
    }).filter(Boolean)
  );

  const dynamicPresentCount = distinctPresentKeys.size;
  const dynamicAbsentCount = isUserAdmin
    ? (reportFilterMode === "TODAY" ? Math.max(0, employeesCount - dynamicPresentCount) : "—")
    : (dynamicPresentCount === 0 && (reportFilterMode === "TODAY" || reportFilterMode === "YESTERDAY") ? 1 : 0);

  return (
    <div className="space-y-6 font-sans text-slate-900 min-w-0 w-full p-2 sm:p-6">

      {/* Top Header & Sub-Navigation Tabs */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              {props?.portalTitle || (isUserAdmin ? "TwiteHRMS Admin Portal" : "TwiteHRMS Employee Portal")}
            </h1>
          </div>
        </div>

        {/* Horizontal Navigation Tabs Bar */}
        <div className="flex items-center flex-nowrap whitespace-nowrap gap-1.5 overflow-x-auto pb-1 border-t border-slate-100 pt-2.5 scrollbar-thin">
          {hrmsTabs.filter(tab => !(isCurrentUserAdmin && tab.key === "dashboard")).map(({ key, label, icon: Icon }, index) => (
            <div
              key={key}
              draggable="true"
              onDragStart={(e) => handleTabDragStart(e, index)}
              onDragOver={(e) => handleTabDragOver(e, index)}
              onDrop={(e) => handleTabDrop(e, index)}
              onDragEnd={handleTabDragEnd}
              className={`flex items-center shrink-0 whitespace-nowrap transition cursor-pointer ${
                draggedTabKey === index ? "opacity-40" : ""
              }`}
            >
              <button
                onClick={() => setActiveSection(key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer whitespace-nowrap ${activeSection === key
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
        {activeSection === "dashboard" && !isUserAdmin && (
          <div className="space-y-4 max-w-5xl">


            {/* ── 1. ATTENDANCE SUMMARY CARDS (COMPACT INLINE CARDS) ── */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-2.5">
              <h2 className="text-sm font-black text-slate-900">Attendance Summary</h2>

              <div className="grid grid-cols-2 gap-3">
                {/* Green Present Box */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center space-y-0.5">
                  <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">No of Present</span>
                  <div className="text-2xl font-black text-emerald-600">
                    {dynamicPresentCount}
                  </div>
                </div>

                {/* Red Absent Box */}
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center space-y-0.5">
                  <span className="text-[10px] font-black text-rose-800 uppercase tracking-wider block">No of Absent</span>
                  <div className="text-2xl font-black text-rose-600">
                    {dynamicAbsentCount}
                  </div>
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

              {/* Filter Controls Bar (TODAY | YESTERDAY | THIS WEEK | THIS MONTH | CUSTOM) */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-0.5 bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/80 flex-wrap">
                  {["TODAY", "YESTERDAY", "THIS WEEK", "THIS MONTH", "CUSTOM"].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setReportFilterMode(mode)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wide transition cursor-pointer ${
                        reportFilterMode === mode ? "bg-teal-600 text-white shadow-2xs" : "text-slate-500 hover:text-slate-900"
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
                  const todayObj = new Date();
                  
                  const isSameDay = (d1, d2) => {
                    return d1.getFullYear() === d2.getFullYear() &&
                           d1.getMonth() === d2.getMonth() &&
                           d1.getDate() === d2.getDate();
                  };

                  const getStartOfWeek = (d) => {
                    const temp = new Date(d);
                    const day = temp.getDay();
                    const diff = temp.getDate() - day + (day === 0 ? -6 : 1); // Monday start
                    return new Date(temp.setDate(diff));
                  };

                  const filteredLogs = realAttendanceLogs.filter((log) => {
                    const dStr = String(log.date || log.attendance_date || "");
                    const logDate = new Date(dStr);
                    if (isNaN(logDate.getTime())) {
                      return true;
                    }

                    if (reportFilterMode === "TODAY") {
                      return isSameDay(logDate, todayObj);
                    }
                    if (reportFilterMode === "YESTERDAY") {
                      const yesterdayObj = new Date();
                      yesterdayObj.setDate(yesterdayObj.getDate() - 1);
                      return isSameDay(logDate, yesterdayObj);
                    }
                    if (reportFilterMode === "THIS WEEK") {
                      const startOfWeek = getStartOfWeek(todayObj);
                      startOfWeek.setHours(0, 0, 0, 0);
                      const endOfWeek = new Date(startOfWeek);
                      endOfWeek.setDate(endOfWeek.getDate() + 7);
                      return logDate >= startOfWeek && logDate < endOfWeek;
                    }
                    if (reportFilterMode === "THIS MONTH") {
                      return logDate.getFullYear() === todayObj.getFullYear() && logDate.getMonth() === todayObj.getMonth();
                    }
                    if (reportFilterMode === "CUSTOM" && customDateFilter) {
                      const customDateObj = new Date(customDateFilter);
                      return !isNaN(customDateObj.getTime()) && isSameDay(logDate, customDateObj);
                    }
                    return true;
                  });

                  if (filteredLogs.length === 0) {
                    return (
                      <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-500 space-y-2">
                        <p className="font-extrabold text-slate-700 text-sm">No attendance records found.</p>
                      </div>
                    );
                  }

                  return (
                    <table className="w-full text-left font-semibold text-xs text-slate-800">
                      <thead className="border-b border-slate-200 text-slate-400 font-black text-[10px] uppercase tracking-wider bg-slate-50">
                        <tr>
                          {isUserAdmin && <th className="py-3 px-4">EMPLOYEE NAME</th>}
                          {isUserAdmin && <th className="py-3 px-4">EMPLOYEE ID</th>}
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
                            {isUserAdmin && <td className="py-4 px-4 font-bold text-slate-900 whitespace-nowrap">{row.employee_name || row.name || "System User"}</td>}
                            {isUserAdmin && <td className="py-4 px-4 font-bold text-slate-800 whitespace-nowrap">{row.employee_id || "—"}</td>}
                            <td className="py-4 px-4 font-bold text-slate-900 whitespace-nowrap">{formatDate(row.date || row.attendance_date)}</td>
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
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900">Daily Work Report</h1>
                <p className="text-slate-500 text-sm mt-0.5 font-semibold">
                  Submit your daily {isUserAdmin ? "operations" : "sales activity"} report before 6:30 PM.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPastReportsModal(true)}
                className="px-4 py-2.5 rounded-2xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-xs font-black flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-2xs"
              >
                <FileText size={15} /> View My Reports
              </button>
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
                    <div key={i} className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                      <div>
                        <p className="text-sm font-black text-slate-900">{formatDate(new Date(r.date))}</p>
                        <p className="text-xs text-slate-500 font-semibold">📞 {r.callsMade || 0} calls · 📍 {r.visitsCompleted || 0} visits · ✅ {r.dealsClosed || 0} deals</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">Manager: {r.reportingManager || managerName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedReport(r)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black border border-slate-200 transition cursor-pointer active:scale-95 flex items-center gap-1"
                        >
                          <Eye size={12} /> View Details
                        </button>
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Submitted</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal EOD Report Details Viewer */}
            {selectedReport && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[60] overflow-y-auto">
                <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl my-auto animate-in fade-in zoom-in duration-150">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
                        <ClipboardList className="w-6 h-6 text-teal-600" /> Daily Work Report Details ({formatDate(new Date(selectedReport.date))})
                      </h3>
                    </div>
                    <button onClick={() => setSelectedReport(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer">
                      <X size={20} />
                    </button>
                  </div>

                  {/* Numbers Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {isUserAdmin ? (
                      <>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400">Users Onboarded</span>
                          <p className="font-black text-slate-900 text-base">{selectedReport.usersOnboarded || 0}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                          <span className="text-[10px] font-bold text-emerald-800">Role Changes</span>
                          <p className="font-black text-emerald-950 text-base">{selectedReport.roleChanges || 0}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200">
                          <span className="text-[10px] font-bold text-indigo-800">Tasks Resolved</span>
                          <p className="font-black text-indigo-950 text-base">{selectedReport.ticketsResolved || 0}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400">Calls Made</span>
                          <p className="font-black text-slate-900 text-base">{selectedReport.callsMade || 0}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                          <span className="text-[10px] font-bold text-emerald-800">Visits Completed</span>
                          <p className="font-black text-emerald-950 text-base">{selectedReport.visitsCompleted || 0}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200">
                          <span className="text-[10px] font-bold text-indigo-800">New Leads</span>
                          <p className="font-black text-indigo-950 text-base">{selectedReport.leadsGenerated || 0}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                          <span className="text-[10px] font-bold text-rose-800">Clients Interested</span>
                          <p className="font-black text-rose-950 text-base">{selectedReport.clientsInterested || 0}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                          <span className="text-[10px] font-bold text-amber-900">Follow-ups Scheduled</span>
                          <p className="font-black text-amber-950 text-base">{selectedReport.followupsScheduled || 0}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200">
                          <span className="text-[10px] font-bold text-teal-800">Deals Closed (Won)</span>
                          <p className="font-black text-teal-950 text-base">{selectedReport.dealsClosed || 0}</p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Highlights, Blockers, Plan */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500">
                      {isUserAdmin ? "Key Actions & Operations Highlights" : "Key Highlights / Wins Today"}
                    </span>
                    <p className="text-slate-800 font-semibold">{selectedReport.highlights || "No highlights entered."}</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 space-y-1 text-xs">
                    <span className="text-[10px] font-extrabold uppercase text-rose-800">
                      {isUserAdmin ? "Operational Blockers / System Alerts" : "Blockers / Issues"}
                    </span>
                    <p className="text-rose-950 font-semibold">{selectedReport.blockers || "No blockers reported."}</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 space-y-1 text-xs">
                    <span className="text-[10px] font-extrabold uppercase text-amber-900">
                      {isUserAdmin ? "Tomorrow's Operational Plan" : "Tomorrow's Plan"}
                    </span>
                    <p className="text-amber-950 font-semibold">{selectedReport.nextDayPlan || "No tomorrow plans entered."}</p>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSelectedReport(null)}
                      className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-extrabold text-xs cursor-pointer hover:bg-slate-800 transition"
                    >
                      Close Details
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Past Reports List Viewer */}
            {showPastReportsModal && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
                <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl my-auto animate-in fade-in zoom-in duration-150 flex flex-col max-h-[85vh]">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                        <FileText className="w-6 h-6 text-teal-600" /> My Submitted Daily Reports
                      </h3>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">Day-by-day record of your EOD work reports</p>
                    </div>
                    <button onClick={() => setShowPastReportsModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="overflow-y-auto divide-y divide-slate-100 flex-1 pr-1">
                    {pastReports.length === 0 ? (
                      <p className="py-12 text-center text-slate-400 font-bold text-sm">No daily work reports submitted yet.</p>
                    ) : (
                      pastReports.map((r, i) => (
                        <div key={i} className="py-3.5 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-slate-900">{formatDate(new Date(r.date))}</p>
                            <p className="text-xs text-slate-500 font-semibold mt-0.5">
                              📞 {r.callsMade || 0} calls · 📍 {r.visitsCompleted || 0} visits · ✅ {r.dealsClosed || 0} deals
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">Manager: {r.reportingManager || managerName}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReport(r);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black border border-slate-200 transition cursor-pointer active:scale-95 flex items-center gap-1"
                            >
                              <Eye size={12} /> View Details
                            </button>
                            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              Submitted
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex justify-end pt-3 border-t border-slate-100 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowPastReportsModal(false)}
                      className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-extrabold text-xs cursor-pointer hover:bg-slate-800 transition"
                    >
                      Close List
                    </button>
                  </div>
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
                    {(() => {
                      if (doc.status === 'approved') {
                        return (
                          <p className="text-[11px] font-semibold mt-0.5 text-emerald-600">
                            ✅ Approved — {doc.fileName}
                          </p>
                        )
                      } else if (doc.status === 'rejected') {
                        return (
                          <p className="text-[11px] font-semibold mt-0.5 text-rose-600">
                            ❌ Rejected (Please re-upload)
                          </p>
                        )
                      } else if (doc.status === 'uploaded') {
                        return (
                          <p className="text-[11px] font-semibold mt-0.5 text-amber-600 font-bold">
                            ⏳ Pending Approval — {doc.fileName}
                          </p>
                        )
                      } else {
                        return (
                          <p className="text-[11px] font-semibold mt-0.5 text-slate-400">
                            📄 Required document
                          </p>
                        )
                      }
                    })()}
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

                    {(doc.status === "uploaded" || doc.status === "approved") && (
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="text-xs font-extrabold px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer transition flex items-center gap-1"
                      >
                        <Eye size={13} /> View
                      </button>
                    )}
                    {doc.status !== "approved" && (
                      <button
                        type="button"
                        onClick={() => document.getElementById(`file_input_${doc.id}`)?.click()}
                        className="text-xs font-extrabold px-3 py-1.5 rounded-xl bg-slate-900 text-white cursor-pointer transition flex items-center gap-1"
                      >
                        <Upload size={13} /> {doc.status === "uploaded" ? "Re-upload" : "Upload"}
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
        {activeSection === "leave" && (() => {
          const userEmailClean = String(userEmail || currentUser.email || profile.officialEmail || '').toLowerCase().trim();
          const savedLeaves = userEmailClean ? localStorage.getItem(`tc_leaves_${userEmailClean}`) : null;
          const localAllocation = savedLeaves ? JSON.parse(savedLeaves) : null;

          const leaveCards = [
            {
              type: 'Casual Leave',
              allowed: Number(profile.annual_leaves ?? profile.annualLeaves ?? currentUser.annual_leaves ?? currentUser.annualLeaves ?? localAllocation?.annualLeaves ?? 12),
              consumed: myLeaveRequests.filter(r => (r.leave_type === 'Casual Leave' || r.leave_type === 'Full Day Leave' || String(r.leave_type || '').includes('Casual') || String(r.leave_type || '').includes('Full')) && r.status !== 'Rejected').reduce((sum, r) => {
                const daysStr = String(r.duration || '1');
                const match = daysStr.match(/(\d+)/);
                return sum + (match ? parseFloat(match[1]) : 1.0);
              }, 0),
              unit: 'Days',
              color: 'bg-emerald-50 border-emerald-200 text-emerald-950',
              barColor: 'bg-emerald-600',
              description: 'General full-day casual leaves'
            },
            {
              type: 'Sick Leave',
              allowed: Number(profile.sick_leaves ?? profile.sickLeaves ?? currentUser.sick_leaves ?? currentUser.sickLeaves ?? localAllocation?.sickLeaves ?? 10),
              consumed: myLeaveRequests.filter(r => (r.leave_type === 'Sick Leave' || String(r.leave_type || '').includes('Sick')) && r.status !== 'Rejected').reduce((sum, r) => {
                const daysStr = String(r.duration || '1');
                const match = daysStr.match(/(\d+)/);
                return sum + (match ? parseFloat(match[1]) : 1.0);
              }, 0),
              unit: 'Days',
              color: 'bg-rose-50 border-rose-200 text-rose-950',
              barColor: 'bg-rose-600',
              description: 'Medical rest / Sick leave balance'
            },
            {
              type: 'Other Leave',
              allowed: Number(profile.other_leaves ?? profile.otherLeaves ?? currentUser.other_leaves ?? currentUser.otherLeaves ?? localAllocation?.otherLeaves ?? 10),
              consumed: myLeaveRequests.filter(r => (r.leave_type === 'Other Leave' || String(r.leave_type || '').includes('Other')) && r.status !== 'Rejected').reduce((sum, r) => {
                const daysStr = String(r.duration || '1');
                const match = daysStr.match(/(\d+)/);
                return sum + (match ? parseFloat(match[1]) : 1.0);
              }, 0),
              unit: 'Days',
              color: 'bg-violet-50 border-violet-200 text-violet-950',
              barColor: 'bg-violet-600',
              description: 'Special leaves / WFH / Others'
            },
            {
              type: 'Half-Day Permission',
              allowed: Number(profile.half_day_permissions ?? profile.halfDayPermissions ?? currentUser.half_day_permissions ?? currentUser.halfDayPermissions ?? localAllocation?.halfDayPermissions ?? 6),
              consumed: myLeaveRequests.filter(r => (r.leave_type === 'Half-Day Permission' || String(r.leave_type || '').includes('Half')) && r.status !== 'Rejected').reduce((sum, r) => sum + 0.5, 0),
              unit: 'Days',
              color: 'bg-amber-50 border-amber-200 text-amber-950',
              barColor: 'bg-amber-600',
              description: 'Half-day permissions quota'
            },
            {
              type: 'Short Permission',
              allowed: Number(profile.short_permissions ?? profile.shortPermissions ?? currentUser.short_permissions ?? currentUser.shortPermissions ?? localAllocation?.shortPermissions ?? 2),
              consumed: myLeaveRequests.filter(r => (r.leave_type === 'Short Permission' || String(r.leave_type || '').includes('Short')) && r.status !== 'Rejected').reduce((sum, r) => {
                const durationStr = String(r.duration || '2');
                const match = durationStr.match(/(\d+)/);
                return sum + (match ? parseFloat(match[1]) : 2.0);
              }, 0),
              unit: 'Hours',
              color: 'bg-sky-50 border-sky-200 text-sky-950',
              barColor: 'bg-sky-600',
              description: 'Monthly 2-hour short permission limit'
            }
          ];

          return (
            <>
              <div className="space-y-6 max-w-5xl">
            {/* 1. Leave & Permission Header & Apply Action */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <CalendarDays size={20} className="text-teal-600" /> My Leave & Permission Management
                </h2>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Apply for Casual, Sick, Other Leave, Half-Day, or Short 2-Hour Permission. Requests route to your manager for approval. Click any card to view detailed history.
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
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {leaveCards.map((card) => {
                const remaining = Math.max(0, card.allowed - card.consumed);
                const pct = Math.round((remaining / card.allowed) * 100) || 0;
                return (
                  <div
                    key={card.type}
                    onClick={() => setSelectedLeaveDetailType(card.type)}
                    className={`${card.color} rounded-2xl p-4 border shadow-xs space-y-1.5 text-xs cursor-pointer hover:scale-102 transition duration-150 active:scale-98`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-wider block opacity-75">{card.type}</span>
                    <div className="flex items-end gap-1">
                      <span className="text-2xl font-black">{remaining}</span>
                      <span className="text-[10px] font-bold opacity-60 mb-0.5">{card.unit.toLowerCase()} left</span>
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

            {/* Reusable LeaveDetailModal */}
            {selectedLeaveDetailType && (() => {
              const card = leaveCards.find(c => c.type === selectedLeaveDetailType);
              const remaining = Math.max(0, card.allowed - card.consumed);
              
              const history = myLeaveRequests.filter(r => {
                const rType = String(r.leave_type || r.leaveType || '').toLowerCase();
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
                  <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
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
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                              {history.map((r, idx) => {
                                const fromDateStr = r.from_date || r.fromDate || '—';
                                const toDateStr = r.to_date || r.toDate || '—';
                                const dateDisplay = fromDateStr === toDateStr ? fromDateStr : `${fromDateStr} to ${toDateStr}`;
                                return (
                                  <tr key={r.id || idx} className="hover:bg-slate-50/50">
                                    <td className="py-2.5">{dateDisplay}</td>
                                    <td className="py-2.5 font-bold text-slate-900">{r.duration || r.days || '1 Day'}</td>
                                    <td className="py-2.5 text-slate-500 italic font-normal max-w-[200px] truncate" title={r.reason}>
                                      {r.reason}
                                    </td>
                                    <td className="py-2.5">
                                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black border uppercase tracking-wider ${
                                        r.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                        r.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                        'bg-amber-50 text-amber-700 border-amber-200'
                                      }`}>
                                        {r.status || 'Pending'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 text-slate-500 font-normal italic">
                                      {r.manager_comment || r.managerRemark || r.managerComment || '—'}
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
            {!isUserAdmin && (
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
                            <td className="py-4 px-3 text-slate-900">{formatDate(row.date)}</td>
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
            )}

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
                          { type: "Casual Leave", label: "Casual Leave" },
                          { type: "Sick Leave", label: "Sick Leave" },
                          { type: "Other Leave", label: "Other Leave" },
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
                            className={`py-2 px-2 border rounded-xl text-[10px] font-black transition cursor-pointer ${leaveType === item.type
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
            </>
          );
        })()}

        {/* ── HOLIDAY CALENDAR ── */}
        {activeSection === "calendar" && (
          <div className="max-w-2xl space-y-5">
            <h1 className="text-2xl font-black text-slate-900">Holiday Calendar</h1>
            {loadingHolidays ? (
              <p className="text-slate-400 text-sm font-semibold p-4">Loading holiday calendar...</p>
            ) : dbHolidays.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <CalendarDays size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-slate-700">No holidays configured</p>
                <p className="text-xs text-slate-400 font-medium">No company holidays have been scheduled for this period.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100">
                {dbHolidays.map(h => (
                  <div key={h.id || h.date} className="px-5 py-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-lg shrink-0">
                        {h.type === "National" ? "🇮🇳" : h.type === "Festival" ? "🎉" : "🌅"}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">{h.name}</p>
                        <p className="text-[11px] text-slate-500 font-semibold">{h.date}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${h.type === "National" ? "bg-blue-50 text-blue-700 border-blue-200" : h.type === "Festival" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-violet-50 text-violet-700 border-violet-200"}`}>{h.type || "Mandatory"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CAREER LADDER ── */}
        {activeSection === "career" && (
          <div className="max-w-2xl space-y-5">
            <h1 className="text-2xl font-black text-slate-900">Career Ladder</h1>
            <p className="text-slate-500 text-sm font-semibold">
              {isUserAdmin 
                ? "Your growth path at TwiteConnect based on employee accounts managed." 
                : "Your growth path at TwiteConnect based on deals closed."}
            </p>
            <div className="space-y-3">
              {(isUserAdmin ? [
                { level: "1", title: "HR & Admin Assistant", target: "0–5 profiles", done: employeesCount > 5, current: employeesCount <= 5 },
                { level: "2", title: "HR & Admin Executive", target: "6–15 profiles", done: employeesCount > 15, current: employeesCount > 5 && employeesCount <= 15 },
                { level: "3", title: "Senior HR & Admin Lead", target: "16–30 profiles", done: employeesCount > 30, current: employeesCount > 15 && employeesCount <= 30 },
                { level: "4", title: "HR & Operations Manager", target: "31–50 profiles", done: employeesCount > 50, current: employeesCount > 30 && employeesCount <= 50 },
                { level: "5", title: "VP of Operations & People", target: "51+ profiles", done: false, current: employeesCount > 50 },
              ] : [
                { level: "1", title: "Sales Executive Trainee", target: "0–5 deals", done: convertedClients > 5, current: convertedClients <= 5 },
                { level: "2", title: "Sales Executive", target: "6–15 deals", done: convertedClients > 15, current: convertedClients > 5 && convertedClients <= 15 },
                { level: "3", title: "Senior Sales Executive", target: "16–30 deals", done: convertedClients > 30, current: convertedClients > 15 && convertedClients <= 30 },
                { level: "4", title: "Sales Team Lead", target: "31+ deals", done: false, current: convertedClients > 30 },
                { level: "5", title: "Sales Manager", target: "Promotion", done: false, current: false },
              ]).map(step => (
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
              <div className="flex items-center gap-3 mb-3">
                <Medal size={20} className="text-amber-500" />
                <h3 className="font-black text-slate-900 text-sm">
                  {isUserAdmin ? "Your Total Employees Managed" : "Your Total Conversions"}
                </h3>
              </div>
              <p className="text-4xl font-black text-amber-600">
                {isUserAdmin ? employeesCount : convertedClients}
              </p>
              <p className="text-xs text-slate-450 font-semibold mt-1">
                {isUserAdmin ? "active staff accounts in the portal" : "deals closed across all time"}
              </p>
            </div>
          </div>
        )}

        {/* ── HANDBOOK ── */}
        {activeSection === "handbook" && (
          <div className="max-w-3xl space-y-5">
            <h1 className="text-2xl font-black text-slate-900">Twite Sales Handbook</h1>
            <p className="text-slate-500 text-sm font-semibold">Guidelines, processes, and policies for TwiteConnect Sales Executives.</p>
            {loadingHandbook ? (
              <p className="text-slate-400 text-sm font-semibold p-4">Loading handbook policies...</p>
            ) : dbHandbook.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <BookOpen size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-slate-700">No published policies found</p>
                <p className="text-xs text-slate-400 font-medium">Company policy documents have not been published yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {dbHandbook.map(s => (
                  <div key={s.id || s.title} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-2">
                    <div className="flex items-center gap-2"><span className="text-xl">{s.icon || "📋"}</span><h3 className="font-black text-slate-900 text-sm">{s.title}</h3></div>
                    <p className="text-xs text-slate-600 font-semibold leading-relaxed">{s.content}</p>
                  </div>
                ))}
              </div>
            )}
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