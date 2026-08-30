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
import { salesDashboardAPI, todoAPI, notificationAPI, crmAPI, hrmsAPI, salesAPI, attendanceAPI, customerAPI, visitAPI, expenseAPI, pipelineAPI, settingsAPI } from "../../services/api.js";
import { exportToPDF, exportToExcel, exportToCSV, getFormattedTodayDate } from "../../utils/exportUtils.js";
import { calculateWorkHours } from "./Attendance.jsx";
import { useToast } from "../../common/ToastContext.jsx";
import { formatDate } from "../../utils/dateUtils.js";
import useCurrentUser from "../../hooks/useCurrentUser.js";
import { isItemOwnedByUser, filterUserItems } from "../../utils/userScope.js";
import { normalizePhoneNumber } from "../../utils/formatUtils.js";
import LocationPickerModal from "../../common/LocationPickerModal.jsx";
import Attendance from "./Attendance.jsx";
import Leads from "./Leads.jsx";
import Expenses from "./Expenses.jsx";
import ClientLog from "./ClientLog.jsx";
import Todo from "./Todo.jsx";

// ── Mock Data Fallbacks ────────────────────────────────────────────────────────

const MOCK_KPIS = {
  assigned_leads: 0,
  converted_customers: 0,
  revenue_this_month: 0,
  pending_followups: 0,
  today_visits: 0,
  today_visits_target: 8,
  attendance_status: "Not Marked",
  check_in_time: null,
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

  const currentUser = useCurrentUser();
  const userEmail = (currentUser.email || "").toLowerCase().trim();
  const userName = currentUser.name || currentUser.full_name || userEmail.split("@")[0] || "Sales Executive";
  const userEmpCode = currentUser.employee_code || currentUser.employee_id || "";
  const userId = currentUser.id || currentUser.user_id || "";

  // ── Helper to read cache ──────────────────────────────────────────────────────
  const getCachedValue = (key, fallback) => {
    if (!userEmail) return fallback;
    try {
      const cached = localStorage.getItem(`tc_se_dashboard_cache_${userEmail}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed[key] !== undefined ? parsed[key] : fallback;
      }
    } catch (e) {}
    return fallback;
  };

  // ── State ────────────────────────────────────────────────────────────────────
  const [kpis, setKpis] = useState(() => getCachedValue("kpis", null));
  const [todos, setTodos] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(() => !getCachedValue("kpis", null));
  const [todoLoading, setTodoLoading] = useState(false);
  const [newTodo, setNewTodo] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => localStorage.getItem("tc_dashboard_date_filter") || "Today");
  const [customDateVal, setCustomDateVal] = useState(() => localStorage.getItem("tc_dashboard_custom_date") || new Date().toISOString().slice(0, 10));
  const [managerTarget, setManagerTarget] = useState(() => getCachedValue("managerTarget", { revenueTarget: 500000, dealsTarget: 10, setBy: 'Sales Manager' }));
  const [refreshing, setRefreshing] = useState(false);
  const [todayAttRecord, setTodayAttRecord] = useState(null); // null = not yet fetched

  const handleDateFilterChange = (val) => {
    setSelectedMonth(val);
    localStorage.setItem("tc_dashboard_date_filter", val);
  };

  const handleCustomDateChange = (val) => {
    setCustomDateVal(val);
    localStorage.setItem("tc_dashboard_custom_date", val);
  };
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showLeadsModal, setShowLeadsModal] = useState(false);
  const [leadsModalTab, setLeadsModalTab] = useState("Hot");
  const [allLeadsList, setAllLeadsList] = useState(() => getCachedValue("allLeadsList", []));
  const [myCustomersList, setMyCustomersList] = useState(() => getCachedValue("myCustomersList", []));
  const [todayFollowupsListState, setTodayFollowupsListState] = useState(() => getCachedValue("todayFollowupsListState", []));

  // Modals state: Reminder of the Day (Today Followups) & Revenue Incentive Modal
  const [showTodayFollowupsModal, setShowTodayFollowupsModal] = useState(false);
  const [showRevenueIncentiveModal, setShowRevenueIncentiveModal] = useState(false);
  const [incentiveRate, setIncentiveRate] = useState(5.0);

  // Quick Action Modal State (Direct Add Lead Modal on Dashboard!)
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isFollowUpsModalOpen, setIsFollowUpsModalOpen] = useState(false);
  const [isScheduleVisitModalOpen, setIsScheduleVisitModalOpen] = useState(false);
  const [isOpportunitiesModalOpen, setIsOpportunitiesModalOpen] = useState(false);
  const [isSubmitExpenseModalOpen, setIsSubmitExpenseModalOpen] = useState(false);
  const [isClientLogModalOpen, setIsClientLogModalOpen] = useState(false);
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [isMyLeadsModalOpen, setIsMyLeadsModalOpen] = useState(false);
  const [addLeadForm, setAddLeadForm] = useState({
    company: "",
    product: "",
    customProduct: "",
    person: "",
    phone: "",
    email: "",
    city: "",
    category: "Hot",
    priority: "High",
    value: "₹0",
    source: "Field Research (SE)",
    targetList: "Leads", // "Leads" | "Opportunities"
    notes: "",
    latitude: null,
    longitude: null,
    landmark: "",
    full_address: "",
  });

  const [productsList, setProductsList] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const productOptions = productsList;

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await settingsAPI.getProducts();
        if (res?.data?.products) {
          const activeProds = res.data.products
            .filter((p) => p.status === 'Active' || p.status === undefined)
            .map((p) => p.name || p.product_name || p.productName);
          if (activeProds.length > 0) {
            setProductsList(activeProds);
          }
        }
      } catch (err) {
        console.warn("Failed to load company products inside Dashboard:", err);
      }
    }
    fetchProducts();
  }, []);

  // ── Quick Actions Setup ──────────────────────────────────────────────────────
  const QUICK_ACTIONS = [
    { label: "Mark Attendance 📹", icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50", actionId: "attendance" },
    { label: "Add Lead 🪪", icon: UserPlus, color: "text-teal-600", bg: "bg-teal-50", actionId: "add_lead" },
    { label: "Follow-Ups 📅", icon: Clock3, color: "text-purple-600", bg: "bg-purple-50", actionId: "followups" },
    { label: "Schedule Visit 📍", icon: Calendar, color: "text-blue-600", bg: "bg-blue-50", actionId: "schedule_visit" },
    { label: "Opportunities 🎯", icon: Target, color: "text-orange-600", bg: "bg-orange-50", actionId: "opportunities" },
    { label: "Submit Expense 💰", icon: DollarSign, color: "text-amber-600", bg: "bg-amber-50", actionId: "submit_expense" },
    { label: "Client Log 📑", icon: FileText, color: "text-teal-600", bg: "bg-teal-50", actionId: "client_log" },
    { label: "My Leads 👥", icon: Users, color: "text-indigo-600", bg: "bg-indigo-50", actionId: "my_leads" },
  ];

  // ── Fetch Today Attendance from Supabase (Source of Truth) ───────────────────
  const fetchTodayAttendance = useCallback(async () => {
    try {
      const res = await attendanceAPI.getLogs();
      const logs = Array.isArray(res) ? res : (res?.data || []);
      const todayISO = new Date().toISOString().slice(0, 10);
      const todayRecord = logs.find(a => {
        const d = String(a.attendance_date || a.date || a.created_at || "");
        return d.startsWith(todayISO);
      }) || null;
      setTodayAttRecord(todayRecord);
    } catch (err) {
      console.warn("Could not fetch today attendance:", err);
      setTodayAttRecord(null);
    }
  }, []);

  // ── Fetch & Compute Live Data (Strictly Isolated Per Executive) ───────────────
  const fetchAll = useCallback(async () => {
    try {
      // Fetch live data from backend APIs in parallel for instant display
      const [leadsRes, customersRes, visitsRes, followupsRes, expensesRes] = await Promise.allSettled([
        crmAPI.getLeads(),
        customerAPI.getCustomers(),
        visitAPI.getVisits(),
        crmAPI.getFollowups(),
        expenseAPI.getExpenses(),
      ]);

      let leads = [];
      if (leadsRes.status === 'fulfilled') {
        const raw = Array.isArray(leadsRes.value) ? leadsRes.value : (leadsRes.value?.data || []);
        if (raw.length > 0) {
          leads = raw.map((l) => {
            const rawStatus = (l.status || "NEW").toUpperCase();
            const statusMap = {
              "NEW": "New",
              "FOLLOW_UP": "Moved to Follow-ups",
              "VISIT_SCHEDULED": "Visit Scheduled",
              "CONVERTED": "Converted to Customer",
              "LOST": "Not Converted / Lost",
            };
            return {
              id: l.lead_id || l.id,
              leadNumber: l.lead_number || `LD-${String(l.lead_id || l.id || "").slice(-8).toUpperCase()}`,
              company: l.company_name || l.company || "Prospect Lead",
              person: l.contact_person || l.contact_name || "Point of Contact",
              phone: l.mobile || l.contact_phone || "",
              email: l.email || l.contact_email || "",
              city: l.city || "Chennai",
              product: l.product_name || l.product || "TwiteConnect CRM",
              product_name: l.product_name || l.product || "TwiteConnect CRM",
              category: l.category || "Warm",
              priority: l.priority || "Medium",
              status: statusMap[rawStatus] || l.status || "New",
              value: l.expected_value ? `₹${Number(l.expected_value).toLocaleString("en-IN")}` : "₹0",
              assignedTo: l.assigned_to || userName,
              assignedToEmail: l.assigned_to_email || userEmail,
              notes: l.notes || l.remarks || "",
              customerId: l.customer_id || null,
              source: l.source || "Supabase",
              latitude: l.latitude || null,
              longitude: l.longitude || null,
              full_address: l.address || null,
              createdAt: l.created_at ? formatDate(l.created_at) : formatDate(new Date()),
            };
          });
          localStorage.setItem("tc_sm_leads", JSON.stringify(leads));
        }
      }
      if (leads.length === 0) {
        leads = JSON.parse(localStorage.getItem("tc_sm_leads") || "[]");
      }

      let customers = [];
      if (customersRes.status === 'fulfilled') {
        const raw = Array.isArray(customersRes.value) ? customersRes.value : (customersRes.value?.data || []);
        if (raw.length > 0) {
          customers = raw;
          localStorage.setItem("tc_customer_accounts", JSON.stringify(customers));
        }
      }
      if (customers.length === 0) {
        customers = JSON.parse(localStorage.getItem("tc_customer_accounts") || "[]");
      }

      let visits = [];
      if (visitsRes.status === 'fulfilled') {
        const raw = Array.isArray(visitsRes.value) ? visitsRes.value : (visitsRes.value?.data || []);
        if (raw.length > 0) {
          visits = raw.map((v) => ({
            id: v.visit_id || v.id,
            customer: v.title || v.customer_name || "Client Account",
            client: v.title || v.customer_name || "Client Account",
            person: v.contact_person || v.contactPerson || "Point of Contact",
            phone: v.phone || "",
            location: v.location || v.address || "Chennai",
            date: v.scheduled_time ? formatDate(v.scheduled_time) : formatDate(new Date()),
            time: "10:00 AM",
            status: v.status === "COMPLETED" ? "Completed" : "Scheduled",
            purpose: v.purpose || "Site Visit & Demo",
            notes: v.remarks || v.notes || ""
          }));
          localStorage.setItem("tc_sales_visits", JSON.stringify(visits));
        }
      }
      if (visits.length === 0) {
        visits = JSON.parse(localStorage.getItem("tc_sales_visits") || "[]");
      }

      let followups = [];
      if (followupsRes.status === 'fulfilled') {
        const raw = Array.isArray(followupsRes.value) ? followupsRes.value : (followupsRes.value?.data || []);
        if (raw.length > 0) {
          followups = raw;
          localStorage.setItem("tc_sales_followups", JSON.stringify(followups));
        }
      }
      if (followups.length === 0) {
        followups = JSON.parse(localStorage.getItem("tc_sales_followups") || "[]");
      }

      let expenses = [];
      if (expensesRes.status === 'fulfilled') {
        const raw = Array.isArray(expensesRes.value) ? expensesRes.value : (expensesRes.value?.data || []);
        if (raw.length > 0) {
          expenses = raw;
          localStorage.setItem("tc_sales_expenses", JSON.stringify(expenses));
        }
      }
      if (expenses.length === 0) {
        expenses = JSON.parse(localStorage.getItem("tc_sales_expenses") || "[]");
      }

      const localTodos = JSON.parse(localStorage.getItem("tc_3d_todos") || "[]");

      // Calculate Date Scope based on selectedMonth / date filter
      const now = new Date();
      const todayISO = now.toISOString().slice(0, 10);
      const todayFormattedStr = formatDate(now);

      const matchesDate = (itemDate) => {
        if (!itemDate) return true;
        const str = String(itemDate);
        if (selectedMonth === "This Month") {
          const currentMonthPrefix = new Date().toISOString().slice(0, 7);
          const currentMonthSuffix = `/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`;
          return str.includes(currentMonthPrefix) || str.includes(currentMonthSuffix);
        }
        if (selectedMonth === "This Year") {
          const currentYearPrefix = new Date().getFullYear().toString();
          const currentYearSuffix = `/${currentYearPrefix}`;
          return str.includes(currentYearPrefix) || str.includes(currentYearSuffix);
        }
        if (selectedMonth === "Custom Date") {
          if (!customDateVal) return true;
          const customDateFormatted = formatDate(customDateVal);
          return str.includes(customDateVal) || str.includes(customDateFormatted);
        }
        // Default: Today
        return str.includes(todayISO) || str.includes(todayFormattedStr);
      };

      // Helper check for ownership
      const matchesUser = (item) => isItemOwnedByUser(item, currentUser);

      // Filter My Leads strictly (excluding converted leads)
      const myLeads = leads.filter((l) => {
        if (!matchesUser(l)) return false;
        const status = String(l.status || "").toLowerCase();
        return !status.includes("converted") && !status.includes("customer") && !status.includes("won");
      });
      const dateFilteredLeads = myLeads.filter(l => matchesDate(l.createdAt || l.date || l.created_at));
      const totalMyLeads = dateFilteredLeads.length;
      setAllLeadsList(dateFilteredLeads);

      // Filter My Customers strictly
      const myCustomers = customers.filter(matchesUser);
      const dateFilteredCustomers = myCustomers.filter(c => matchesDate(c.createdAt || c.date || c.created_at || c.createdTime));
      setMyCustomersList(dateFilteredCustomers);

      // Converted count (solely from customer list to avoid double counting)
      const convertedCount = dateFilteredCustomers.length;

      const conversionPct = totalMyLeads > 0 ? Math.round((convertedCount / totalMyLeads) * 100) : 0;

      // Real Revenue generated specifically by this Sales Executive
      const customerRevenue = dateFilteredCustomers.reduce((sum, cust) => {
        const valStr = cust.contractValue || cust.value || cust.revenue || cust.budget || "0";
        const val = typeof valStr === 'number' ? valStr : (parseFloat(String(valStr).replace(/[^\d.]/g, "")) || 0);
        return sum + val;
      }, 0);

      const convertedLeadsRevenue = dateFilteredLeads
        .filter((l) => l.status === "Converted to Customer" || l.status === "Converted" || l.status === "Closed Won")
        .reduce((sum, lead) => {
          const valStr = lead.value || lead.budget || lead.deal_value || "0";
          const val = typeof valStr === 'number' ? valStr : (parseFloat(String(valStr).replace(/[^\d.]/g, "")) || 0);
          return sum + val;
        }, 0);

      const totalSeRevenue = customerRevenue;

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

      // My Attendance — pulled from API state (todayAttRecord), not localStorage
      const isMarkedToday = !!todayAttRecord;
      const attStatus = isMarkedToday ? "Present" : "Not Marked";
      const attCheckInTime = isMarkedToday ? (todayAttRecord.check_in_time || todayAttRecord.clockIn || null) : null;
      const attCheckOutTime = isMarkedToday ? (todayAttRecord.check_out_time || todayAttRecord.clockOut || null) : null;
      const attWorkHours = isMarkedToday ? (todayAttRecord.total_working_hours || todayAttRecord.workHours || null) : null;

      const dynamicKpis = {
        my_leads: totalMyLeads,
        converted_customers: convertedCount,
        my_generated_revenue: totalSeRevenue,
        today_followups: todayFollowupsList.length,
        today_visits: todayVisitsList.length,
        today_visits_target: 8,
        attendance_status: attStatus,
        check_in_time: attCheckInTime,
        check_out_time: attCheckOutTime,
        work_hours: attWorkHours,
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

      // Cache current stats to localStorage for instant load on render
      if (userEmail) {
        try {
          const cacheData = {
            kpis: dynamicKpis,
            allLeadsList: dateFilteredLeads,
            myCustomersList: dateFilteredCustomers,
            todayFollowupsListState: todayFollowupsList
          };
          localStorage.setItem(`tc_se_dashboard_cache_${userEmail}`, JSON.stringify(cacheData));
        } catch (e) {
          console.warn("Failed to cache dashboard stats:", e);
        }
      }

    } catch (e) {
      console.error("Dashboard fetchAll error:", e);
      setTodos([]);
      setNotifications([]);
    }

    try {
      const targetRes = await salesAPI.getTargets();
      const targets = Array.isArray(targetRes) ? targetRes : (targetRes?.data || []);
      const myTarget = targets.find(t => String(t.executive_id) === String(userId) || String(t.executive_email) === String(userEmail)) || targets[0];
      if (myTarget) {
        const newTarget = {
          revenueTarget: myTarget.target_amount || 500000,
          dealsTarget: 10,
          setBy: myTarget.manager_name || 'Sales Manager'
        };
        setManagerTarget(newTarget);
        if (userEmail) {
          try {
            const cached = localStorage.getItem(`tc_se_dashboard_cache_${userEmail}`);
            const parsed = cached ? JSON.parse(cached) : {};
            parsed.managerTarget = newTarget;
            localStorage.setItem(`tc_se_dashboard_cache_${userEmail}`, JSON.stringify(parsed));
          } catch (err) {}
        }
      }
    } catch (err) {
      console.warn("Could not fetch sales targets:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userEmail, userName, userEmpCode, userId, selectedMonth, customDateVal, todayAttRecord]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Fetch attendance from Supabase on mount and listen for clock-in events
  useEffect(() => {
    fetchTodayAttendance();
    const handler = () => fetchTodayAttendance();
    window.addEventListener("tc:attendance-marked", handler);
    return () => window.removeEventListener("tc:attendance-marked", handler);
  }, [fetchTodayAttendance]);

  useEffect(() => {
    // Check local cache first
    try {
      const saved = localStorage.getItem("tc_se_profile");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.incentivePercentage !== undefined) {
          setIncentiveRate(Number(parsed.incentivePercentage));
        }
      }
    } catch (e) {}

    // Fetch live profile using "self" — backend resolves this to the authenticated user's real UUID
    hrmsAPI.getEmployeeById("self")
      .then((res) => {
        if (res && res.data && res.data.incentive_percentage !== undefined && res.data.incentive_percentage !== null) {
          setIncentiveRate(Number(res.data.incentive_percentage));
        }
      })
      .catch((err) => console.warn("Could not retrieve live incentive rate:", err));
  }, []);

  // ── Dashboard Direct Add Lead Submit Handler ─────────────────────────────────
  const handleAddLeadSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!addLeadForm.company.trim() || !addLeadForm.person.trim() || !addLeadForm.phone.trim()) {
      showToast("Please fill in Lead Name, Contact Person, and Phone Number!", "error");
      return;
    }

    setIsSubmitting(true);

    const selectedProd = addLeadForm.product === "custom" 
      ? (addLeadForm.customProduct?.trim() || "Custom Product/Service") 
      : (addLeadForm.product?.trim() || "TwiteConnect CRM");

    const lat = (addLeadForm.latitude != null && !isNaN(Number(addLeadForm.latitude))) ? Number(addLeadForm.latitude) : null;
    const lng = (addLeadForm.longitude != null && !isNaN(Number(addLeadForm.longitude))) ? Number(addLeadForm.longitude) : null;

    const payload = {
      company_name: addLeadForm.company.trim(),
      company: addLeadForm.company.trim(),
      contact_person: addLeadForm.person.trim(),
      person: addLeadForm.person.trim(),
      mobile: addLeadForm.phone.trim(),
      phone: addLeadForm.phone.trim(),
      email: addLeadForm.email.trim() || `${addLeadForm.company.toLowerCase().replace(/\s+/g, '')}@example.com`,
      city: addLeadForm.city.trim() || "Chennai",
      product_name: selectedProd,
      product: selectedProd,
      category: addLeadForm.category,
      priority: addLeadForm.priority || "High",
      value: addLeadForm.value || "₹0",
      source: addLeadForm.source || "Field Research (SE)",
      notes: addLeadForm.notes.trim() || "New lead added via Dashboard Quick Action.",
      assigned_to: userName,
      assigned_to_email: userEmail,
      employee_code: userEmpCode,
      latitude: lat,
      longitude: lng,
    };

    let serverLeadId = `lead_${Date.now()}`;
    let serverLeadNum = `LD-${Date.now().toString().slice(-8)}`;

    try {
      const apiRes = await crmAPI.createLead(payload);
      const leadData = apiRes?.data || apiRes;
      if (!leadData || (!leadData.lead_id && !leadData.id)) {
        throw new Error(apiRes?.message || "Failed to persist Lead record on the backend database.");
      }
      serverLeadId = leadData.lead_id || leadData.id;
      serverLeadNum = leadData.lead_number || serverLeadNum;
    } catch (apiErr) {
      console.error("Backend API error when creating lead:", apiErr);
      const errorDetail = apiErr?.detail || apiErr?.message || "Connection error or internal server failure.";
      showToast(`❌ Lead creation failed: ${errorDetail}`, "error");
      setIsSubmitting(false);
      return;
    }

    const newLeadObj = {
      id: serverLeadId,
      lead_id: serverLeadId,
      leadNumber: serverLeadNum,
      company: addLeadForm.company.trim(),
      person: addLeadForm.person.trim(),
      phone: addLeadForm.phone.trim(),
      email: payload.email,
      city: payload.city,
      product: selectedProd,
      product_name: selectedProd,
      assignedTo: userName,
      assignedToEmail: userEmail,
      category: addLeadForm.category,
      priority: addLeadForm.priority || "High",
      value: addLeadForm.value || "₹0",
      status: "New",
      source: addLeadForm.source || "Field Research (SE)",
      notes: payload.notes,
      latitude: lat,
      longitude: lng,
      full_address: addLeadForm.full_address || null,
      customerId: null,
      createdAt: formatDate(new Date()),
      executiveRemarks: [
        { note: `Lead created by ${userName} via Dashboard Quick Action. Requirement: ${selectedProd}`, date: "Just now", author: userName }
      ],
    };

    // If "Opportunity List" is selected, save directly to Opportunities in Client Log!
    if (addLeadForm.targetList === "Opportunities") {
      const newOppObj = {
        id: `opp_${Date.now()}`,
        leadId: serverLeadId,
        leadNumber: serverLeadNum,
        customerId: null,
        customer: addLeadForm.company.trim(),
        contactPerson: addLeadForm.person.trim(),
        phone: addLeadForm.phone.trim(),
        address: addLeadForm.city.trim() || "Chennai Site",
        source: addLeadForm.source || "Field Research (SE)",
        value: addLeadForm.value || "₹0",
        probability: addLeadForm.category === "Hot" ? "85%" : addLeadForm.category === "Warm" ? "60%" : "30%",
        stage: "SE Research / Prospecting",
        closing: formatDate(new Date(Date.now() + 15 * 86400000)),
        status: addLeadForm.category,
        outcome: "In Negotiation",
        remarks: addLeadForm.notes.trim() || "Researched client detail logged by Sales Executive.",
        date: formatDate(new Date()),
      };

      try {
        const savedOpps = JSON.parse(localStorage.getItem("tc_sales_opportunities") || "[]");
        localStorage.setItem("tc_sales_opportunities", JSON.stringify([newOppObj, ...savedOpps]));
      } catch (err) { }

      // Persist directly to Supabase crm.opportunities
      pipelineAPI.createOpportunity({
        id: newOppObj.id,
        opportunity_id: newOppObj.id,
        title: `Opportunity - ${addLeadForm.company.trim()}`,
        company: addLeadForm.company.trim(),
        customer_name: addLeadForm.company.trim(),
        contact_person: addLeadForm.person.trim(),
        phone: addLeadForm.phone.trim(),
        value: parseFloat(String(addLeadForm.value || "450000").replace(/[^0-9.]/g, "")) || 450000,
        expected_revenue: parseFloat(String(addLeadForm.value || "450000").replace(/[^0-9.]/g, "")) || 450000,
        stage: "Lead",
        probability: addLeadForm.category === "Hot" ? 85 : addLeadForm.category === "Warm" ? 60 : 30,
        rep: userName,
        assigned_to: userName,
        notes: addLeadForm.notes.trim() || "Researched client detail logged by Sales Executive.",
      }).catch((err) => {
        console.warn("Opportunity Supabase persistence notice:", err);
      });

      showToast(`🎯 Opportunity "${addLeadForm.company}" saved to Supabase & Opportunity List!`, "success");
    } else {
      try {
        const savedLeads = JSON.parse(localStorage.getItem("tc_sm_leads") || "[]");
        localStorage.setItem("tc_sm_leads", JSON.stringify([newLeadObj, ...savedLeads]));
      } catch (err) { }
      showToast(`✨ New Lead "${addLeadForm.company}" saved to Supabase & Lead Pipeline!`, "success");
    }

    setIsAddLeadModalOpen(false);
    setIsSubmitting(false);

    // Reset Form
    setAddLeadForm({
      company: "",
      product: "",
      customProduct: "",
      person: "",
      phone: "",
      email: "",
      city: "",
      category: "Hot",
      priority: "High",
      value: "₹0",
      source: "Field Research (SE)",
      targetList: "Leads",
      notes: "",
      latitude: null,
      longitude: null,
      landmark: "",
      full_address: "",
    });

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

  // Manager Fixed Sales Target Sync uses managerTarget state fetched dynamically.
  const revTargetVal = Number(managerTarget.revenueTarget) || 500000;
  const revAchievedVal = k.my_generated_revenue || k.revenue_this_month || 0;
  const revAchievementPct = Math.min(Math.round((revAchievedVal / revTargetVal) * 100), 100);

  // Executive Incentive Calculation: dynamic commission of total revenue generated
  const totalIncentiveEarned = Math.round(revAchievedVal * (incentiveRate / 100));

  return (
    <div className="space-y-5 font-sans text-slate-900 min-w-0 w-full">

      {/* ── Top Header Controls Row ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Executive Sales Dashboard</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Welcome back, {userName}! Here is your performance overview today.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
            {/* Filter tabs — compact on mobile */}
            <div className="flex border border-slate-200 bg-slate-50/50 p-0.5 rounded-xl gap-0.5 shadow-2xs w-full sm:w-auto overflow-x-auto">
              {["Today", "This Month", "This Year", "Custom Date"].map((opt) => {
                const isActive = selectedMonth === opt;
                const shortLabel = opt === "Today" ? "📍 Today" : opt === "This Month" ? "Month" : opt === "This Year" ? "Year" : "Custom";
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleDateFilterChange(opt)}
                    className={`flex-1 sm:flex-none text-center px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-black transition cursor-pointer whitespace-nowrap ${
                      isActive
                        ? "bg-teal-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-teal-700 hover:bg-teal-50"
                    }`}
                  >
                    <span className="sm:hidden">{shortLabel}</span>
                    <span className="hidden sm:inline">{opt === "Today" ? "📍 Today" : opt}</span>
                  </button>
                );
              })}
            </div>
            {selectedMonth === "Custom Date" && (
              <input
                type="date"
                value={customDateVal}
                onChange={(e) => handleCustomDateChange(e.target.value)}
                className="h-8 text-xs border border-teal-500/50 rounded-xl px-2 bg-teal-50/50 font-black text-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer shadow-2xs w-full sm:w-auto"
              />
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="h-7 sm:h-8 px-2 sm:px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-[10px] sm:text-xs shadow-xs flex items-center gap-1 transition cursor-pointer"
            >
              <span className="hidden sm:inline">Export Report</span>
              <span className="sm:hidden">Export</span>
              <span className="text-[8px]">▼</span>
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
            className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
            title="Refresh data"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin text-teal-500" : ""} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
          {Array(7).fill(0).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Card 1: My Leads (Vivid Blue Gradient) */}
          <div
            onClick={() => setShowLeadsModal(true)}
            className="bg-gradient-to-br from-blue-100/90 via-blue-50 to-indigo-50/80 rounded-xl p-2.5 sm:p-3 shadow-2xs border border-blue-200 hover:border-blue-400 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-900 text-[9px] sm:text-[10px] font-black uppercase tracking-wider">My Leads</p>
                <h2 className="text-lg sm:text-xl font-black text-blue-955 mt-0.5">{k.my_leads ?? k.assigned_leads ?? 0}</h2>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
                <Users size={14} />
              </div>
            </div>
          </div>

          {/* Card 2: Converted Clients (Vivid Emerald Gradient) */}
          <div
            onClick={() => navigate("/sales/customers")}
            className="bg-gradient-to-br from-emerald-100/90 via-emerald-50 to-teal-50/80 rounded-xl p-2.5 sm:p-3 shadow-2xs border border-emerald-200 hover:border-emerald-400 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-900 text-[9px] sm:text-[10px] font-black uppercase tracking-wider">Converted Clients</p>
                <h2 className="text-lg sm:text-xl font-black text-emerald-950 mt-0.5">{k.converted_customers}</h2>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
                <UserCheck size={14} />
              </div>
            </div>
          </div>

          {/* Card 3: Today's Follow-Ups (REMINDER OF THE DAY MODAL TRIGGER!) */}
          <div
            onClick={() => setShowTodayFollowupsModal(true)}
            className="bg-gradient-to-br from-amber-100/90 via-amber-50 to-orange-50/80 rounded-xl p-2.5 sm:p-3 shadow-2xs border border-amber-200 hover:border-amber-400 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-amber-950 text-[9px] sm:text-[10px] font-black uppercase tracking-wider">Follow Ups Today</p>
                  <span className="text-[7px] font-extrabold bg-amber-200/90 text-amber-900 px-1.5 py-0.5 rounded-full">Reminder</span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-amber-950 mt-0.5">{todayFollowupsListState.length}</h2>
                <p className="text-[8px] font-bold text-amber-800 mt-0.5 group-hover:underline">View call reminders ↗</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shrink-0">
                <Clock3 size={14} />
              </div>
            </div>
          </div>
          {/* Today's Visits (Cyan Theme) */}
          <div
            onClick={() => navigate("/sales/client-log")}
            className="bg-gradient-to-br from-sky-100/80 to-blue-50/60 rounded-xl p-3 shadow-2xs border border-sky-200 flex flex-col justify-between cursor-pointer hover:border-sky-400 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <div>
              <p className="text-sky-900 text-[11px] uppercase tracking-wider font-black mb-0.5">Today's Visits</p>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">{k.today_visits}</h2>
              <p className="text-slate-600 text-[9px] sm:text-[10px] font-bold mt-0.5">Target: {k.today_visits_target} Visits</p>
            </div>
            <div className="mt-2.5 w-full bg-sky-200/80 rounded-full h-1">
              <div
                className="bg-gradient-to-r from-sky-500 to-blue-600 h-1 rounded-full transition-all duration-700"
                style={{ width: `${Math.min((k.today_visits / k.today_visits_target) * 100, 100)}%` }}
              />
            </div>
          </div>

          <div
            onClick={() => navigate("/sales/attendance")}
            className={`rounded-xl p-3 shadow-2xs border flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ${
              k.attendance_status === "Present"
                ? "bg-gradient-to-br from-emerald-100/80 to-teal-50/60 border-emerald-200 hover:border-emerald-400"
                : "bg-gradient-to-br from-rose-50/80 to-red-50/60 border-rose-200 hover:border-rose-400"
            }`}
          >
            <div>
              <p className={`text-[11px] uppercase tracking-wider font-black mb-0.5 ${k.attendance_status === 'Present' ? 'text-emerald-900' : 'text-rose-900'}`}>Attendance</p>
              <h2 className={`text-base sm:text-lg font-black ${
                k.attendance_status === "Present" ? "text-emerald-700" :
                k.attendance_status === "Not Marked" ? "text-rose-600" : "text-amber-700"
              }`}>
                {k.attendance_status === "Present" ? "✅ Present" :
                 k.attendance_status === "Not Marked" ? "⚠️ Not Marked" :
                 k.attendance_status}
              </h2>
              {k.attendance_status === "Present" && k.check_in_time && (
                <p className="text-slate-600 text-[9px] sm:text-[10px] font-bold mt-0.5 flex items-center gap-1">
                  <Clock3 size={11} className="text-emerald-700" /> In: {k.check_in_time}
                </p>
              )}
              {k.attendance_status === "Not Marked" && (
                <p className="text-rose-700 text-[9px] sm:text-[10px] font-bold mt-0.5 flex items-center gap-1">
                  <AlertCircle size={11} /> Tap to mark
                </p>
              )}
            </div>
          </div>

          {/* My Revenue Generated (REVENUE & INCENTIVE BREAKDOWN MODAL TRIGGER!) */}
          <div
            onClick={() => setShowRevenueIncentiveModal(true)}
            className="bg-gradient-to-br from-purple-100/80 to-fuchsia-50/60 rounded-xl p-3 shadow-2xs border border-purple-200 flex flex-col justify-between cursor-pointer hover:border-purple-400 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group"
          >
            <div>
              <div className="flex items-center justify-between">
                <p className="text-purple-900 text-[11px] uppercase tracking-wider font-black mb-0.5">My Revenue</p>
                <Award size={13} className="text-purple-600" />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-purple-955 mt-0.5">{formatINR(revAchievedVal)}</h2>
              <div className="mt-1 flex items-center justify-between flex-wrap gap-1">
                <span className="text-[9px] font-black text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-md border border-purple-200">
                  Incentive: {formatINR(totalIncentiveEarned)}
                </span>
              </div>
            </div>
          </div>

          {/* Reimbursements */}
          <div
            onClick={() => navigate("/sales/expenses")}
            className="bg-gradient-to-br from-rose-100/80 to-pink-50/60 rounded-xl p-3 shadow-2xs border border-rose-200 flex flex-col justify-between cursor-pointer hover:border-rose-400 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <div>
              <p className="text-rose-900 text-[11px] uppercase tracking-wider font-black mb-0.5">Reimbursements</p>
              <h2 className="text-lg sm:text-xl font-black text-rose-700">{formatINR(k.expenses_pending_amount)}</h2>
              <p className="text-slate-600 text-[9px] sm:text-[10px] font-bold mt-0.5">Pending approvals</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Actions + Sales Target Overview ──────────────────────────── */}
      {!loading && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">

          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-teal-50/90 via-emerald-50/40 to-slate-50 rounded-3xl p-4.5 sm:p-5 shadow-sm border-2 border-teal-200/90 flex flex-col gap-4">
            <div className="flex items-center justify-between mb-2">
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
                      switch (action.actionId) {
                        case "attendance":
                          setIsAttendanceModalOpen(true);
                          break;
                        case "add_lead":
                          setIsAddLeadModalOpen(true);
                          break;
                        case "followups":
                          setIsFollowUpsModalOpen(true);
                          break;
                        case "schedule_visit":
                          setIsScheduleVisitModalOpen(true);
                          break;
                        case "opportunities":
                          setIsOpportunitiesModalOpen(true);
                          break;
                        case "submit_expense":
                          setIsSubmitExpenseModalOpen(true);
                          break;
                        case "client_log":
                          setIsClientLogModalOpen(true);
                          break;
                        case "my_leads":
                          setIsMyLeadsModalOpen(true);
                          break;
                        default:
                          break;
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
          <div className="bg-gradient-to-br from-indigo-50/90 via-blue-50/40 to-slate-50 rounded-3xl p-4.5 sm:p-5 shadow-sm border-2 border-indigo-200/90 flex flex-col gap-4">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <h2 className="font-black text-indigo-950 text-base flex items-center gap-2">
                <Target size={20} className="text-indigo-600" /> Sales Target Overview
              </h2>
              <span className="text-[10px] font-black text-indigo-900 bg-indigo-100/90 px-2.5 py-1 rounded-full border border-indigo-200">
                🎯 Target Fixed by Manager: ₹{Number(managerTarget.revenueTarget || 500000).toLocaleString('en-IN')}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Target 1: Revenue Card */}
              <div className="p-3.5 bg-indigo-50/70 hover:bg-indigo-100/60 rounded-2xl border border-indigo-200/90 flex flex-col justify-between space-y-2 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 hover:shadow-md cursor-pointer hover:border-indigo-400">
                <div className="flex items-center justify-between text-xs font-black text-indigo-950">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700">
                      <IndianRupee size={12} className="stroke-[3]" />
                    </div>
                    <span>Revenue Target</span>
                  </div>
                  <span className="text-indigo-700 bg-indigo-100 font-extrabold px-1.5 py-0.5 rounded-md text-[10px]">{Math.round(revAchievementPct)}%</span>
                </div>
                <div className="w-full bg-slate-200/70 rounded-full h-1.5">
                  <div
                    className="bg-indigo-650 h-1.5 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(revAchievementPct, 100)}%` }}
                  />
                </div>
                <div className="flex flex-col text-[10px] text-slate-500 font-bold space-y-0.5">
                  <div className="flex justify-between">
                    <span>Achieved:</span>
                    <span className="text-indigo-950 font-extrabold">{formatINR(revAchievedVal)}</span>
                  </div>
                  <div className="flex justify-between border-t border-indigo-150 pt-0.5">
                    <span>Target:</span>
                    <span className="text-slate-600">{formatINR(revTargetVal)}</span>
                  </div>
                </div>
              </div>

              {/* Target 2: Visits Card */}
              <div className="p-3.5 bg-teal-50/70 hover:bg-teal-100/60 rounded-2xl border border-teal-200/90 flex flex-col justify-between space-y-2 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 hover:shadow-md cursor-pointer hover:border-teal-400">
                <div className="flex items-center justify-between text-xs font-black text-teal-950">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-lg bg-teal-100 border border-teal-200 flex items-center justify-center text-teal-700">
                      <MapPin size={12} className="stroke-[3]" />
                    </div>
                    <span>Visits Target</span>
                  </div>
                  <span className="text-teal-800 bg-teal-100 font-extrabold px-1.5 py-0.5 rounded-md text-[10px]">{Math.round(k.visits_pct || 0)}%</span>
                </div>
                <div className="w-full bg-slate-200/70 rounded-full h-1.5">
                  <div
                    className="bg-teal-500 h-1.5 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(k.visits_pct || 0, 100)}%` }}
                  />
                </div>
                <div className="flex flex-col text-[10px] text-slate-500 font-bold space-y-0.5">
                  <div className="flex justify-between">
                    <span>Completed:</span>
                    <span className="text-teal-950 font-extrabold">{k.visits_done ?? 0} Visits</span>
                  </div>
                  <div className="flex justify-between border-t border-teal-150 pt-0.5">
                    <span>Target:</span>
                    <span className="text-slate-600">{k.visits_target ?? 8} Visits</span>
                  </div>
                </div>
              </div>

              {/* Target 3: Lead Conversion Card */}
              <div className="p-3.5 bg-amber-50/70 hover:bg-amber-100/60 rounded-2xl border border-amber-200/90 flex flex-col justify-between space-y-2 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 hover:shadow-md cursor-pointer hover:border-amber-400">
                <div className="flex items-center justify-between text-xs font-black text-amber-955">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
                      <UserCheck size={12} className="stroke-[3]" />
                    </div>
                    <span>Conversion Target</span>
                  </div>
                  <span className="text-amber-800 bg-amber-100 font-extrabold px-1.5 py-0.5 rounded-md text-[10px]">{Math.round(k.lead_conversion_pct || 0)}%</span>
                </div>
                <div className="w-full bg-slate-200/70 rounded-full h-1.5">
                  <div
                    className="bg-amber-500 h-1.5 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(k.lead_conversion_pct || 0, 100)}%` }}
                  />
                </div>
                <div className="flex flex-col text-[10px] text-slate-500 font-bold space-y-0.5">
                  <div className="flex justify-between">
                    <span>Converted:</span>
                    <span className="text-amber-950 font-extrabold">{k.converted_leads ?? 0} Leads</span>
                  </div>
                  <div className="flex justify-between border-t border-amber-150 pt-0.5">
                    <span>Target:</span>
                    <span className="text-slate-600">{managerTarget.dealsTarget || 10} Leads</span>
                  </div>
                </div>
              </div>
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
                <p className="text-xs font-black text-emerald-900 uppercase tracking-wider">Total Executive Incentive Earned ({incentiveRate}% Commission)</p>
                <h3 className="text-2xl sm:text-3xl font-black text-emerald-950 mt-1">{formatINR(totalIncentiveEarned)}</h3>
                <p className="text-[11px] font-bold text-emerald-800 mt-0.5">🎉 Dynamic {incentiveRate}% incentive calculated per closed deal</p>
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
                      <th className="py-3 px-4 text-emerald-800">Executive Incentive ({incentiveRate}%)</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                    {myCustomersList.map((c, i) => {
                      const valStr = c.contractValue || c.value || c.revenue || c.budget || "0";
                      const valNum = parseInt(String(valStr).replace(/[^0-9]/g, "")) || 0;
                      const incNum = Math.round(valNum * (incentiveRate / 100));

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

      {/* ── SPACIOUS ADD NEW LEAD MODAL (SE Sourced Lead Entry via Quick Actions) ── */}
      {isAddLeadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-auto max-h-[90vh] overflow-y-auto animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-teal-600" /> Create / Add New Prospect Lead
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-teal-600 mt-0.5">Sourced by {userName}</p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddLeadModalOpen(false)}
                className="p-2 rounded-2xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddLeadSubmit} className="space-y-5 text-xs sm:text-sm font-semibold">
              {/* Optional: Pick Researched Opportunity to Auto-fill */}
              <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 space-y-2">
                <label className="text-indigo-950 font-black text-xs uppercase tracking-wider flex items-center justify-between">
                  <span>🎯 Select Researched Opportunity Prospect (Auto-Fill Details)</span>
                  <span className="text-[10px] font-bold text-indigo-700">Optional</span>
                </label>
                <select
                  onChange={(e) => {
                    const oppId = e.target.value;
                    if (!oppId) return;
                    try {
                      const opps = JSON.parse(localStorage.getItem("tc_sales_opportunities") || "[]");
                      const found = opps.find((o) => o.id === oppId || o.leadId === oppId);
                      if (found) {
                        setAddLeadForm((prev) => ({
                          ...prev,
                          company: found.customer || found.company || prev.company,
                          product: found.productRequirement || prev.product,
                          person: found.contactPerson || found.person || prev.person,
                          phone: found.phone || prev.phone,
                          city: found.address || found.location || found.city || prev.city,
                          source: found.source || prev.source,
                          notes: found.remarks || found.notes || prev.notes,
                        }));
                        showToast(`✨ Auto-filled details from "${found.customer}"!`, "success");
                      }
                    } catch (err) { }
                  }}
                  className="w-full h-10 border border-indigo-300 rounded-xl px-3 bg-white text-slate-900 font-extrabold text-xs focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="">-- Choose Opportunity Prospect from Research List --</option>
                  {(() => {
                    try {
                      const opps = JSON.parse(localStorage.getItem("tc_sales_opportunities") || "[]");
                      return opps.map((o) => (
                        <option key={o.id} value={o.id}>
                          🏢 {o.customer} ({o.location || o.address || 'Site'}) - Sourced: {o.source || 'SE Research'}
                        </option>
                      ));
                    } catch (e) {
                      return null;
                    }
                  })()}
                </select>
              </div>

              {/* Company Name & Product Requirement Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
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
                  <label className="text-slate-800 font-extrabold block mb-1.5">Product / Service Needed (*Why reached out)</label>
                  <select
                    value={addLeadForm.product}
                    onChange={(e) => setAddLeadForm({ ...addLeadForm, product: e.target.value })}
                    className="w-full border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white font-semibold text-sm transition cursor-pointer"
                  >
                    <option value="">-- Select Product / Service --</option>
                    {productOptions.map((prod) => (
                      <option key={prod} value={prod}>{prod}</option>
                    ))}
                    <option value="custom">✍️ Custom Product / Service</option>
                  </select>
                  {addLeadForm.product === "custom" && (
                    <input
                      type="text"
                      placeholder="Enter custom product name"
                      value={addLeadForm.customProduct || ""}
                      onChange={(e) => setAddLeadForm({ ...addLeadForm, customProduct: e.target.value })}
                      className="w-full mt-2 border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white font-semibold text-sm transition"
                    />
                  )}
                </div>
              </div>

              {/* Point of Contact & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <div>
                  <label className="text-slate-800 font-extrabold block mb-1.5">Phone Number (*Required)</label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit number e.g. 9876543210"
                    value={addLeadForm.phone}
                    maxLength={10}
                    onChange={(e) => setAddLeadForm({ ...addLeadForm, phone: normalizePhoneNumber(e.target.value) })}
                    className="w-full border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white font-semibold text-sm transition"
                  />
                </div>
              </div>

              {/* Email & City Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              </div>

              {/* ── 📍 LOCATION PICKER WIDGET ── */}
              <div className="bg-blue-50/80 border-2 border-blue-200 rounded-3xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <label className="text-xs font-black text-blue-955 uppercase tracking-wider">
                      Exact Client Location (for Smart Map)
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsLocationPickerOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <MapPin size={13} /> Pick Location on Map
                  </button>
                </div>

                {addLeadForm.latitude && addLeadForm.longitude ? (
                  <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wide">Location Confirmed</p>
                      {addLeadForm.full_address && (
                        <p className="text-[11px] font-semibold text-slate-700 truncate mt-0.5">{addLeadForm.full_address}</p>
                      )}
                      <p className="text-[10px] font-bold text-slate-500 mt-0.5 font-mono">
                        {Number(addLeadForm.latitude).toFixed(6)}, {Number(addLeadForm.longitude).toFixed(6)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAddLeadForm({ ...addLeadForm, latitude: null, longitude: null, full_address: '' })}
                      className="ml-auto p-1 text-slate-300 hover:text-rose-500 transition flex-shrink-0"
                      title="Clear location"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold px-1">
                    <AlertCircle size={13} className="text-amber-400" />
                    No location selected. Click "Pick Location on Map" to set exact coordinates.
                  </div>
                )}
              </div>

              <div>
                <label className="text-slate-800 font-extrabold block mb-1.5">Remarks / SE Research Notes</label>
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
                    <option value="Other">🌐 Other Category</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-800 font-extrabold block mb-1.5">Deal Value (INR)</label>
                  <input
                    type="text"
                    placeholder="₹0"
                    value={addLeadForm.value}
                    onChange={(e) => setAddLeadForm({ ...addLeadForm, value: e.target.value })}
                    className="w-full border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white font-extrabold text-sm transition"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full sm:w-auto px-6 py-3 rounded-2xl font-extrabold text-xs sm:text-sm shadow-md transition ${
                    isSubmitting
                      ? 'bg-teal-400 text-white cursor-not-allowed shadow-none'
                      : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/30 cursor-pointer'
                  }`}
                >
                  {isSubmitting ? '⏳ Saving Lead...' : 'Create & Save Lead 🎉'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal for Mark Attendance ── */}
      {isAttendanceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl my-auto max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setIsAttendanceModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-2xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer z-50"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
            <div className="pt-2">
              <Attendance isModalView={true} />
            </div>
          </div>
        </div>
      )}

      {/* ── Modal for Follow-Ups ── */}
      {isFollowUpsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-6xl w-full p-4 sm:p-6 shadow-2xl my-auto max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setIsFollowUpsModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-2xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer z-50"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
            <div className="pt-2">
              <Leads isModalView={true} defaultTab="followups" />
            </div>
          </div>
        </div>
      )}

      {/* ── Modal for Schedule Visit ── */}
      {isScheduleVisitModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-6xl w-full p-4 sm:p-6 shadow-2xl my-auto max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setIsScheduleVisitModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-2xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer z-50"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
            <div className="pt-2">
              <ClientLog isModalView={true} defaultTab="visits" defaultOpenAddVisit={true} />
            </div>
          </div>
        </div>
      )}

      {/* ── Modal for Opportunities ── */}
      {isOpportunitiesModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-6xl w-full p-4 sm:p-6 shadow-2xl my-auto max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setIsOpportunitiesModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-2xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer z-50"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
            <div className="pt-2">
              <Leads isModalView={true} defaultTab="opportunities" />
            </div>
          </div>
        </div>
      )}

      {/* ── Modal for Submit Expense ── */}
      {isSubmitExpenseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl my-auto max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setIsSubmitExpenseModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-2xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer z-50"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
            <div className="pt-2">
              <Expenses isModalView={true} defaultOpenSubmit={true} />
            </div>
          </div>
        </div>
      )}

      {/* ── Modal for Client Log ── */}
      {isClientLogModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-6xl w-full p-4 sm:p-6 shadow-2xl my-auto max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setIsClientLogModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-2xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer z-50"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
            <div className="pt-2">
              <ClientLog isModalView={true} defaultTab="visits" />
            </div>
          </div>
        </div>
      )}

      {/* ── Modal for My Leads ── */}
      {isMyLeadsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-6xl w-full p-4 sm:p-6 shadow-2xl my-auto max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setIsMyLeadsModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-2xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer z-50"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
            <div className="pt-2">
              <Leads isModalView={true} defaultTab="leads" />
            </div>
          </div>
        </div>
      )}
      {/* ── Modal for Todo Tasks ── */}
      {isTodoModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl my-auto max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setIsTodoModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-2xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer z-50"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
            <div className="pt-2">
              <Todo isModalView={true} />
            </div>
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
                            {formatINR(l.expected_value || l.value || 0)}
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
      {/* ── Location Picker Modal ── */}
      <LocationPickerModal
        isOpen={isLocationPickerOpen}
        onClose={() => setIsLocationPickerOpen(false)}
        initialLat={addLeadForm.latitude || 13.0067}
        initialLng={addLeadForm.longitude || 80.2570}
        initialAddress={addLeadForm.full_address || addLeadForm.address || addLeadForm.location || addLeadForm.city || ''}
        title="Pick Lead Location"
        onConfirm={(lat, lng, address) => {
          setAddLeadForm(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng,
            full_address: address,
            address: address,
            location: address,
            city: address.split(',')[0]?.trim() || prev.city,
          }));
          setIsLocationPickerOpen(false);
        }}
      />
    </div>
  );
}