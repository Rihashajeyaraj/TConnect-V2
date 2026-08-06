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
} from "lucide-react";
import { salesDashboardAPI, todoAPI, notificationAPI, crmAPI } from "../../services/api.js";
import { exportToPDF, exportToExcel, exportToCSV, getFormattedTodayDate } from "../../utils/exportUtils.js";
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

const MOCK_TODOS = [];
const MOCK_NOTIFICATIONS = [];

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
    { label: "Add Lead", icon: UserPlus, color: "text-teal-600", bg: "bg-teal-50", isDirectModal: true },
    { label: "Schedule Visit", icon: Calendar, color: "text-emerald-600", bg: "bg-emerald-50", path: "/sales/client-log" },
    { label: "Add Follow Up", icon: Clock, color: "text-purple-600", bg: "bg-purple-50", path: "/sales/client-log" },
    { label: "GPS Check In", icon: MapPin, color: "text-blue-600", bg: "bg-blue-50", path: "/sales/attendance" },
    { label: "GPS Check Out", icon: Navigation, color: "text-rose-600", bg: "bg-rose-50", path: "/sales/attendance" },
    { label: "Submit Expense", icon: DollarSign, color: "text-amber-600", bg: "bg-amber-50", path: "/sales/expenses" },
    { label: "Client Log", icon: FileText, color: "text-teal-600", bg: "bg-teal-50", path: "/sales/client-log" },
    { label: "My Leads", icon: Users, color: "text-indigo-600", bg: "bg-indigo-50", path: "/sales/leads" },
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

      const todayFormatted = formatDate(new Date());

      // Helper check for ownership
      const matchesUser = (item) => isItemOwnedByUser(item, currentUser);

      // Filter My Leads strictly
      const myLeads = leads.filter(matchesUser);
      const totalMyLeads = myLeads.length;

      // Filter My Customers strictly
      const myCustomers = customers.filter(matchesUser);

      // Converted count
      const convertedCount = myLeads.filter(
        (l) => l.status === "Converted to Customer" || l.status === "Converted"
      ).length + myCustomers.length;

      const conversionPct = totalMyLeads > 0 ? Math.round((convertedCount / totalMyLeads) * 100) : 0;

      // Revenue generated by this executive
      const totalSeRevenue = myCustomers.reduce((sum, cust) => {
        const valStr = cust.contractValue || cust.value || cust.revenue || "0";
        const val = parseInt(String(valStr).replace(/[^0-9]/g, "")) || 0;
        return sum + val;
      }, 0);

      // My Followups
      const myFollowups = followups.filter(matchesUser);
      const todayFollowupsList = myFollowups.filter((f) => {
        const fDate = f.scheduledDate || f.date || f.createdAt || "";
        return fDate.includes(todayFormatted) || fDate.includes(new Date().toISOString().slice(0, 10));
      });

      // My Visits
      const myVisits = visits.filter(matchesUser);
      const todayVisitsList = myVisits.filter((v) => {
        const vDate = v.date || v.visitDate || v.scheduledDate || "";
        return vDate.includes(todayFormatted) || vDate.includes(new Date().toISOString().slice(0, 10));
      });

      // My Expenses
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

      const hotCount = myLeads.filter(l => l.category === "Hot").length;

      // My Attendance
      const myAtt = attLogs.filter(matchesUser);
      const todayAtt = myAtt.find(a => (a.date || "").includes(todayFormatted) || (a.date || "").includes(new Date().toISOString().slice(0, 10)));

      const dynamicKpis = {
        my_leads: totalMyLeads,
        converted_customers: convertedCount,
        my_generated_revenue: totalSeRevenue,
        today_followups: todayFollowupsList.length,
        today_visits: todayVisitsList.length,
        today_visits_target: 8,
        attendance_status: todayAtt ? "Present" : "Absent",
        check_in_time: todayAtt ? (todayAtt.loginTime || todayAtt.check_in || "Checked In") : null,
        hot_leads_count: hotCount,
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
  }, [userEmail, userName, userEmpCode, userId]);

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

      // Notify Manager
      const notifs = JSON.parse(localStorage.getItem("tc_app_notifications") || "[]");
      const smNotif = {
        id: `notif_sm_${Date.now()}`,
        recipientRole: "manager",
        title: `🆕 New Lead Added by ${userName}`,
        message: `${userName} added new lead "${newLead.company}" (${newLead.category} Lead) from Quick Actions.`,
        time: "Just now",
        read: false,
        type: "Lead",
      };
      localStorage.setItem("tc_app_notifications", JSON.stringify([smNotif, ...notifs]));
    } catch (e) { }

    setIsAddLeadModalOpen(false);
    setAddLeadForm({ company: "", person: "", phone: "", email: "", city: "", category: "Hot", value: "₹4,50,000", notes: "" });
    showToast(`🎉 New Lead "${newLead.company}" created successfully!`, "success");
    // Refresh dashboard metrics so hot leads count updates immediately
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
            <option value="Add Today">📍 Add Today</option>
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
                      { Metric: 'Revenue This Month', Value: k.revenue_this_month },
                      { Metric: 'Today Visits', Value: k.today_visits },
                      { Metric: 'Pending Followups', Value: k.pending_followups },
                      { Metric: 'Target Achievement', Value: `${k.target_achievement_pct}%` },
                      { Metric: 'Date', Value: getFormattedTodayDate() },
                    ]
                    exportToPDF(`TConnect_Sales_Report_${new Date().toISOString().slice(0, 10)}`, 'TConnect Executive Sales Report', exportRows)
                    setShowExportMenu(false)
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
                      { Metric: 'Revenue This Month', Value: k.revenue_this_month },
                      { Metric: 'Today Visits', Value: k.today_visits },
                      { Metric: 'Pending Followups', Value: k.pending_followups },
                      { Metric: 'Target Achievement', Value: `${k.target_achievement_pct}%` },
                      { Metric: 'Date', Value: getFormattedTodayDate() },
                    ]
                    exportToExcel(`TConnect_Sales_Report_${new Date().toISOString().slice(0, 10)}.xls`, exportRows)
                    setShowExportMenu(false)
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
                      { Metric: 'Revenue This Month', Value: k.revenue_this_month },
                      { Metric: 'Today Visits', Value: k.today_visits },
                      { Metric: 'Pending Followups', Value: k.pending_followups },
                      { Metric: 'Target Achievement', Value: `${k.target_achievement_pct}%` },
                      { Metric: 'Date', Value: getFormattedTodayDate() },
                    ]
                    exportToCSV(`TConnect_Sales_Report_${new Date().toISOString().slice(0, 10)}.csv`, exportRows)
                    setShowExportMenu(false)
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
            className="p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
            title="Refresh data"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin text-teal-500" : ""} />
          </button>
        </div>
      </div>

      {/* ── Top Distinct Vivid Colored KPI Cards (4) ────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
          {Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Card 1: My Leads (Vivid Blue Gradient) */}
          <div
            onClick={() => navigate("/sales/leads")}
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

          {/* Card 3: 🔥 Active Hot Leads (Moved to 1st Row!) */}
          <div
            onClick={() => navigate("/sales/leads")}
            className="bg-gradient-to-br from-rose-100/90 via-rose-50 to-amber-50/80 rounded-2xl p-4.5 shadow-sm border-2 border-rose-200 hover:shadow-md hover:border-rose-400 transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-rose-950 text-[10px] sm:text-xs font-black uppercase tracking-wider">🔥 Active Hot Leads</p>
                <h2 className="text-2xl sm:text-3xl font-black text-rose-700 mt-1">{k.hot_leads_count ?? 0}</h2>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-md shrink-0">
                <Target size={20} />
              </div>
            </div>
          </div>

          {/* Card 4: Today's Follow-Ups (Vivid Amber Gradient) */}
          <div
            onClick={() => navigate("/sales/client-log")}
            className="bg-gradient-to-br from-amber-100/90 via-amber-50 to-orange-50/80 rounded-2xl p-4.5 shadow-sm border-2 border-amber-200 hover:shadow-md hover:border-amber-400 transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-950 text-[10px] sm:text-xs font-black uppercase tracking-wider">Today's Follow-Ups</p>
                <h2 className="text-2xl sm:text-3xl font-black text-amber-950 mt-1">{k.today_followups || k.pending_followups}</h2>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shrink-0">
                <ClipboardList size={20} />
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

          {/* My Revenue Generated (Moved to 2nd Row!) */}
          <div
            onClick={() => navigate("/sales/customers")}
            className="bg-gradient-to-br from-purple-100/80 to-fuchsia-50/60 rounded-2xl p-5 shadow-xs border-2 border-purple-200 flex flex-col justify-between cursor-pointer"
          >
            <div>
              <p className="text-purple-900 text-xs uppercase tracking-wider font-extrabold mb-1">My Revenue Generated</p>
              <h2 className="text-2xl sm:text-3xl font-black text-purple-950 mt-1">{formatINR(k.my_generated_revenue || k.revenue_this_month)}</h2>
              <p className="text-slate-600 text-xs font-semibold mt-1">Total revenue closed</p>
            </div>
          </div>

          {/* Reimbursements (Renamed from Expenses Pending!) */}
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

          {/* Quick Actions (Vivid Colorful Card) */}
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
                        navigate(action.path);
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

          {/* Sales Target Overview (Vivid Colorful Card) */}
          <div className="bg-gradient-to-br from-indigo-50/90 via-blue-50/40 to-slate-50 rounded-3xl p-5 sm:p-6 shadow-sm border-2 border-indigo-200/90 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-indigo-950 text-base flex items-center gap-2">
                <Target size={20} className="text-indigo-600" /> Sales Target Overview
              </h2>
            </div>
            <div className="flex justify-around items-center py-2 flex-wrap gap-4">
              <CircularChart
                pct={k.revenue_achievement_pct || 0}
                color="#6366f1"
                label="Revenue"
                sublabel={`${formatINR(k.revenue_this_month || k.my_generated_revenue || 0)} / ${formatINR(k.revenue_target || 500000)}`}
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
                sublabel={`${k.converted_leads ?? 0} / ${k.total_leads_for_conversion ?? 0}`}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Perfectly Aligned Grid with Vivid Colorful Cards ── */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Today's Schedule (Vivid Emerald Tinted Card) */}
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

          {/* My To Do Tasks (Vivid Amber Tinted Card) */}
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

      {/* ── DIRECT ADD LEAD MODAL FROM QUICK ACTIONS (With Only Back Button as requested!) ── */}
      {isAddLeadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-auto max-h-[90vh] overflow-y-auto">
            {/* Modal Header with ONLY Back Button! */}
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
    </div>
  );
}

// ── Constants ──────────────────────────────────────────────────────────────────

const ACTIVITY_COLORS = {
  visit: "bg-blue-500",
  lead: "bg-emerald-500",
  expense: "bg-amber-500",
  followup: "bg-purple-500",
};

const NOTIF_COLORS = {
  lead: "bg-blue-500",
  visit: "bg-teal-500",
  expense: "bg-emerald-500",
  info: "bg-slate-400",
};