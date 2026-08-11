import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  UserCheck,
  IndianRupee,
  ClipboardList,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  TrendingUp,
  MapPin,
  RefreshCw,
  Navigation,
  FileText,
  DollarSign,
  ChevronRight,
  CheckSquare,
  Square,
  Clock3,
  Loader2,
  Bell,
  Target,
  UserPlus,
  ArrowLeft,
  X,
  Building2,
  Sparkles,
  Zap,
  Phone,
  Gift,
  Award,
  ExternalLink,
  Briefcase
} from "lucide-react";
import { salesDashboardAPI, todoAPI, notificationAPI, crmAPI } from "../../services/api.js";
import { exportToPDF, exportToExcel, exportToCSV, getFormattedTodayDate } from "../../utils/exportUtils.js";
import { calculateWorkHours } from "./Attendance.jsx";
import { useToast } from "../../common/ToastContext.jsx";
import { formatDate } from "../../utils/dateUtils.js";
import useCurrentUser from "../../hooks/useCurrentUser.js";
import { isItemOwnedByUser, filterUserItems } from "../../utils/userScope.js";

// ── Mock Data Fallbacks ────────────────────────────────────────────────────────

const MOCK_KPIS = {
  assigned_leads: 0,
  converted_customers: 0,
  revenue_this_month: 0,
  pending_followups: 0,
  today_visits: 0,
  today_visits_target: 8,
  attendance_status: "Present",
  check_in_time: "09:10 AM",
  target_achievement_pct: 0,
  expenses_pending_amount: 0,
  revenue_achievement_pct: 0,
  revenue_target: 500000,
  visits_done: 0,
  visits_target: 8,
  visits_pct: 0,
  converted_leads: 0,
  total_leads_for_conversion: 0,
  lead_conversion_pct: 0,
  recent_activities: [],
  today_schedule: [],
};

// ── Circular Gauge Component ───────────────────────────────────────────────────

function CircularChart({ pct, color, label, sublabel, size = 100, stroke = 9 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[-90deg]">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1.2s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center rotate-0">
          <span className="text-xl font-extrabold text-slate-800">{Math.round(pct)}%</span>
        </div>
      </div>
      <p className="font-semibold text-slate-700 text-sm text-center">{label}</p>
      <p className="text-xs text-slate-400 text-center">{sublabel}</p>
    </div>
  );
}

// ── Skeleton Loader ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-2/3 mb-3" />
      <div className="h-8 bg-slate-200 rounded w-1/2 mb-2" />
      <div className="h-3 bg-slate-100 rounded w-1/3" />
    </div>
  );
}

// ── Priority Badge ─────────────────────────────────────────────────────────────

function PriorityBadge({ p }) {
  const map = {
    High: "bg-red-100 text-red-600",
    Medium: "bg-amber-100 text-amber-600",
    Low: "bg-green-100 text-green-600",
    Completed: "bg-slate-100 text-slate-500 line-through",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${map[p] || map.Medium}`}>{p}</span>
  );
}

// ── Status Badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    Completed: "bg-emerald-100 text-emerald-700",
    Upcoming: "bg-blue-100 text-blue-700",
    Scheduled: "bg-teal-100 text-teal-700",
  };
  return (
    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${map[status] || "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

const formatINR = (val) => {
  if (val === undefined || val === null) return "₹0";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function Dashboard() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // ── State ────────────────────────────────────────────────────────────────────
  const [kpis, setKpis] = useState(null);
  const [todos, setTodos] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [todoLoading, setTodoLoading] = useState(false);
  const [newTodo, setNewTodo] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("Today");
  const [refreshing, setRefreshing] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showLeadsModal, setShowLeadsModal] = useState(false);
  const [leadsModalTab, setLeadsModalTab] = useState("Hot");
  const [allLeadsList, setAllLeadsList] = useState([]);
  const [myCustomersList, setMyCustomersList] = useState([]);
  const [todayFollowupsListState, setTodayFollowupsListState] = useState([]);

  // Modals state: Reminder of the Day (Today Followups) & Revenue Incentive Modal
  const [showTodayFollowupsModal, setShowTodayFollowupsModal] = useState(false);
  const [showRevenueIncentiveModal, setShowRevenueIncentiveModal] = useState(false);

  // Quick Action Modal State (Direct Add Lead Modal on Dashboard!)
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [addLeadForm, setAddLeadForm] = useState({
    company: "",
    person: "",
    phone: "",
    email: "",
    city: "",
    category: "Hot",
    value: "₹4,50,000",
    notes: "",
  });

  const currentUser = useCurrentUser();
  const userEmail = (currentUser.email || "").toLowerCase().trim();
  const userName = currentUser.name || currentUser.full_name || userEmail.split("@")[0] || "Sales Executive";
  const userEmpCode = currentUser.employee_code || currentUser.employee_id || "";
  const userId = currentUser.id || currentUser.user_id || "";

  // ── Quick Actions Setup ──────────────────────────────────────────────────────
  const QUICK_ACTIONS = [
    { label: "Mark Attendance 📹", icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50", path: "/sales/attendance" },
    { label: "Add Lead 🪪", icon: UserPlus, color: "text-teal-600", bg: "bg-teal-50", isDirectModal: true },
    { label: "Follow-Ups 📅", icon: Clock3, color: "text-purple-600", bg: "bg-purple-50", path: "/sales/leads", activeTab: "followups" },
    { label: "Schedule Visit 📍", icon: Calendar, color: "text-blue-600", bg: "bg-blue-50", path: "/sales/client-log" },
    { label: "Opportunities 🎯", icon: Target, color: "text-orange-600", bg: "bg-orange-50", path: "/sales/leads", activeTab: "opportunities" },
    { label: "Submit Expense 💰", icon: DollarSign, color: "text-amber-600", bg: "bg-amber-50", path: "/sales/expenses" },
    { label: "Client Log 📑", icon: FileText, color: "text-teal-600", bg: "bg-teal-50", path: "/sales/client-log" },
    { label: "My Leads 👥", icon: Users, color: "text-indigo-600", bg: "bg-indigo-50", path: "/sales/leads" },
  ];

  // ── Fetch & Compute Live Data (Strictly Isolated Per Executive) ───────────────
  const fetchAll = useCallback(async () => {
    try {
      const leads = JSON.parse(localStorage.getItem("tc_sm_leads") || "[]");
      const customers = JSON.parse(localStorage.getItem("tc_customer_accounts") || "[]");
      const visits = JSON.parse(localStorage.getItem("tc_sales_visits") || "[]");
      const followups = JSON.parse(localStorage.getItem("tc_sales_followups") || "[]");
      const expenses = JSON.parse(localStorage.getItem("tc_sales_expenses") || "[]");
      const localTodos = JSON.parse(localStorage.getItem("tc_3d_todos") || "[]");
      const attLogs = JSON.parse(localStorage.getItem("tc_attendance_logs") || "[]");

      // Calculate Date Scope based on selectedMonth / date filter
      const now = new Date();
      const todayISO = now.toISOString().slice(0, 10);
      const todayFormattedStr = formatDate(now);
      const yesterdayISO = new Date(now.setDate(now.getDate() - 1)).toISOString().slice(0, 10);

      const matchesDate = (itemDate) => {
        if (!itemDate) return true;
        const str = String(itemDate);
        if (selectedMonth === "Yesterday") {
          return str.includes(yesterdayISO);
        }
        if (selectedMonth === "This Week") {
          const itemTime = new Date(str).getTime();
          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          return !isNaN(itemTime) && itemTime >= sevenDaysAgo;
        }
        if (selectedMonth === "This Month") {
          const currentMonthPrefix = new Date().toISOString().slice(0, 7);
          return str.includes(currentMonthPrefix);
        }
        // Default: Today
        return str.includes(todayISO) || str.includes(todayFormattedStr);
      };

      // Helper check for ownership
      const matchesUser = (item) => isItemOwnedByUser(item, currentUser);

      // Filter My Leads strictly
      const myLeads = leads.filter(matchesUser);
      const totalMyLeads = myLeads.length;
      setAllLeadsList(myLeads);

      // Filter My Customers strictly
      const myCustomers = customers.filter(matchesUser);
      setMyCustomersList(myCustomers);

      // Converted count
      const convertedCount = myLeads.filter(
        (l) => l.status === "Converted to Customer" || l.status === "Converted"
      ).length + myCustomers.length;

      const conversionPct = totalMyLeads > 0 ? Math.round((convertedCount / totalMyLeads) * 100) : 0;

      // Real Revenue generated specifically by this Sales Executive
      const customerRevenue = myCustomers.reduce((sum, cust) => {
        const valStr = cust.contractValue || cust.value || cust.revenue || cust.budget || "0";
        const val = parseInt(String(valStr).replace(/[^0-9]/g, "")) || 0;
        return sum + val;
      }, 0);

      const convertedLeadsRevenue = myLeads
        .filter((l) => l.status === "Converted to Customer" || l.status === "Converted" || l.status === "Closed Won")
        .reduce((sum, lead) => {
          const valStr = lead.value || lead.budget || lead.deal_value || "0";
          const val = parseInt(String(valStr).replace(/[^0-9]/g, "")) || 0;
          return sum + val;
        }, 0);

      const totalSeRevenue = customerRevenue + convertedLeadsRevenue || (myCustomers.length > 0 ? customerRevenue : 0);

      // My Followups filtered date-wise & excluding converted follow-ups
      const myFollowups = followups.filter((f) => {
        if (!matchesUser(f)) return false;
        const statusStr = String(f.status || f.outcome || "").toLowerCase();
        if (statusStr.includes("converted") || statusStr.includes("completed") || statusStr.includes("cancelled")) {
          return false;
        }
        return true;
      });

      const todayFollowupsList = myFollowups.filter((f) => {
        const fDate = f.scheduledDate || f.date || f.createdAt || "";
        return matchesDate(fDate) || String(fDate).includes(todayISO) || String(fDate).includes(todayFormattedStr);
      });
      setTodayFollowupsListState(todayFollowupsList);

      // My Visits filtered date-wise
      const myVisits = visits.filter(matchesUser);
      const todayVisitsList = myVisits.filter((v) => {
        const vDate = v.date || v.visitDate || v.scheduledDate || "";
        return matchesDate(vDate);
      });

      // My Expenses filtered date-wise
      const myExpenses = expenses.filter(matchesUser);
      const pendingExpensesAmount = myExpenses.reduce((acc, curr) => {
        if ((curr.status || "").toLowerCase().includes("pending")) {
          const val = parseInt(String(curr.amount || "").replace(/[^0-9]/g, "")) || 0;
          return acc + val;
        }
        return acc;
      }, 0);

      // Today Schedule for logged-in executive
      const todaySchedule = todayVisitsList.slice(0, 4).map(v => ({
        customer: v.customerName || v.clientName || v.customer || "Client Visit",
        time: v.time || v.visitTime || "Today",
        status: v.status || "Scheduled",
        type: v.purpose || "Site Visit"
      }));

      // My Attendance checking
      const myAtt = attLogs.filter(matchesUser);
      const todayStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      const todayISOStr = new Date().toISOString().slice(0, 10);
      const todayAtt = myAtt.find(a => {
        const d = String(a.date || a.attendance_date || "");
        return d.includes(todayStr) || d.includes(todayISOStr);
      }) || myAtt[0];

      const attCheckInTime = todayAtt?.loginTime || todayAtt?.check_in_time || "09:00 AM";

      const dynamicKpis = {
        my_leads: totalMyLeads,
        converted_customers: convertedCount,
        my_generated_revenue: totalSeRevenue,
        today_followups: todayFollowupsList.length,
        today_visits: todayVisitsList.length,
        today_visits_target: 8,
        attendance_status: "Present",
        check_in_time: attCheckInTime,
        check_out_time: todayAtt ? (todayAtt.logoutTime || todayAtt.check_out_time || "—") : "—",
        work_hours: todayAtt ? (todayAtt.workHours || todayAtt.total_working_hours || "8.5 hrs") : "8.5 hrs",
        expenses_pending_amount: pendingExpensesAmount,
        today_schedule: todaySchedule,
        revenue_achievement_pct: conversionPct > 0 ? conversionPct : 0,
        revenue_target: 500000,
        visits_done: todayVisitsList.filter(v => v.status === "Completed").length,
        visits_target: 8,
        visits_pct: todayVisitsList.length > 0 ? Math.round((todayVisitsList.filter(v => v.status === "Completed").length / todayVisitsList.length) * 100) : 0,
        converted_leads: convertedCount,
        total_leads_for_conversion: totalMyLeads,
        lead_conversion_pct: conversionPct,
      };

      setKpis(dynamicKpis);
      setTodos(localTodos.filter(matchesUser));
      const localNotifs = JSON.parse(localStorage.getItem("tc_app_notifications") || "[]");
      setNotifications(localNotifs.filter((n) => !n.recipientRole || n.recipientRole === "executive"));

    } catch (e) {
      console.error("Dashboard fetchAll error:", e);
      setTodos([]);
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userEmail, userName, userEmpCode, userId, selectedMonth]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Dashboard Direct Add Lead Submit Handler ─────────────────────────────────
  const handleAddLeadSubmit = (e) => {
    e.preventDefault();
    if (!addLeadForm.company.trim() || !addLeadForm.person.trim() || !addLeadForm.phone.trim()) {
      showToast("Please fill in Lead Name, Contact Person, and Phone Number!", "error");
      return;
    }

    const newLead = {
      id: `lead_${Date.now()}`,
      company: addLeadForm.company.trim(),
      person: addLeadForm.person.trim(),
      phone: addLeadForm.phone.trim(),
      email: addLeadForm.email.trim() || `${addLeadForm.company.toLowerCase().replace(/\s+/g, '')}@example.com`,
      city: addLeadForm.city.trim() || "Chennai",
      assignedTo: userName,
      assignedToEmail: userEmail,
      category: addLeadForm.category,
      priority: "High",
      value: addLeadForm.value || "₹4,50,000",
      status: "New",
      source: "Quick Action Sourced",
      notes: addLeadForm.notes.trim() || "Quick Action lead created from Dashboard.",
      executiveRemarks: [
        { note: `Lead created via Dashboard Quick Action by ${userName}.`, date: "Just now", author: userName }
      ],
    };

    try {
      const saved = JSON.parse(localStorage.getItem("tc_sm_leads") || "[]");
      localStorage.setItem("tc_sm_leads", JSON.stringify([newLead, ...saved]));
    } catch (e) { }

    setIsAddLeadModalOpen(false);
    setAddLeadForm({ company: "", person: "", phone: "", email: "", city: "", category: "Hot", value: "₹4,50,000", notes: "" });
    showToast(`🎉 New Lead "${newLead.company}" created successfully!`, "success");
    setTimeout(() => fetchAll(), 100);
  };

  // ── Todo actions ──────────────────────────────────────────────────────────────
  const toggleTodo = async (id, current) => {
    const updated = todos.map(t => t.id === id ? { ...t, is_completed: !current } : t);
    setTodos(updated);
    try { await todoAPI.updateTodo(id, { is_completed: !current }); } catch { /* silent */ }
  };

  const addTodo = async () => {
    if (!newTodo.trim()) return;
    setTodoLoading(true);
    const optimistic = { id: `tmp_${Date.now()}`, title: newTodo, is_completed: false, priority: "Medium" };
    setTodos(prev => [optimistic, ...prev]);
    setNewTodo("");
    try {
      const res = await todoAPI.createTodo({ title: newTodo, priority: "Medium" });
      if (res?.data) {
        setTodos(prev => prev.map(t => t.id === optimistic.id ? res.data : t));
      }
    } catch { /* silent */ } finally {
      setTodoLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const k = kpis || MOCK_KPIS;

  // Manager Fixed Sales Target Sync
  const managerTarget = React.useMemo(() => {
    try {
      const saved = localStorage.getItem('tc_monthly_sales_target');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { revenueTarget: 500000, dealsTarget: 10, setBy: 'Sales Manager' };
  }, []);

  const revTargetVal = Number(managerTarget.revenueTarget) || 500000;
  const revAchievedVal = k.my_generated_revenue || k.revenue_this_month || 0;
  const revAchievementPct = Math.min(Math.round((revAchievedVal / revTargetVal) * 100), 100);

  // Executive Incentive Calculation: 5% of total revenue generated
  const totalIncentiveEarned = Math.round(revAchievedVal * 0.05);

  return (
    <div className="space-y-5 font-sans text-slate-900 min-w-0 w-full">

      {/* ── Top Header Controls Row ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Executive Sales Dashboard</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Welcome back, {userName}! Here is your performance overview today.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-9 text-xs border border-teal-500/50 rounded-xl px-3 bg-teal-50/50 font-black text-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer shadow-2xs"
          >
            <option value="Today">📍 Today</option>
            <option value="This Month">This Month</option>
            <option value="Last Month">Last Month</option>
            <option value="This Quarter">This Quarter</option>
          </select>

          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="h-9 px-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>Export Report</span>
              <span className="text-[10px]">▼</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1 flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    const exportRows = [
                      { Metric: 'Assigned Leads', Value: k.assigned_leads },
                      { Metric: 'Converted Customers', Value: k.converted_customers },
                      { Metric: 'Revenue Generated', Value: k.my_generated_revenue },
                      { Metric: 'Today Visits', Value: k.today_visits },
                      { Metric: 'Pending Followups', Value: k.pending_followups },
                      { Metric: 'Date', Value: getFormattedTodayDate() },
                    ];
                    exportToPDF(`TConnect_Sales_Report_${new Date().toISOString().slice(0, 10)}`, 'TConnect Executive Sales Report', exportRows);
                    setShowExportMenu(false);
                  }}
                  className="px-3 py-2 rounded-lg text-left text-xs font-bold text-slate-700 hover:bg-teal-50 hover:text-teal-700 flex items-center gap-2 transition"
                >
                  <span>📄</span> Export as PDF
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const exportRows = [
                      { Metric: 'Assigned Leads', Value: k.assigned_leads },
                      { Metric: 'Converted Customers', Value: k.converted_customers },
                      { Metric: 'Revenue Generated', Value: k.my_generated_revenue },
                      { Metric: 'Today Visits', Value: k.today_visits },
                      { Metric: 'Pending Followups', Value: k.pending_followups },
                      { Metric: 'Date', Value: getFormattedTodayDate() },
                    ];
                    exportToExcel(`TConnect_Sales_Report_${new Date().toISOString().slice(0, 10)}.xls`, exportRows);
                    setShowExportMenu(false);
                  }}
                  className="px-3 py-2 rounded-lg text-left text-xs font-bold text-slate-700 hover:bg-teal-50 hover:text-teal-700 flex items-center gap-2 transition"
                >
                  <span>📊</span> Export as Excel (.xls)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const exportRows = [
                      { Metric: 'Assigned Leads', Value: k.assigned_leads },
                      { Metric: 'Converted Customers', Value: k.converted_customers },
                      { Metric: 'Revenue Generated', Value: k.my_generated_revenue },
                      { Metric: 'Today Visits', Value: k.today_visits },
                      { Metric: 'Pending Followups', Value: k.pending_followups },
                      { Metric: 'Date', Value: getFormattedTodayDate() },
                    ];
                    exportToCSV(`TConnect_Sales_Report_${new Date().toISOString().slice(0, 10)}.csv`, exportRows);
                    setShowExportMenu(false);
                  }}
                  className="px-3 py-2 rounded-lg text-left text-xs font-bold text-slate-700 hover:bg-teal-50 hover:text-teal-700 flex items-center gap-2 transition"
                >
                  <span>📝</span> Export as CSV (.csv)
                </button>
              </div>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
            title="Refresh data"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin text-teal-500" : ""} />
          </button>
        </div>
      </div>

      {/* ── Top Distinct Vivid Colored KPI Cards (3 Cards - Hot Lead Card Removed as requested!) ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          {Array(3).fill(0).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: My Leads (Vivid Blue Gradient) */}
          <div
            onClick={() => setShowLeadsModal(true)}
            className="bg-gradient-to-br from-blue-100/90 via-blue-50 to-indigo-50/80 rounded-2xl p-4.5 shadow-sm border-2 border-blue-200 hover:shadow-md hover:border-blue-400 transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-900 text-[10px] sm:text-xs font-black uppercase tracking-wider">My Leads</p>
                <h2 className="text-2xl sm:text-3xl font-black text-blue-950 mt-1">{k.my_leads || k.assigned_leads}</h2>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shrink-0">
                <Users size={20} />
              </div>
            </div>
          </div>

          {/* Card 2: Converted Clients (Vivid Emerald Gradient) */}
          <div
            onClick={() => navigate("/sales/customers")}
            className="bg-gradient-to-br from-emerald-100/90 via-emerald-50 to-teal-50/80 rounded-2xl p-4.5 shadow-sm border-2 border-emerald-200 hover:shadow-md hover:border-emerald-400 transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-900 text-[10px] sm:text-xs font-black uppercase tracking-wider">Converted Clients</p>
                <h2 className="text-2xl sm:text-3xl font-black text-emerald-950 mt-1">{k.converted_customers}</h2>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shrink-0">
                <UserCheck size={20} />
              </div>
            </div>
          </div>

          {/* Card 3: Today's Follow-Ups (REMINDER OF THE DAY MODAL TRIGGER!) */}
          <div
            onClick={() => setShowTodayFollowupsModal(true)}
            className="bg-gradient-to-br from-amber-100/90 via-amber-50 to-orange-50/80 rounded-2xl p-4.5 shadow-sm border-2 border-amber-200 hover:shadow-md hover:border-amber-400 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-amber-950 text-[10px] sm:text-xs font-black uppercase tracking-wider">Total Follow Ups (Today's Reminder)</p>
                  <span className="text-[9px] font-extrabold bg-amber-200/90 text-amber-900 px-1.5 py-0.5 rounded-full">Reminder</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-amber-950 mt-1">{todayFollowupsListState.length}</h2>
                <p className="text-[10px] font-bold text-amber-800 mt-0.5 group-hover:underline">Click to view today's scheduled call reminders ↗</p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shrink-0">
                <Clock3 size={20} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Status Row Cards (4 Distinct Tinted Cards) ───────────────────────── */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Today's Visits (Cyan Theme) */}
          <div
            onClick={() => navigate("/sales/client-log")}
            className="bg-gradient-to-br from-sky-100/80 to-blue-50/60 rounded-2xl p-5 shadow-xs border-2 border-sky-200 flex flex-col justify-between cursor-pointer"
          >
            <div>
              <p className="text-sky-900 text-xs uppercase tracking-wider font-extrabold mb-1">Today's Visits</p>
              <h2 className="text-3xl font-black text-slate-900">{k.today_visits}</h2>
              <p className="text-slate-600 text-xs font-semibold mt-1">Target: {k.today_visits_target} Visits</p>
            </div>
            <div className="mt-4 w-full bg-sky-200/80 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-sky-500 to-blue-600 h-2 rounded-full transition-all duration-700"
                style={{ width: `${Math.min((k.today_visits / k.today_visits_target) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Attendance (Emerald Theme) */}
          <div
            onClick={() => navigate("/sales/attendance")}
            className="bg-gradient-to-br from-emerald-100/80 to-teal-50/60 rounded-2xl p-5 shadow-xs border-2 border-emerald-200 flex flex-col justify-between cursor-pointer"
          >
            <div>
              <p className="text-emerald-900 text-xs uppercase tracking-wider font-extrabold mb-1">Attendance</p>
              <h2 className={`text-2xl font-black ${k.attendance_status === "Present" ? "text-emerald-700" : "text-red-600"}`}>
                {k.attendance_status}
              </h2>
              {k.check_in_time && (
                <p className="text-slate-600 text-xs font-semibold mt-1 flex items-center gap-1">
                  <Clock3 size={13} className="text-emerald-700" /> Checked In {k.check_in_time}
                </p>
              )}
            </div>
          </div>

          {/* My Revenue Generated (REVENUE & INCENTIVE BREAKDOWN MODAL TRIGGER!) */}
          <div
            onClick={() => setShowRevenueIncentiveModal(true)}
            className="bg-gradient-to-br from-purple-100/80 to-fuchsia-50/60 rounded-2xl p-5 shadow-xs border-2 border-purple-200 flex flex-col justify-between cursor-pointer hover:border-purple-400 transition group"
          >
            <div>
              <div className="flex items-center justify-between">
                <p className="text-purple-900 text-xs uppercase tracking-wider font-extrabold mb-1">My Revenue Generated</p>
                <Award size={16} className="text-purple-600" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-purple-950 mt-1">{formatINR(revAchievedVal)}</h2>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[11px] font-black text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200">
                  Earned Incentive: {formatINR(totalIncentiveEarned)}
                </span>
                <span className="text-[10px] font-extrabold text-purple-800 group-hover:underline">Click list ↗</span>
              </div>
            </div>
          </div>

          {/* Reimbursements */}
          <div
            onClick={() => navigate("/sales/expenses")}
            className="bg-gradient-to-br from-rose-100/80 to-pink-50/60 rounded-2xl p-5 shadow-xs border-2 border-rose-200 flex flex-col justify-between cursor-pointer"
          >
            <div>
              <p className="text-rose-900 text-xs uppercase tracking-wider font-extrabold mb-1">Reimbursements</p>
              <h2 className="text-2xl font-black text-rose-700">{formatINR(k.expenses_pending_amount)}</h2>
              <p className="text-slate-600 text-xs font-semibold mt-1">Pending claim approvals</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Actions + Sales Target Overview ──────────────────────────── */}
      {!loading && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-teal-50/90 via-emerald-50/40 to-slate-50 rounded-3xl p-5 sm:p-6 shadow-sm border-2 border-teal-200/90 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-teal-950 text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-600" /> Quick Actions
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    onClick={() => {
                      if (action.isDirectModal) {
                        setIsAddLeadModalOpen(true);
                      } else {
                        navigate(action.path, { state: { activeTab: action.activeTab } });
                      }
                    }}
                    className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white border-2 border-teal-200/80 hover:border-teal-500 hover:shadow-md hover:-translate-y-0.5 transition cursor-pointer group shadow-2xs"
                  >
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${action.bg} group-hover:scale-110 transition-transform shadow-xs`}>
                      <Icon size={20} className={action.color} />
                    </div>
                    <span className="text-xs text-slate-800 font-extrabold text-center mt-2 leading-tight">{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sales Target Overview */}
          <div className="bg-gradient-to-br from-indigo-50/90 via-blue-50/40 to-slate-50 rounded-3xl p-5 sm:p-6 shadow-sm border-2 border-indigo-200/90 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="font-black text-indigo-950 text-base flex items-center gap-2">
                <Target size={20} className="text-indigo-600" /> Sales Target Overview
              </h2>
              <span className="text-[10px] font-black text-indigo-900 bg-indigo-100/90 px-2.5 py-1 rounded-full border border-indigo-200">
                🎯 Target Fixed by Manager: ₹{Number(managerTarget.revenueTarget || 500000).toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex justify-around items-center py-2 flex-wrap gap-4">
              <CircularChart
                pct={revAchievementPct}
                color="#6366f1"
                label="Revenue"
                sublabel={`${formatINR(revAchievedVal)} / ${formatINR(revTargetVal)}`}
              />
              <CircularChart
                pct={k.visits_pct || 0}
                color="#14b8a6"
                label="Visits"
                sublabel={`${k.visits_done ?? 0} / ${k.visits_target ?? 8}`}
              />
              <CircularChart
                pct={k.lead_conversion_pct || 0}
                color="#f59e0b"
                label="Lead Conversion"
                sublabel={`${k.converted_leads ?? 0} / ${managerTarget.dealsTarget || 10}`}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Perfectly Aligned Grid with Vivid Colorful Cards ── */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Today's Schedule */}
          <div className="bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-slate-50 rounded-3xl p-5 sm:p-6 shadow-sm border-2 border-emerald-200/90 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-emerald-950 text-base flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" /> Today's Schedule
              </h2>
              <button onClick={() => navigate("/sales/visits")} className="text-xs text-emerald-700 font-extrabold hover:underline flex items-center gap-1">
                View Calendar <ChevronRight size={14} />
              </button>
            </div>
            <div className="space-y-2.5">
              {(k.today_schedule || MOCK_KPIS.today_schedule).map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-white border border-emerald-100 shadow-2xs">
                  <div>
                    <p className="font-black text-slate-900 text-xs sm:text-sm">{s.customer}</p>
                    <p className="text-xs text-slate-500 font-semibold">{s.type}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-slate-700 font-black">{s.time}</span>
                    <StatusBadge status={s.status} />
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate("/sales/visits")}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Plus size={14} /> Add New Visit
            </button>
          </div>

          {/* My To Do Tasks */}
          <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-slate-50 rounded-3xl p-5 sm:p-6 shadow-sm border-2 border-amber-200/90 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-amber-950 text-base flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-amber-600" /> My To Do Tasks
              </h2>
              <button onClick={() => navigate("/sales/todo")} className="text-xs text-amber-800 font-extrabold hover:underline">
                View All
              </button>
            </div>

            {/* Add Todo Input */}
            <div className="flex gap-2">
              <input
                value={newTodo}
                onChange={e => setNewTodo(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTodo()}
                placeholder="Add new task..."
                className="flex-1 text-xs sm:text-sm border border-amber-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-amber-500 font-semibold text-slate-900"
              />
              <button
                onClick={addTodo}
                disabled={todoLoading}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition font-extrabold text-xs disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {todoLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {todos.slice(0, 4).map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center gap-3 p-2.5 rounded-2xl bg-white border border-amber-100 shadow-2xs hover:bg-amber-50/50 transition cursor-pointer group"
                  onClick={() => toggleTodo(todo.id, todo.is_completed)}
                >
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 border-2 transition ${todo.is_completed ? "bg-amber-500 border-amber-500" : "border-slate-300 group-hover:border-amber-500"}`}>
                    {todo.is_completed && <CheckSquare size={12} className="text-white" />}
                  </div>
                  <span className={`flex-1 text-xs sm:text-sm font-bold ${todo.is_completed ? "line-through text-slate-400" : "text-slate-900"}`}>
                    {todo.title}
                  </span>
                  <PriorityBadge p={todo.is_completed ? "Completed" : (todo.priority || "Medium")} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 1: REMINDER OF THE DAY (TODAY'S SCHEDULED FOLLOW-UPS LIST) ── */}
      {showTodayFollowupsModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 space-y-6 shadow-2xl border border-slate-200 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-amber-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-sm">
                  <Clock3 size={22} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                    🗓️ Scheduled Follow-Ups Call Reminders (Today's Reminder)
                  </h2>
                  <p className="text-xs text-amber-700 font-extrabold mt-0.5">
                    {formatDate(new Date())} • {todayFollowupsListState.length} Pending Call Reminders Scheduled Today
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTodayFollowupsModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* List of Today's Scheduled Follow-up Calls */}
            <div className="overflow-y-auto flex-1 min-h-0 space-y-3 pr-1">
              {todayFollowupsListState.length === 0 ? (
                <div className="p-10 text-center text-slate-500 bg-amber-50/50 rounded-2xl border border-amber-100">
                  <Clock3 size={32} className="mx-auto text-amber-400 mb-2" />
                  <p className="text-sm font-bold text-slate-800">No Follow-Up Calls Scheduled for Today!</p>
                  <p className="text-xs text-slate-500 mt-1">You have completed all reminders for today or none were scheduled.</p>
                </div>
              ) : (
                todayFollowupsListState.map((f, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-gradient-to-r from-amber-50/80 to-orange-50/40 border border-amber-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white uppercase tracking-wider">
                          📞 Call Reminder #{idx + 1}
                        </span>
                        <span className="text-xs font-black text-amber-900">⏰ {f.scheduledTime || f.follow_up_time || "10:30 AM"}</span>
                      </div>
                      <h3 className="text-base font-black text-slate-900">{f.company || f.client_name || "Lead Client"}</h3>
                      <p className="text-xs font-bold text-slate-600">
                        👤 {f.person || f.contact_person || "Contact Person"} • 📞 {f.phone || f.mobile || "Phone N/A"}
                      </p>
                      {f.remark && (
                        <p className="text-xs text-slate-700 bg-white p-2 rounded-xl border border-amber-200/60 font-medium italic mt-1">
                          " {f.remark} "
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {f.phone && (
                        <a
                          href={`tel:${f.phone}`}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 transition shadow-2xs"
                        >
                          <Phone size={14} /> Call Client
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setShowTodayFollowupsModal(false);
                          navigate("/sales/leads", { state: { activeTab: "followups" } });
                        }}
                        className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs flex items-center gap-1.5 transition shadow-2xs"
                      >
                        <ExternalLink size={14} /> View in Follow-Ups Workspace
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: MY REVENUE GENERATED & EXECUTIVE INCENTIVE BREAKDOWN ── */}
      {showRevenueIncentiveModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 space-y-6 shadow-2xl border border-slate-200 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-purple-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-sm">
                  <Award size={22} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                    💰 My Revenue Generated & Executive Incentive Breakdown
                  </h2>
                  <p className="text-xs text-purple-700 font-extrabold mt-0.5">
                    Calculated for Executive {userName} ({userEmpCode || "Sales Executive"})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRevenueIncentiveModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Total Summary Cards Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-100 via-purple-50 to-indigo-50 border-2 border-purple-200">
                <p className="text-xs font-black text-purple-900 uppercase tracking-wider">Total Revenue Generated for Company</p>
                <h3 className="text-2xl sm:text-3xl font-black text-purple-950 mt-1">{formatINR(revAchievedVal)}</h3>
                <p className="text-[11px] font-bold text-slate-600 mt-0.5">Closed converted customer deals</p>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-100 via-emerald-50 to-teal-50 border-2 border-emerald-200">
                <p className="text-xs font-black text-emerald-900 uppercase tracking-wider">Total Executive Incentive Earned (5% Commission)</p>
                <h3 className="text-2xl sm:text-3xl font-black text-emerald-950 mt-1">{formatINR(totalIncentiveEarned)}</h3>
                <p className="text-[11px] font-bold text-emerald-800 mt-0.5">🎉 Standard 5% incentive calculated per closed deal</p>
              </div>
            </div>

            {/* Converted Customers Table with Revenue & Incentive Columns */}
            <div className="overflow-y-auto flex-1 min-h-0 border border-slate-100 rounded-2xl">
              {myCustomersList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm font-semibold">
                  No converted customer deals recorded yet. Convert leads or follow-ups to generate revenue & earn incentives!
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-purple-50/80 text-purple-900 uppercase font-black tracking-wider border-b border-purple-100">
                      <th className="py-3 px-4">Customer Account</th>
                      <th className="py-3 px-4">Contact Person</th>
                      <th className="py-3 px-4">City</th>
                      <th className="py-3 px-4">Deal Amount Generated</th>
                      <th className="py-3 px-4 text-emerald-800">Executive Incentive (5%)</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                    {myCustomersList.map((c, i) => {
                      const valStr = c.contractValue || c.value || c.revenue || c.budget || "450000";
                      const valNum = parseInt(String(valStr).replace(/[^0-9]/g, "")) || 450000;
                      const incNum = Math.round(valNum * 0.05);

                      return (
                        <tr key={i} className="hover:bg-purple-50/40 transition">
                          <td className="py-3 px-4 font-black text-slate-900">{c.name || c.company || "Customer"}</td>
                          <td className="py-3 px-4">
                            <div>{c.person || c.contact_person || "Contact Person"}</div>
                            <div className="text-[10px] text-slate-400">{c.phone || c.mobile || "—"}</div>
                          </td>
                          <td className="py-3 px-4">{c.city || "Chennai"}</td>
                          <td className="py-3 px-4 font-black text-purple-950">{formatINR(valNum)}</td>
                          <td className="py-3 px-4 font-black text-emerald-700 bg-emerald-50/60">{formatINR(incNum)}</td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-200">
                              ● {c.status || "Active Customer"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── DIRECT ADD LEAD MODAL FROM QUICK ACTIONS ── */}
      {isAddLeadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-auto max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddLeadModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-teal-600" /> Create / Add New Prospect Lead
                  </h3>
                  <p className="text-xs font-semibold text-teal-600">Quick Action • Sourced by {userName}</p>
                </div>
              </div>
            </div>

            {/* Form Content */}
            <form onSubmit={handleAddLeadSubmit} className="space-y-5 text-xs sm:text-sm font-semibold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-800 font-extrabold block mb-1.5">Company / Lead Name (*Required)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Feathers Software Solution"
                    value={addLeadForm.company}
                    onChange={(e) => setAddLeadForm({ ...addLeadForm, company: e.target.value })}
                    className="w-full border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white font-semibold text-sm transition"
                  />
                </div>

                <div>
                  <label className="text-slate-800 font-extrabold block mb-1.5">Point of Contact Person (*Required)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh Kumar (Managing Director)"
                    value={addLeadForm.person}
                    onChange={(e) => setAddLeadForm({ ...addLeadForm, person: e.target.value })}
                    className="w-full border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white font-semibold text-sm transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-800 font-extrabold block mb-1.5">Phone Number (*Required)</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 9876543210"
                    value={addLeadForm.phone}
                    onChange={(e) => setAddLeadForm({ ...addLeadForm, phone: e.target.value })}
                    className="w-full border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white font-semibold text-sm transition"
                  />
                </div>

                <div>
                  <label className="text-slate-800 font-extrabold block mb-1.5">Email Address</label>
                  <input
                    type="email"
                    placeholder="contact@company.com"
                    value={addLeadForm.email}
                    onChange={(e) => setAddLeadForm({ ...addLeadForm, email: e.target.value })}
                    className="w-full border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white font-semibold text-sm transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-800 font-extrabold block mb-1.5">Address / City Details</label>
                <input
                  type="text"
                  placeholder="e.g. Guindy Industrial Estate, Chennai"
                  value={addLeadForm.city}
                  onChange={(e) => setAddLeadForm({ ...addLeadForm, city: e.target.value })}
                  className="w-full border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white font-semibold text-sm transition"
                />
              </div>

              <div>
                <label className="text-slate-800 font-extrabold block mb-1.5">Remarks</label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Client needs multi-device GPS tracking software for 30 field executives & automated visit reports..."
                  value={addLeadForm.notes}
                  onChange={(e) => setAddLeadForm({ ...addLeadForm, notes: e.target.value })}
                  className="w-full border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white font-medium text-sm transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="text-slate-800 font-extrabold block mb-1.5">Lead Category</label>
                  <select
                    value={addLeadForm.category}
                    onChange={(e) => setAddLeadForm({ ...addLeadForm, category: e.target.value })}
                    className="w-full border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white font-extrabold text-sm cursor-pointer transition"
                  >
                    <option value="Hot">🔥 HOT Lead</option>
                    <option value="Warm">⚡ WARM Lead</option>
                    <option value="Cold">❄️ COLD Lead</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-800 font-extrabold block mb-1.5">Deal Value (INR)</label>
                  <input
                    type="text"
                    placeholder="₹4,50,000"
                    value={addLeadForm.value}
                    onChange={(e) => setAddLeadForm({ ...addLeadForm, value: e.target.value })}
                    className="w-full border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white font-extrabold text-sm transition"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-extrabold text-xs sm:text-sm shadow-md shadow-teal-600/30 transition cursor-pointer"
                >
                  Create & Save Lead 🎉
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <Loader2 size={36} className="animate-spin text-teal-500" />
            <p className="text-sm">Loading your dashboard...</p>
          </div>
        </div>
      )}

      {/* Leads Detail Modal */}
      {showLeadsModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 space-y-6 shadow-2xl border border-slate-200 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">Total Leads Details</h2>
                <p className="text-xs text-slate-400 font-semibold">Segmented overview of your sourced leads</p>
              </div>
              <button
                onClick={() => setShowLeadsModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Segment Tabs */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-50 rounded-2xl">
              <button
                type="button"
                onClick={() => setLeadsModalTab("Hot")}
                className={`py-3 px-4 rounded-xl text-xs font-black transition cursor-pointer text-center ${
                  leadsModalTab === "Hot"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-emerald-700 hover:bg-emerald-50"
                }`}
              >
                🟢 Hot ({allLeadsList.filter(l => l.category === "Hot" || l.lead_priority === "Hot" || l.priority === "High").length})
              </button>
              <button
                type="button"
                onClick={() => setLeadsModalTab("Warm")}
                className={`py-3 px-4 rounded-xl text-xs font-black transition cursor-pointer text-center ${
                  leadsModalTab === "Warm"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-amber-700 hover:bg-amber-50"
                }`}
              >
                ⚡ Warm ({allLeadsList.filter(l => l.category === "Warm" || l.lead_priority === "Warm" || l.priority === "Medium").length})
              </button>
              <button
                type="button"
                onClick={() => setLeadsModalTab("Cold")}
                className={`py-3 px-4 rounded-xl text-xs font-black transition cursor-pointer text-center ${
                  leadsModalTab === "Cold"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-rose-700 hover:bg-rose-50"
                }`}
              >
                🔴 Cold ({allLeadsList.filter(l => l.category === "Cold" || l.lead_priority === "Cold" || l.priority === "Low").length})
              </button>
            </div>

            {/* Leads Table */}
            <div className="overflow-y-auto flex-1 min-h-0 border border-slate-100 rounded-2xl">
              {(() => {
                const filtered = allLeadsList.filter(l => {
                  const cat = (l.category || l.lead_priority || l.priority || "Warm").toLowerCase();
                  if (leadsModalTab === "Hot") return cat === "hot" || cat === "high";
                  if (leadsModalTab === "Warm") return cat === "warm" || cat === "medium";
                  return cat === "cold" || cat === "low";
                });

                if (filtered.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-400 text-sm font-semibold">
                      No leads found in this segment.
                    </div>
                  );
                }

                return (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 uppercase font-black tracking-wider border-b border-slate-100">
                        <th className="py-3 px-4">Company</th>
                        <th className="py-3 px-4">Contact Person</th>
                        <th className="py-3 px-4">City</th>
                        <th className="py-3 px-4">Product</th>
                        <th className="py-3 px-4">Value</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                      {filtered.map((l, i) => (
                        <tr key={i} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-black">{l.company_name || l.company}</td>
                          <td className="py-3 px-4">
                            <div>{l.contact_person || l.person}</div>
                            <div className="text-[10px] text-slate-400">{l.mobile || l.phone}</div>
                          </td>
                          <td className="py-3 px-4">{l.city || "—"}</td>
                          <td className="py-3 px-4">{l.product_name || l.product || "—"}</td>
                          <td className="py-3 px-4 text-slate-900 font-black">
                            {formatINR(l.expected_value || l.value || 450000)}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-black border border-slate-200">
                              {l.status || "New"}
                            </span>
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
    </div>
  );
}