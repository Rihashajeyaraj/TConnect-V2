import React, { useState, useEffect, useMemo } from "react";
import { useToast } from "../../common/ToastContext.jsx";
import {
  TrendingUp,
  Target,
  Users,
  Search,
  Filter,
  DollarSign,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ChevronRight,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Building2,
  Calendar,
  X,
  Sparkles,
  Info,
  Wallet,
  Download,
  FileSpreadsheet,
  Receipt,
  PieChart as PieChartIcon,
  Layers,
  Check
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";
import { reportAPI, expenseAPI, hrmsAPI } from "../../services/api.js";
import { exportToPDF, exportToExcel, exportToCSV } from "../../utils/exportUtils.js";
const ANNUAL_TARGET = 35e6;
function SalesOverview({ initialSection }) {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [rawExpenses, setRawExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateFilter, setDateFilter] = useState("This Month");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [customRangeApplied, setCustomRangeApplied] = useState(null);
  const [salariesList, setSalariesList] = useState([]);
  const [showFinancialReportModal, setShowFinancialReportModal] = useState(false);
  const [modalTimeFilter, setModalTimeFilter] = useState("Monthly");
  const [modalFromDate, setModalFromDate] = useState("");
  const [modalToDate, setModalToDate] = useState("");
  const [ceoActiveTab, setCeoActiveTab] = useState("overview");
  const [ceoReportsList, setCeoReportsList] = useState([]);
  const [loadingCeoReports, setLoadingCeoReports] = useState(false);
  const [viewingCeoReport, setViewingCeoReport] = useState(null);
  const [ceoRemarks, setCeoRemarks] = useState("");
  const [submittingRemarks, setSubmittingRemarks] = useState(false);
  const [showTargetsModal, setShowTargetsModal] = useState(false);
  const [targetsYearFilter, setTargetsYearFilter] = useState((/* @__PURE__ */ new Date()).getFullYear());
  const [activeKpi, setActiveKpi] = useState("revenue");
  const [wonToggle, setWonToggle] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [managerFilter, setManagerFilter] = useState("All");
  const [executiveFilter, setExecutiveFilter] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const getFilterDates = (range) => {
    const pad = (n) => String(n).padStart(2, "0");
    const today = /* @__PURE__ */ new Date();
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    if (range === "Today") {
      return { start: todayStr, end: todayStr };
    }
    if (range === "This Week") {
      const currentDay = today.getDay();
      const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
      const start = new Date(today.setDate(diff));
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      const startStr = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
      const endStr = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
      return {
        start: startStr,
        end: endStr
      };
    }
    if (range === "This Month") {
      const startStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`;
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const endStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(lastDay)}`;
      return {
        start: startStr,
        end: endStr
      };
    }
    return null;
  };
  const fetchUnifiedData = async () => {
    try {
      setLoading(true);
      setError(null);
      let startLimit = null;
      let endLimit = null;
      if (dateFilter === "Custom Date") {
        if (customRangeApplied) {
          startLimit = customRangeApplied.start;
          endLimit = customRangeApplied.end;
        }
      } else {
        const limits = getFilterDates(dateFilter);
        if (limits) {
          startLimit = limits.start;
          endLimit = limits.end;
        }
      }
      const params = {};
      if (startLimit) params.from_date = startLimit;
      if (endLimit) params.to_date = endLimit;
      const [salesRes, dashRes, expRes, salaryRes] = await Promise.allSettled([
        reportAPI.getCeoSalesOverview(params),
        reportAPI.getCeoDashboard(),
        expenseAPI.getManagerExpenses({ status: "" }),
        // fetch all, filter by status in UI
        hrmsAPI.getSalaries()
      ]);
      if (salesRes.status === "fulfilled" && salesRes.value?.data) {
        setData(salesRes.value.data);
      } else if (salesRes.status === "rejected") {
        throw salesRes.reason;
      }
      if (dashRes.status === "fulfilled" && dashRes.value?.data) {
        setDashboardData(dashRes.value.data);
      }
      if (expRes.status === "fulfilled") {
        const raw = expRes.value;
        const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data?.expenses) ? raw.data.expenses : Array.isArray(raw?.data) ? raw.data : [];
        setRawExpenses(list);
      }
      if (salaryRes.status === "fulfilled" && salaryRes.value?.data) {
        setSalariesList(salaryRes.value.data);
      }
    } catch (err) {
      console.error("Failed to load Sales & Revenue data:", err);
      setError(err?.message || "Server error loading sales & revenue summary");
      showToast("Error loading Sales & Revenue data", "error");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchUnifiedData();
  }, [dateFilter, customRangeApplied]);
  const fetchCeoReports = async () => {
    setLoadingCeoReports(true);
    try {
      const res = await hrmsAPI.getSalesReports ? await hrmsAPI.getSalesReports() : await reportAPI.getSalesReports();
      if (res && res.data) {
        setCeoReportsList(res.data);
      }
    } catch (err) {
      console.error("Failed to load sales reports on CEO side", err);
    } finally {
      setLoadingCeoReports(false);
    }
  };
  useEffect(() => {
    if (ceoActiveTab === "reports") {
      fetchCeoReports();
    }
  }, [ceoActiveTab]);
  const handleApplyCustomRange = (e) => {
    e.preventDefault();
    if (!fromDate || !toDate) {
      showToast("Please select both From and To dates", "warning");
      return;
    }
    setCustomRangeApplied({ start: fromDate, end: toDate });
  };
  const APPROVED_STATUSES = ["approved", "APPROVED", "Approved"];
  const totalOperationalExpenses = useMemo(() => {
    let startLimit = null;
    let endLimit = null;
    if (dateFilter === "Custom Date") {
      if (customRangeApplied) {
        startLimit = customRangeApplied.start;
        endLimit = customRangeApplied.end;
      }
    } else {
      const limits = getFilterDates(dateFilter);
      if (limits) {
        startLimit = limits.start;
        endLimit = limits.end;
      }
    }
    let filtered = rawExpenses.filter(
      (e) => APPROVED_STATUSES.includes(e.status || e.approval_status || "")
    );
    if (startLimit && endLimit) {
      filtered = filtered.filter((e) => {
        const expDate = e.claim_date || e.created_at || e.submitted_at || e.date;
        if (!expDate) return true;
        const dStr = String(expDate).substring(0, 10);
        return dStr >= startLimit && dStr <= endLimit;
      });
    }
    if (filtered.length === 0 && rawExpenses.length === 0) {
      return Number(dashboardData?.metrics?.totalExpenses || 0);
    }
    return filtered.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  }, [rawExpenses, dateFilter, customRangeApplied, dashboardData]);
  const approvedExpenseCount = useMemo(() => {
    return rawExpenses.filter(
      (e) => APPROVED_STATUSES.includes(e.status || e.approval_status || "")
    ).length;
  }, [rawExpenses]);
  const modalRange = useMemo(() => {
    const pad = (n) => String(n).padStart(2, "0");
    const today = /* @__PURE__ */ new Date();
    if (modalTimeFilter === "Monthly") {
      const start2 = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`;
      const lastDay2 = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const end2 = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(lastDay2)}`;
      return { start: start2, end: end2 };
    }
    if (modalTimeFilter === "Yearly") {
      const start2 = `${today.getFullYear()}-01-01`;
      const end2 = `${today.getFullYear()}-12-31`;
      return { start: start2, end: end2 };
    }
    if (modalTimeFilter === "Custom" && modalFromDate && modalToDate) {
      return { start: modalFromDate, end: modalToDate };
    }
    const start = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`;
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const end = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(lastDay)}`;
    return { start, end };
  }, [modalTimeFilter, modalFromDate, modalToDate]);
  const modalRevenueRecords = useMemo(() => {
    const recs = data?.revenue_details || [];
    const { start, end } = modalRange;
    return recs.filter((r) => {
      const d = r.date || "";
      return (r.amount || 0) > 0 && d >= start && d <= end;
    });
  }, [data?.revenue_details, modalRange]);
  const modalTotalRevenue = useMemo(() => {
    return modalRevenueRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
  }, [modalRevenueRecords]);
  const modalTotalReimbursements = useMemo(() => {
    const { start, end } = modalRange;
    const approved = rawExpenses.filter(
      (e) => APPROVED_STATUSES.includes(e.status || e.approval_status || "")
    );
    const inRange = approved.filter((e) => {
      const expDate = e.claim_date || e.created_at || e.submitted_at || e.date;
      if (!expDate) return false;
      const dStr = String(expDate).substring(0, 10);
      return dStr >= start && dStr <= end;
    });
    return inRange.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [rawExpenses, modalRange]);
  const modalReimbursementRecords = useMemo(() => {
    const { start, end } = modalRange;
    const approved = rawExpenses.filter(
      (e) => APPROVED_STATUSES.includes(e.status || e.approval_status || "")
    );
    return approved.filter((e) => {
      const expDate = e.claim_date || e.created_at || e.submitted_at || e.date;
      if (!expDate) return false;
      const dStr = String(expDate).substring(0, 10);
      return dStr >= start && dStr <= end;
    }).map((e) => {
      const expDate = e.claim_date || e.created_at || e.submitted_at || e.date;
      const dStr = String(expDate).substring(0, 10);
      return {
        id: e.id || `EXP-${e.claim_id || Math.random()}`,
        date: dStr,
        sales_manager: "N/A",
        sales_executive: e.employee_name || e.employee || e.submitted_by || "Employee",
        reimbursement: Number(e.amount || 0),
        amount: 0,
        incentive: 0,
        type: "Expense",
        details: e.remarks || e.description || e.category || "Reimbursement Claim"
      };
    });
  }, [rawExpenses, modalRange]);
  const modalTotalIncentives = useMemo(() => {
    return modalRevenueRecords.reduce((sum, r) => sum + (r.incentive || 0), 0);
  }, [modalRevenueRecords]);
  const modalTotalSalary = useMemo(() => {
    const monthlySum = salariesList.reduce((sum, s) => sum + (s.monthly_salary || 0), 0);
    if (modalTimeFilter === "Monthly") {
      return monthlySum;
    }
    if (modalTimeFilter === "Yearly") {
      return monthlySum * 12;
    }
    if (modalTimeFilter === "Custom" && modalFromDate && modalToDate) {
      const from = new Date(modalFromDate);
      const to = new Date(modalToDate);
      const diffTime = Math.abs(to - from);
      const diffDays = Math.ceil(diffTime / (1e3 * 60 * 60 * 24));
      const diffMonths = Math.max(1, Math.round(diffDays / 30));
      return monthlySum * diffMonths;
    }
    return monthlySum;
  }, [salariesList, modalTimeFilter, modalFromDate, modalToDate]);
  const netProfitLoss = modalTotalRevenue - (modalTotalReimbursements + modalTotalIncentives + modalTotalSalary);
  const isProfit = netProfitLoss >= 0;
  const unifiedModalLedger = useMemo(() => {
    const revenueItems = modalRevenueRecords.map((r) => ({
      ...r,
      type: "Revenue",
      reimbursement: 0,
      details: "Won Deal / Customer SLA"
    }));
    const salaryItems = salariesList.map((s) => {
      const monthlySum = s.monthly_salary || 0;
      let durationScale = 1;
      if (modalTimeFilter === "Yearly") {
        durationScale = 12;
      } else if (modalTimeFilter === "Custom" && modalFromDate && modalToDate) {
        const from = new Date(modalFromDate);
        const to = new Date(modalToDate);
        const diffTime = Math.abs(to - from);
        const diffDays = Math.ceil(diffTime / (1e3 * 60 * 60 * 24));
        durationScale = Math.max(1, Math.round(diffDays / 30));
      }
      return {
        id: `SAL-${s.employee_id || Math.random()}`,
        date: modalRange.end,
        sales_manager: "N/A",
        sales_executive: s.employee_name || "Employee",
        reimbursement: 0,
        amount: 0,
        incentive: 0,
        salary: monthlySum * durationScale,
        type: "Salary",
        details: `Salary Allocation (${durationScale} Month(s))`
      };
    });
    const allItems = [...revenueItems, ...modalReimbursementRecords, ...salaryItems];
    const grouped = {};
    allItems.forEach((item) => {
      const d = item.date || "N/A";
      if (!grouped[d]) {
        grouped[d] = {
          date: d,
          totalRevenue: 0,
          totalReimbursements: 0,
          totalIncentives: 0,
          totalSalary: 0,
          transactions: []
        };
      }
      grouped[d].totalRevenue += item.amount || 0;
      grouped[d].totalReimbursements += item.reimbursement || 0;
      grouped[d].totalIncentives += item.incentive || 0;
      grouped[d].totalSalary += item.salary || 0;
      grouped[d].transactions.push(item);
    });
    return Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));
  }, [modalRevenueRecords, modalReimbursementRecords, salariesList, modalTimeFilter, modalFromDate, modalToDate, modalRange.end]);
  const safeNum = (v) => Number(v) || 0;
  const safeFmt = (v) => safeNum(v).toLocaleString();
  const totalRevenue = safeNum(data?.metrics?.total_revenue);
  const totalPipeline = safeNum(data?.metrics?.total_pipeline_value);
  const totalCustomersCount = safeNum(data?.metrics?.total_customers);
  const totalWonDealsCount = safeNum(data?.metrics?.total_won_deals);
  const resolvedAnnualTarget = safeNum(data?.metrics?.annual_sales_target || data?.metrics?.sales_target || ANNUAL_TARGET);
  const targetAchievementRate = resolvedAnnualTarget > 0 ? (totalRevenue / resolvedAnnualTarget * 100).toFixed(1) : "0.0";
  const netProfit = totalRevenue - totalOperationalExpenses;
  const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue * 100).toFixed(1) : "0.0";
  const filteredRevenue = useMemo(() => {
    if (!data?.revenue_details) return [];
    return data.revenue_details.filter((row) => {
      const matchesSearch = (row.customer || "").toLowerCase().includes(searchQuery.toLowerCase()) || (row.sales_executive || "").toLowerCase().includes(searchQuery.toLowerCase()) || (row.sales_manager || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesManager = managerFilter === "All" || row.sales_manager === managerFilter;
      const matchesExecutive = executiveFilter === "All" || row.sales_executive === executiveFilter;
      return matchesSearch && matchesManager && matchesExecutive;
    });
  }, [data?.revenue_details, searchQuery, managerFilter, executiveFilter]);
  const filteredCustomers = useMemo(() => {
    if (!data?.customers_details) return [];
    return data.customers_details.filter((row) => {
      const matchesSearch = (row.customer_name || "").toLowerCase().includes(searchQuery.toLowerCase()) || (row.company || "").toLowerCase().includes(searchQuery.toLowerCase()) || (row.sales_executive || "").toLowerCase().includes(searchQuery.toLowerCase()) || (row.sales_manager || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesManager = managerFilter === "All" || row.sales_manager === managerFilter;
      const matchesExecutive = executiveFilter === "All" || row.sales_executive === executiveFilter;
      return matchesSearch && matchesManager && matchesExecutive;
    });
  }, [data?.customers_details, searchQuery, managerFilter, executiveFilter]);
  const liveReconciledRevenue = filteredRevenue.reduce((sum, r) => sum + (r.amount || 0), 0);
  const liveReconciledCustomersCount = new Set(
    filteredCustomers.map((c) => c.customer_name || c.company)
  ).size;
  const uniqueManagers = Array.from(
    /* @__PURE__ */ new Set([
      ...(data?.revenue_details || []).map((r) => r.sales_manager),
      ...(data?.customers_details || []).map((c) => c.sales_manager)
    ])
  ).filter(Boolean);
  const uniqueExecutives = Array.from(
    /* @__PURE__ */ new Set([
      ...(data?.revenue_details || []).map((r) => r.sales_executive),
      ...(data?.customers_details || []).map((c) => c.sales_executive)
    ])
  ).filter(Boolean);
  const managerRevenueShares = useMemo(() => {
    if (!data?.manager_performance || data.manager_performance.length === 0) return [];
    return data.manager_performance.map((mgr) => {
      const wonRev = safeNum(mgr.won_revenue);
      const sharePct = totalRevenue > 0 ? (wonRev / totalRevenue * 100).toFixed(1) : "0.0";
      return {
        manager: mgr.sales_manager,
        won_revenue: wonRev,
        won_deals: safeNum(mgr.won_deals),
        pipeline: safeNum(mgr.pipeline),
        share: `${sharePct}%`,
        shareNum: Number(sharePct)
      };
    });
  }, [data?.manager_performance, totalRevenue]);
  const executiveLeaderboard = useMemo(() => {
    if (!data?.executive_performance || data.executive_performance.length === 0) return [];
    return data.executive_performance.map((exec) => {
      const wonRev = safeNum(exec.won_revenue);
      const sharePct = totalRevenue > 0 ? (wonRev / totalRevenue * 100).toFixed(1) : "0.0";
      return {
        executive: exec.sales_executive,
        manager: exec.sales_manager,
        won_revenue: wonRev,
        won_deals: safeNum(exec.won_deals),
        pipeline: safeNum(exec.pipeline),
        share: `${sharePct}%`
      };
    });
  }, [data?.executive_performance, totalRevenue]);
  const productAnalytics = useMemo(() => {
    const map = {};
    const custList = data?.customers_details || [];
    for (const c of custList) {
      const prod = (c.product || "Unlisted Product").trim();
      if (!map[prod]) map[prod] = { product: prod, revenue: 0, deals: 0, customers: [], executives: /* @__PURE__ */ new Set(), managers: /* @__PURE__ */ new Set(), amounts: [] };
      const amt = safeNum(c.amount);
      map[prod].revenue += amt;
      map[prod].deals += 1;
      map[prod].amounts.push(amt);
      if (c.customer_name) map[prod].customers.push({ name: c.customer_name, company: c.company || "", amount: amt, executive: c.sales_executive || "\u2014", manager: c.sales_manager || "\u2014" });
      if (c.sales_executive) map[prod].executives.add(c.sales_executive);
      if (c.sales_manager) map[prod].managers.add(c.sales_manager);
    }
    const revList = data?.revenue_details || [];
    for (const r of revList) {
      const prod = (r.product || r.customer || "Won Deal").trim();
    }
    const maxRev = Math.max(...Object.values(map).map((p) => p.revenue), 1);
    return Object.values(map).map((p) => ({
      ...p,
      executives: Array.from(p.executives),
      managers: Array.from(p.managers),
      avg_deal: p.deals > 0 ? Math.round(p.revenue / p.deals) : 0,
      share: totalRevenue > 0 ? (p.revenue / totalRevenue * 100).toFixed(1) : "0.0",
      bar_pct: Math.round(p.revenue / maxRev * 100)
    })).sort((a, b) => b.revenue - a.revenue);
  }, [data?.customers_details, totalRevenue]);
  const MONTHLY_TARGET = Math.round(resolvedAnnualTarget / 12);
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyTargetData = useMemo(() => {
    const achieved = {};
    const revList = data?.revenue_details || [];
    for (const r of revList) {
      const dateStr = r.date || "";
      let monthIdx = -1;
      if (dateStr.includes("/")) {
        const parts = dateStr.split("/");
        monthIdx = parseInt(parts[1], 10) - 1;
      } else if (dateStr.includes("-")) {
        monthIdx = parseInt(dateStr.split("-")[1], 10) - 1;
      }
      if (monthIdx >= 0 && monthIdx <= 11) {
        achieved[monthIdx] = (achieved[monthIdx] || 0) + safeNum(r.amount);
      }
    }
    const currentMonth = (/* @__PURE__ */ new Date()).getMonth();
    return MONTH_NAMES.map((m, i) => {
      const act = achieved[i] || 0;
      const pct = MONTHLY_TARGET > 0 ? Math.min(100, Math.round(act / MONTHLY_TARGET * 100)) : 0;
      return {
        month: m,
        target: MONTHLY_TARGET,
        achieved: act,
        pct,
        isCurrent: i === currentMonth,
        isPast: i < currentMonth,
        isFuture: i > currentMonth
      };
    });
  }, [data?.revenue_details]);
  const modalTargetsData = useMemo(() => {
    const achieved = {};
    const revList = data?.revenue_details || [];
    for (const r of revList) {
      const dateStr = r.date || "";
      let year = -1;
      let monthIdx = -1;
      if (dateStr.includes("/")) {
        const parts = dateStr.split("/");
        monthIdx = parseInt(parts[1], 10) - 1;
        year = parseInt(parts[2], 10);
      } else if (dateStr.includes("-")) {
        const parts = dateStr.split("-");
        monthIdx = parseInt(parts[1], 10) - 1;
        year = parseInt(parts[0], 10);
      }
      if (year === Number(targetsYearFilter)) {
        if (monthIdx >= 0 && monthIdx <= 11) {
          achieved[monthIdx] = (achieved[monthIdx] || 0) + Number(r.amount || 0);
        }
      }
    }
    return MONTH_NAMES.map((m, i) => {
      const act = achieved[i] || 0;
      return {
        month: m,
        target: MONTHLY_TARGET,
        achieved: act,
        pct: MONTHLY_TARGET > 0 ? Math.round(act / MONTHLY_TARGET * 100) : 0
      };
    });
  }, [data?.revenue_details, targetsYearFilter]);
  const availableYears = useMemo(() => {
    const years = /* @__PURE__ */ new Set([(/* @__PURE__ */ new Date()).getFullYear(), 2025, 2024]);
    const revList = data?.revenue_details || [];
    for (const r of revList) {
      const dateStr = r.date || "";
      let year = -1;
      if (dateStr.includes("/")) {
        year = parseInt(dateStr.split("/")[2], 10);
      } else if (dateStr.includes("-")) {
        year = parseInt(dateStr.split("-")[0], 10);
      }
      if (year > 2e3) years.add(year);
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [data?.revenue_details]);
  const handleExportStatement = (format) => {
    const statementRows = [
      { Metric: "Total Realized Revenue (Won Deals)", Amount: `\u20B9${totalRevenue.toLocaleString()}` },
      { Metric: "Active Open Pipeline", Amount: `\u20B9${totalPipeline.toLocaleString()}` },
      { Metric: "Annual Sales Target", Amount: `\u20B9${ANNUAL_TARGET.toLocaleString()} (\u20B9${(ANNUAL_TARGET / 1e7).toFixed(2)} Cr)` },
      { Metric: "Target Achievement %", Amount: `${targetAchievementRate}%` },
      { Metric: "Total Operational Expenses", Amount: `\u20B9${totalOperationalExpenses.toLocaleString()}` },
      { Metric: "Net Profit", Amount: `\u20B9${netProfit.toLocaleString()}` },
      { Metric: "Net Margin %", Amount: `${netProfitMargin}%` },
      { Metric: "Won Deals Count", Amount: `${totalWonDealsCount} Deals` },
      { Metric: "Unique Client Accounts", Amount: `${totalCustomersCount} Accounts` }
    ];
    if (format === "csv") {
      exportToCSV("CEO_Sales_Revenue_Statement", statementRows);
    } else if (format === "excel") {
      exportToExcel("CEO_Sales_Revenue_Statement", statementRows);
    } else if (format === "pdf") {
      exportToPDF(
        "CEO_Sales_Revenue_Statement",
        "Twite Connect - CEO Executive Sales & Revenue Statement",
        statementRows
      );
    }
    showToast(`Financial statement exported as ${format.toUpperCase()}`, "success");
  };
  return /* @__PURE__ */ React.createElement("div", { className: "mx-auto max-w-[1600px] space-y-6 pb-12" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "grid size-8 place-items-center rounded-xl bg-[#F8CAE4]/25 text-[#832D51]" }, /* @__PURE__ */ React.createElement(TrendingUp, { className: "size-4.5" })), /* @__PURE__ */ React.createElement("h1", { className: "text-xl sm:text-2xl font-black text-slate-900 tracking-tight" }, "Sales & Revenue")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500 font-medium mt-1" }, "Unified executive command center: Sales pipeline, won revenue, targets, operational expenses, and net margin")), /* @__PURE__ */ React.createElement("div", { className: "flex border-b border-slate-200/50 mt-1 gap-5 px-1.5 pb-0.5" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setCeoActiveTab("overview"),
      className: `pb-2 text-xs font-black border-b-2 transition cursor-pointer ${ceoActiveTab === "overview" ? "border-[#832D51] text-[#832D51]" : "border-transparent text-slate-400 hover:text-slate-700"}`
    },
    "Overview Dashboard"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setCeoActiveTab("reports"),
      className: `pb-2 text-xs font-black border-b-2 transition cursor-pointer ${ceoActiveTab === "reports" ? "border-[#832D51] text-[#832D51]" : "border-transparent text-slate-400 hover:text-slate-700"}`
    },
    "Sales Manager Reports"
  ))), ceoActiveTab === "overview" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 flex-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center bg-slate-100 rounded-xl p-0.5 sm:p-1 text-[11px] font-bold border border-slate-200" }, ["Today", "This Week", "This Month", "Custom Date"].map((t) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: t,
      onClick: () => {
        setDateFilter(t);
        if (t !== "Custom Date") setCustomRangeApplied(null);
      },
      className: `px-2.5 py-1 rounded-lg transition-all duration-150 active:scale-95 cursor-pointer ${dateFilter === t ? "bg-[#832D51] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"}`
    },
    t
  ))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: fetchUnifiedData,
      disabled: loading,
      className: "flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1 text-[11px] sm:text-xs font-bold text-slate-700 transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-50"
    },
    /* @__PURE__ */ React.createElement(RefreshCw, { className: `size-3.5 ${loading ? "animate-spin" : ""}` }),
    "Refresh"
  )), dateFilter === "Custom Date" && /* @__PURE__ */ React.createElement(
    "form",
    {
      onSubmit: handleApplyCustomRange,
      className: "flex items-center gap-3 bg-white p-3 sm:p-4 border border-slate-200 rounded-xl shadow-2xs flex-wrap"
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-bold text-slate-500" }, "From:"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "date",
        value: fromDate,
        onChange: (e) => setFromDate(e.target.value),
        className: "h-8 rounded-lg border border-slate-200 px-2 text-xs font-semibold text-slate-800"
      }
    )),
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-bold text-slate-500" }, "To:"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "date",
        value: toDate,
        onChange: (e) => setToDate(e.target.value),
        className: "h-8 rounded-lg border border-slate-200 px-2 text-xs font-semibold text-slate-800"
      }
    )),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "submit",
        className: "bg-[#832D51] hover:bg-[#6a2240] text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all duration-150 active:scale-95 cursor-pointer"
      },
      "Apply Range"
    )
  ), /* @__PURE__ */ React.createElement("div", { className: "grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setShowFinancialReportModal(true);
      },
      className: `text-left rounded-2xl p-3.5 sm:p-4 transition-all duration-150 relative overflow-hidden group cursor-pointer active:scale-95 ${activeKpi === "revenue" && wonToggle ? "bg-[#832D51] text-white border-2 border-[#832D51] shadow-md" : "bg-[#DCFCE7] text-slate-900 border-2 border-[#16A34A] shadow-sm hover:shadow-md"}`
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center" }, /* @__PURE__ */ React.createElement(
      "span",
      {
        className: `text-[10px] font-black uppercase tracking-wider ${activeKpi === "revenue" && wonToggle ? "text-pink-200" : "text-[#15803D]"}`
      },
      "Total Revenue"
    ), /* @__PURE__ */ React.createElement(
      "span",
      {
        className: `grid size-7 place-items-center rounded-lg ${activeKpi === "revenue" && wonToggle ? "bg-white/20 text-white" : "bg-[#16A34A]/20 text-[#15803D]"}`
      },
      /* @__PURE__ */ React.createElement(DollarSign, { className: "size-4" })
    )),
    /* @__PURE__ */ React.createElement("p", { className: "text-xl sm:text-2xl font-black tracking-tight mt-2 text-slate-950" }, "\u20B9", totalRevenue.toLocaleString()),
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mt-1.5 pt-1.5 border-t border-black/10" }, /* @__PURE__ */ React.createElement(
      "span",
      {
        className: `text-[10px] font-bold ${activeKpi === "revenue" && wonToggle ? "text-pink-100" : "text-[#166534]"}`
      },
      "Realized won deals"
    ), /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center rounded-md bg-[#16A34A]/20 px-1.5 py-0.5 text-[9px] font-black text-[#15803D]" }, "Won")),
    /* @__PURE__ */ React.createElement("div", { className: "mt-2 pt-1 border-t border-black/10 flex items-center gap-1 text-[10px] font-bold text-[#15803D]" }, /* @__PURE__ */ React.createElement("span", null, "\u25BC Showing list"))
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setActiveKpi("customers");
        setWonToggle(false);
      },
      className: `text-left rounded-2xl p-3.5 sm:p-4 transition-all duration-150 relative overflow-hidden group cursor-pointer active:scale-95 ${activeKpi === "customers" && !wonToggle ? "bg-[#832D51] text-white border-2 border-[#832D51] shadow-md" : "bg-[#DBEAFE] text-slate-900 border-2 border-[#2563EB] shadow-sm hover:shadow-md"}`
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center" }, /* @__PURE__ */ React.createElement(
      "span",
      {
        className: `text-[10px] font-black uppercase tracking-wider ${activeKpi === "customers" && !wonToggle ? "text-pink-200" : "text-[#1E40AF]"}`
      },
      "Total Customers"
    ), /* @__PURE__ */ React.createElement(
      "span",
      {
        className: `grid size-7 place-items-center rounded-lg ${activeKpi === "customers" && !wonToggle ? "bg-white/20 text-white" : "bg-[#2563EB]/20 text-[#1E40AF]"}`
      },
      /* @__PURE__ */ React.createElement(Building2, { className: "size-4" })
    )),
    /* @__PURE__ */ React.createElement("p", { className: "text-xl sm:text-2xl font-black tracking-tight mt-2 text-slate-950" }, totalCustomersCount),
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mt-1.5 pt-1.5 border-t border-black/10" }, /* @__PURE__ */ React.createElement(
      "span",
      {
        className: `text-[10px] font-bold ${activeKpi === "customers" && !wonToggle ? "text-pink-100" : "text-[#1D4ED8]"}`
      },
      "Accounts in period"
    ), /* @__PURE__ */ React.createElement("span", { className: "text-[9px] font-black text-[#1E40AF]" }, "Directory")),
    /* @__PURE__ */ React.createElement("div", { className: "mt-2 pt-1 border-t border-black/10 flex items-center gap-1 text-[10px] font-bold text-[#1E40AF]" }, /* @__PURE__ */ React.createElement("span", null, "\u25BC Showing list"))
  ), /* @__PURE__ */ React.createElement("div", { className: "bg-[#CFFAFE] border-2 border-[#0891B2] text-slate-900 rounded-2xl p-3.5 sm:p-4 shadow-sm transition-all duration-150 hover:scale-[1.01] active:scale-95 cursor-pointer" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-black uppercase tracking-wider text-[#155E75]" }, "Won Deals"), /* @__PURE__ */ React.createElement("span", { className: "grid size-7 place-items-center rounded-lg bg-[#0891B2]/20 text-[#155E75]" }, /* @__PURE__ */ React.createElement(CheckCircle2, { className: "size-4" }))), /* @__PURE__ */ React.createElement("p", { className: "text-xl sm:text-2xl font-black tracking-tight mt-2 text-slate-950" }, totalWonDealsCount), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mt-1.5 pt-1.5 border-t border-black/10" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-bold text-[#0E7490]" }, "Converted orders"), /* @__PURE__ */ React.createElement("span", { className: "text-[9px] font-bold text-[#155E75]" }, "Closed")), /* @__PURE__ */ React.createElement("div", { className: "mt-2 pt-1 border-t border-black/10 flex items-center gap-1 text-[10px] font-bold text-[#155E75]" }, /* @__PURE__ */ React.createElement("span", null, "\u25BC Showing list"))), /* @__PURE__ */ React.createElement("div", { className: "bg-[#FEF08A] border-2 border-[#CA8A04] text-slate-900 rounded-2xl p-3.5 sm:p-4 shadow-sm transition-all duration-150 hover:scale-[1.01] active:scale-95 cursor-pointer" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-black uppercase tracking-wider text-[#854D0E]" }, "Net Margin"), /* @__PURE__ */ React.createElement("span", { className: "grid size-7 place-items-center rounded-lg bg-[#CA8A04]/20 text-[#854D0E]" }, /* @__PURE__ */ React.createElement(TrendingUp, { className: "size-4" }))), /* @__PURE__ */ React.createElement("div", { className: "flex items-baseline gap-1.5 mt-2" }, /* @__PURE__ */ React.createElement("p", { className: "text-xl sm:text-2xl font-black tracking-tight text-slate-950" }, netProfitMargin, "%"), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-[#854D0E]" }, "margin")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mt-1.5 pt-1.5 border-t border-black/10" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-bold text-[#A16207]" }, "\u20B9", netProfit.toLocaleString(), " net"), /* @__PURE__ */ React.createElement("span", { className: "text-[9px] font-bold text-[#854D0E]" }, "After Expenses")), /* @__PURE__ */ React.createElement("div", { className: "mt-2 pt-1 border-t border-black/10 flex items-center gap-1 text-[10px] font-bold text-[#854D0E]" }, /* @__PURE__ */ React.createElement("span", null, "\u25BC Showing list"))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setShowTargetsModal(true),
      className: "text-left bg-[#F3E8FF] border-2 border-[#9333EA] text-slate-900 rounded-2xl p-3.5 sm:p-4 shadow-sm transition-all duration-150 active:scale-95 cursor-pointer"
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-black uppercase tracking-wider text-[#6B21A8]" }, "Target Achieved"), /* @__PURE__ */ React.createElement("span", { className: "grid size-7 place-items-center rounded-lg bg-[#9333EA]/20 text-[#6B21A8]" }, /* @__PURE__ */ React.createElement(Target, { className: "size-4" }))),
    /* @__PURE__ */ React.createElement("p", { className: "text-xl sm:text-2xl font-black tracking-tight mt-2 text-slate-950" }, targetAchievementRate, "%"),
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mt-1.5 pt-1.5 border-t border-black/10" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-bold text-[#7E22CE]" }, "YTD Target Progress"), /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center rounded-md bg-[#9333EA]/20 px-1.5 py-0.5 text-[9px] font-black text-[#6B21A8]" }, "Target")),
    /* @__PURE__ */ React.createElement("div", { className: "mt-2 pt-1 border-t border-black/10 flex items-center gap-1 text-[10px] font-bold text-[#6B21A8]" }, /* @__PURE__ */ React.createElement("span", null, "\u25BC Showing list"))
  ), /* @__PURE__ */ React.createElement("div", { className: "bg-[#FFE4E6] border-2 border-[#E11D48] text-slate-900 rounded-2xl p-3.5 sm:p-4 shadow-sm transition-all duration-150 hover:scale-[1.01] active:scale-95 cursor-pointer" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-black uppercase tracking-wider text-[#9F1239]" }, "Approved Expense Claims"), /* @__PURE__ */ React.createElement("span", { className: "grid size-7 place-items-center rounded-lg bg-[#E11D48]/20 text-[#9F1239]" }, /* @__PURE__ */ React.createElement(Wallet, { className: "size-4" }))), /* @__PURE__ */ React.createElement("p", { className: "text-xl sm:text-2xl font-black tracking-tight mt-2 text-slate-950" }, "\u20B9", totalOperationalExpenses.toLocaleString()), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mt-1.5 pt-1.5 border-t border-black/10" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-bold text-[#BE123C]" }, approvedExpenseCount > 0 ? `${approvedExpenseCount} approved claim${approvedExpenseCount !== 1 ? "s" : ""}` : "Executive field claims"), /* @__PURE__ */ React.createElement("span", { className: "text-[9px] font-bold text-[#9F1239]" }, "Approved")), /* @__PURE__ */ React.createElement("div", { className: "mt-2 pt-1 border-t border-black/10 flex items-center gap-1 text-[10px] font-bold text-[#9F1239]" }, /* @__PURE__ */ React.createElement("span", null, "\u25BC Showing list")))), productAnalytics.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" }, productAnalytics.map((p, idx) => {
    const isTop = idx === 0;
    const isLow = idx === productAnalytics.length - 1 && productAnalytics.length > 1;
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: p.product,
        onClick: () => setSelectedProduct(selectedProduct?.product === p.product ? null : p),
        className: `text-left rounded-2xl p-4 border transition-all duration-200 cursor-pointer ${selectedProduct?.product === p.product ? "bg-[#832D51] text-white border-[#832D51] shadow-md ring-2 ring-[#832D51]/25" : "bg-white border-slate-200/90 hover:border-[#832D51] hover:shadow-sm"}`
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5" }, isTop && /* @__PURE__ */ React.createElement("span", { className: "text-[10px]" }, "\u{1F3C6}"), isLow && /* @__PURE__ */ React.createElement("span", { className: "text-[10px]" }, "\u{1F4C9}"), /* @__PURE__ */ React.createElement("span", { className: `text-[9px] font-black rounded-full px-2 py-0.5 ${selectedProduct?.product === p.product ? "bg-white/20 text-white" : isTop ? "bg-emerald-50 text-emerald-700" : isLow ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-500"}` }, "#", idx + 1), /* @__PURE__ */ React.createElement("span", { className: `text-[9px] font-bold uppercase tracking-wider ${selectedProduct?.product === p.product ? "text-pink-200" : "text-slate-400"}` }, "Product")), /* @__PURE__ */ React.createElement("span", { className: `text-[9px] font-black ${selectedProduct?.product === p.product ? "text-pink-200" : "text-slate-400"}` }, p.share, "% share")),
      /* @__PURE__ */ React.createElement("p", { className: `text-xs font-black leading-tight mb-2.5 ${selectedProduct?.product === p.product ? "text-white" : "text-slate-900"}` }, p.product),
      /* @__PURE__ */ React.createElement("div", { className: `w-full rounded-full h-1.5 mb-2 overflow-hidden ${selectedProduct?.product === p.product ? "bg-white/25" : "bg-slate-100"}` }, /* @__PURE__ */ React.createElement(
        "div",
        {
          className: `h-1.5 rounded-full transition-all duration-500 ${selectedProduct?.product === p.product ? "bg-white" : isTop ? "bg-emerald-500" : isLow ? "bg-rose-400" : "bg-[#832D51]"}`,
          style: { width: `${p.bar_pct}%` }
        }
      )),
      /* @__PURE__ */ React.createElement("p", { className: `text-xl font-black ${selectedProduct?.product === p.product ? "text-white" : "text-slate-950"}` }, "\u20B9", p.revenue.toLocaleString()),
      /* @__PURE__ */ React.createElement("div", { className: `flex items-center justify-between mt-1.5 pt-2 border-t text-[9px] font-bold ${selectedProduct?.product === p.product ? "text-pink-100 border-white/20" : "text-slate-400 border-slate-100"}` }, /* @__PURE__ */ React.createElement("span", null, p.deals, " client", p.deals !== 1 ? "s" : ""), /* @__PURE__ */ React.createElement("span", null, "Avg \u20B9", p.avg_deal.toLocaleString()))
    );
  })), selectedProduct && /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-[#832D51]/20 overflow-hidden bg-white shadow-sm" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between px-5 py-3.5 bg-[#832D51] text-white" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2.5" }, /* @__PURE__ */ React.createElement(Layers, { className: "size-4" }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-black" }, selectedProduct.product), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-pink-200 font-semibold" }, "\u20B9", selectedProduct.revenue.toLocaleString(), " \xB7 ", selectedProduct.deals, " clients \xB7 ", selectedProduct.share, "% revenue share"))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setSelectedProduct(null),
      className: "grid size-7 place-items-center rounded-lg bg-white/15 hover:bg-white/25 transition cursor-pointer"
    },
    /* @__PURE__ */ React.createElement(X, { className: "size-3.5" })
  )), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 border-b border-slate-100" }, [
    { label: "Total Revenue", value: `\u20B9${selectedProduct.revenue.toLocaleString()}`, color: "text-[#832D51]" },
    { label: "Total Clients", value: selectedProduct.deals, color: "text-slate-900" },
    { label: "Avg Deal Size", value: `\u20B9${selectedProduct.avg_deal.toLocaleString()}`, color: "text-indigo-700" },
    { label: "Revenue Share", value: `${selectedProduct.share}%`, color: "text-emerald-700" }
  ].map((m) => /* @__PURE__ */ React.createElement("div", { key: m.label, className: "bg-slate-50 rounded-xl border border-slate-200/80 p-3.5" }, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] font-black uppercase tracking-wider text-slate-400" }, m.label), /* @__PURE__ */ React.createElement("p", { className: `text-lg font-black mt-1 ${m.color}` }, m.value)))), /* @__PURE__ */ React.createElement("div", { className: "grid gap-5 lg:grid-cols-3 p-5" }, /* @__PURE__ */ React.createElement("div", { className: "lg:col-span-2 space-y-2" }, /* @__PURE__ */ React.createElement("h4", { className: "text-[10px] font-black uppercase tracking-wider text-slate-500" }, "Clients using this product"), /* @__PURE__ */ React.createElement("div", { className: "rounded-xl border border-slate-200/80 overflow-hidden" }, /* @__PURE__ */ React.createElement("table", { className: "w-full text-xs text-left" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "bg-slate-50 border-b border-slate-200/60 text-slate-400 font-bold uppercase tracking-wider text-[9px]" }, /* @__PURE__ */ React.createElement("th", { className: "px-4 py-2.5" }, "Client"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-2.5" }, "Company"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-2.5" }, "Executive"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-2.5 text-right" }, "Value"))), /* @__PURE__ */ React.createElement("tbody", { className: "divide-y divide-slate-100 font-medium" }, selectedProduct.customers.length === 0 ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 4, className: "py-6 text-center text-slate-400 font-bold text-[10px]" }, "No client data")) : selectedProduct.customers.map((c, i) => /* @__PURE__ */ React.createElement("tr", { key: i, className: "hover:bg-slate-50/60 transition" }, /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2.5 font-bold text-slate-900 text-[11px]" }, c.name), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2.5 text-slate-500 text-[10px]" }, c.company || "\u2014"), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2.5 text-slate-600 text-[10px]" }, c.executive), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2.5 text-right font-black text-[#832D51] text-[11px]" }, "\u20B9", c.amount.toLocaleString()))))))), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h4", { className: "text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2" }, "Executives Selling"), selectedProduct.executives.length === 0 ? /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-400 font-semibold" }, "\u2014") : /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5" }, selectedProduct.executives.map((e) => /* @__PURE__ */ React.createElement("div", { key: e, className: "flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2" }, /* @__PURE__ */ React.createElement("span", { className: "size-5 rounded-full bg-[#F8CAE4]/40 text-[#832D51] text-[9px] font-black grid place-items-center" }, (e || "?")[0].toUpperCase()), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-bold text-slate-800 truncate" }, e))))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h4", { className: "text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2" }, "Under Managers"), selectedProduct.managers.length === 0 ? /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-400 font-semibold" }, "\u2014") : /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5" }, selectedProduct.managers.map((m) => /* @__PURE__ */ React.createElement("div", { key: m, className: "flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2" }, /* @__PURE__ */ React.createElement("span", { className: "size-5 rounded-full bg-indigo-50 text-indigo-700 text-[9px] font-black grid place-items-center" }, (m || "?")[0].toUpperCase()), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-bold text-slate-800 truncate" }, m)))))))), /* @__PURE__ */ React.createElement("div", { className: "bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "grid size-6 place-items-center rounded-lg bg-[#F8CAE4]/25 text-[#832D51]" }, /* @__PURE__ */ React.createElement(SlidersHorizontal, { className: "size-3.5" })), /* @__PURE__ */ React.createElement("h2", { className: "text-sm font-black text-slate-900 uppercase tracking-wider" }, "Sales Performance & Ledger Database")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500 font-medium mt-0.5" }, "Live customer accounts, deal closures, and sales breakdown")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setWonToggle(false),
      className: `px-3 py-1 rounded-lg transition cursor-pointer ${!wonToggle ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`
    },
    "All Customers (",
    totalCustomersCount,
    ")"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setWonToggle(true),
      className: `px-3 py-1 rounded-lg transition cursor-pointer ${wonToggle ? "bg-[#832D51] text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`
    },
    "Won Deals (",
    totalWonDealsCount,
    ")"
  )))), /* @__PURE__ */ React.createElement("div", { className: "grid gap-3 sm:grid-cols-3" }, /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement(Search, { className: "absolute left-3 top-2.5 size-4 text-slate-400" }), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      placeholder: "Search customer, company, executive...",
      value: searchQuery,
      onChange: (e) => setSearchQuery(e.target.value),
      className: "w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#832D51] transition"
    }
  )), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: managerFilter,
      onChange: (e) => setManagerFilter(e.target.value),
      className: "bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#832D51] cursor-pointer"
    },
    /* @__PURE__ */ React.createElement("option", { value: "All" }, "All Sales Managers"),
    uniqueManagers.map((m) => /* @__PURE__ */ React.createElement("option", { key: m, value: m }, m))
  ), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: executiveFilter,
      onChange: (e) => setExecutiveFilter(e.target.value),
      className: "bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#832D51] cursor-pointer"
    },
    /* @__PURE__ */ React.createElement("option", { value: "All" }, "All Sales Executives"),
    uniqueExecutives.map((ex) => /* @__PURE__ */ React.createElement("option", { key: ex, value: ex }, ex))
  )), /* @__PURE__ */ React.createElement("div", { className: "border border-slate-100 rounded-2xl overflow-hidden shadow-2xs" }, /* @__PURE__ */ React.createElement("div", { className: "overflow-x-auto" }, wonToggle ? (
    // Won Ledger Table
    /* @__PURE__ */ React.createElement("table", { className: "w-full text-left border-collapse text-xs" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "bg-slate-50 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider" }, /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3" }, "Closure Date"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3" }, "Sales Manager"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3" }, "Sales Executive"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3" }, "Client / Company"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3 text-right" }, "Realized Won Amount"))), /* @__PURE__ */ React.createElement("tbody", { className: "divide-y divide-slate-100 font-medium" }, filteredRevenue.length === 0 ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 5, className: "py-12 text-center text-slate-400 font-bold" }, "No won transaction records found for the applied filter.")) : filteredRevenue.map((row, i) => /* @__PURE__ */ React.createElement("tr", { key: i, className: "hover:bg-slate-50/50" }, /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5 text-slate-900 font-bold" }, row.date), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5 text-slate-600" }, row.sales_manager), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5 text-slate-600" }, row.sales_executive), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5 text-slate-900 font-bold" }, row.customer), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5 text-right font-black text-[#832D51]" }, "\u20B9", (row.amount || 0).toLocaleString())))))
  ) : (
    // Customers Directory Table
    /* @__PURE__ */ React.createElement("table", { className: "w-full text-left border-collapse text-xs" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "bg-slate-50 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider" }, /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3" }, "Sales Manager"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3" }, "Sales Executive"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3" }, "Customer Name"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3" }, "Company"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3" }, "Product / Service"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3" }, "Status"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3 text-right" }, "Contract Value"))), /* @__PURE__ */ React.createElement("tbody", { className: "divide-y divide-slate-100 font-medium" }, filteredCustomers.length === 0 ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 7, className: "py-12 text-center text-slate-400 font-bold" }, "No customer accounts found for the applied filter.")) : filteredCustomers.map((row, i) => /* @__PURE__ */ React.createElement("tr", { key: i, className: "hover:bg-slate-50/50" }, /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5 text-slate-600" }, row.sales_manager), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5 text-slate-600" }, row.sales_executive), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5 font-bold text-slate-900" }, row.customer_name), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5 text-slate-500" }, row.company), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5 text-slate-600" }, row.product), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5" }, /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center rounded-md bg-[#CFDD9D]/20 px-2 py-0.5 font-extrabold text-[#3a7d63] text-[10px]" }, row.status)), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5 text-right font-black text-slate-950" }, "\u20B9", (row.amount || 0).toLocaleString())))))
  ))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end pt-1" }, /* @__PURE__ */ React.createElement("div", { className: "bg-[#F8CAE4]/20 border border-[#EA6993]/20 rounded-2xl px-5 py-2.5 text-right" }, wonToggle ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-black text-slate-500 uppercase tracking-widest block" }, "Filtered Won Revenue"), /* @__PURE__ */ React.createElement("span", { className: "text-lg font-black text-[#832D51] mt-0.5 block" }, "\u20B9", liveReconciledRevenue.toLocaleString())) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-black text-slate-500 uppercase tracking-widest block" }, "Filtered Customers Count"), /* @__PURE__ */ React.createElement("span", { className: "text-lg font-black text-[#832D51] mt-0.5 block" }, liveReconciledCustomersCount, " Clients")))))) : (
    /* ── CEO REPORTS REVIEW PANEL ── */
    /* @__PURE__ */ React.createElement("div", { className: "bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center border-b border-slate-100 pb-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-sm font-black text-slate-900" }, "Submitted Manager Sales Reports"), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-bold text-slate-400 mt-1" }, "Review weekly and monthly performance reports submitted by Sales Managers.")), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: fetchCeoReports,
        disabled: loadingCeoReports,
        className: "flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-750 transition cursor-pointer disabled:opacity-50"
      },
      /* @__PURE__ */ React.createElement(RefreshCw, { className: `size-3.5 ${loadingCeoReports ? "animate-spin" : ""}` }),
      "Sync Reports"
    )), loadingCeoReports ? /* @__PURE__ */ React.createElement("div", { className: "py-20 text-center text-slate-400 font-bold flex flex-col items-center justify-center gap-2 text-xs" }, /* @__PURE__ */ React.createElement(RefreshCw, { className: "size-8 animate-spin text-[#832D51]" }), "Loading submitted reports...") : ceoReportsList.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "py-20 text-center text-slate-400 font-bold text-xs" }, "No sales reports have been submitted by Sales Managers yet.") : /* @__PURE__ */ React.createElement("div", { className: "border border-slate-150 rounded-2xl overflow-hidden shadow-2xs" }, /* @__PURE__ */ React.createElement("table", { className: "w-full text-left border-collapse text-xs" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "bg-slate-50 border-b border-slate-150 text-slate-450 font-black uppercase tracking-wider" }, /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3" }, "Reporting Period"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3" }, "Report Type"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3" }, "Submitted By"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-right" }, "Target"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-right" }, "Revenue Won"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-right" }, "Achievement %"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3" }, "Status"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-center" }, "Action"))), /* @__PURE__ */ React.createElement("tbody", { className: "divide-y divide-slate-100 font-bold text-slate-700 bg-white" }, ceoReportsList.map((rep) => {
      const met = rep.metrics || {};
      const isWeekly = rep.report_type === "weekly";
      return /* @__PURE__ */ React.createElement("tr", { key: rep.id, className: "hover:bg-slate-50/40" }, /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 font-black text-slate-900" }, isWeekly ? `Week ${rep.report_period.replace("-W", " W")}` : rep.report_period), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3" }, /* @__PURE__ */ React.createElement("span", { className: `px-2 py-0.5 rounded-md text-[9px] font-black border uppercase tracking-wider ${isWeekly ? "bg-sky-50 text-sky-800 border-sky-100" : "bg-violet-50 text-violet-800 border-violet-100"}` }, rep.report_type)), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 font-semibold" }, rep.manager_name), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 text-right font-semibold" }, "\u20B9", Number(met.target || 0).toLocaleString()), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 text-right font-black text-slate-950" }, "\u20B9", Number(met.actualRevenue || 0).toLocaleString()), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 text-right font-black text-slate-950" }, met.achievementPct || 0, "%"), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3" }, /* @__PURE__ */ React.createElement("span", { className: `inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border ${rep.status === "Reviewed" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"}` }, rep.status === "Reviewed" ? "\u2705 Reviewed" : "\u23F3 Submitted")), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 text-center" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => {
            setViewingCeoReport(rep);
            setCeoRemarks(rep.ceo_remarks || "");
          },
          className: "bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] px-3.5 py-1.5 rounded-lg shadow-2xs transition cursor-pointer"
        },
        "Review & Remarks"
      )));
    })))))
  ), viewingCeoReport && (() => {
    const rep = viewingCeoReport;
    const met = rep.metrics || {};
    const isWeekly = rep.report_type === "weekly";
    const ach = met.achievementPct || 0;
    const achDetails = ach >= 100 ? { label: "Target Achieved", color: "bg-emerald-50 text-emerald-800 border-emerald-200" } : ach >= 70 ? { label: "On Track", color: "bg-blue-50 text-blue-800 border-blue-200" } : { label: "At Risk", color: "bg-rose-50 text-rose-800 border-rose-200" };
    return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white border border-slate-200 shadow-2xl rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 text-slate-805 text-xs" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-base font-black text-slate-900" }, "Review Sales Report (", isWeekly ? "Weekly" : "Monthly", ")"), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-500 font-bold mt-0.5" }, "Period: ", rep.report_period, " | Submitted by ", rep.manager_name)), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setViewingCeoReport(null),
        className: "rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-650 transition cursor-pointer animate-in fade-in"
      },
      /* @__PURE__ */ React.createElement(X, { className: "size-5" })
    )), /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-y-auto p-6 space-y-6" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 p-4 rounded-xl border border-slate-150" }, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] uppercase text-slate-400 font-black block" }, "Target Quota"), /* @__PURE__ */ React.createElement("span", { className: "text-sm font-black text-slate-900" }, "\u20B9", Number(met.target || 0).toLocaleString())), /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 p-4 rounded-xl border border-slate-150" }, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] uppercase text-slate-400 font-black block" }, "Actual Revenue"), /* @__PURE__ */ React.createElement("span", { className: "text-sm font-black text-slate-900" }, "\u20B9", Number(met.actualRevenue || 0).toLocaleString())), /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 p-4 rounded-xl border border-slate-150" }, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] uppercase text-slate-400 font-black block" }, "Achievement Rate"), /* @__PURE__ */ React.createElement("span", { className: "text-sm font-black text-slate-900" }, ach, "%"), /* @__PURE__ */ React.createElement("span", { className: `inline-block ml-2 px-2 py-0.5 rounded-full text-[8px] font-black border ${achDetails.color}` }, achDetails.label)), /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 p-4 rounded-xl border border-slate-150" }, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] uppercase text-slate-400 font-black block" }, "Active Pipeline"), /* @__PURE__ */ React.createElement("span", { className: "text-sm font-black text-slate-900" }, "\u20B9", Number(met.pipelineValue || 0).toLocaleString()))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3.5 p-3.5 bg-slate-50/50 border border-slate-100 rounded-xl" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "text-[8px] uppercase text-slate-400 font-black" }, "New Leads"), /* @__PURE__ */ React.createElement("p", { className: "font-bold text-slate-800 text-xs" }, met.newLeads || 0, " Leads")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "text-[8px] uppercase text-slate-400 font-black font-extrabold" }, "Meetings"), /* @__PURE__ */ React.createElement("p", { className: "font-bold text-slate-800 text-xs" }, met.meetings || 0, " Meetings")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "text-[8px] uppercase text-slate-400 font-black" }, "Deals Won / Lost"), /* @__PURE__ */ React.createElement("p", { className: "font-bold text-slate-800 text-xs" }, met.dealsWon || 0, " Won / ", met.dealsLost || 0, " Lost")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "text-[8px] uppercase text-slate-400 font-black font-extrabold" }, "Conversion"), /* @__PURE__ */ React.createElement("p", { className: "font-bold text-slate-800 text-xs" }, met.conversionRate || 0, "% Success"))), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement("h4", { className: "text-xs font-black uppercase text-slate-400 tracking-wider" }, "Team Performance Breakdown"), /* @__PURE__ */ React.createElement("div", { className: "border border-slate-100 rounded-xl overflow-hidden" }, /* @__PURE__ */ React.createElement("table", { className: "w-full text-left border-collapse text-[11px]" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "bg-slate-50 border-b border-slate-150 text-slate-400 font-bold uppercase" }, /* @__PURE__ */ React.createElement("th", { className: "px-3 py-2" }, "Salesperson"), /* @__PURE__ */ React.createElement("th", { className: "px-3 py-2 text-right" }, "Leads"), /* @__PURE__ */ React.createElement("th", { className: "px-3 py-2 text-right font-extrabold" }, "Won"), /* @__PURE__ */ React.createElement("th", { className: "px-3 py-2 text-right" }, "Revenue Won"), /* @__PURE__ */ React.createElement("th", { className: "px-3 py-2 text-right" }, "Pipeline"))), /* @__PURE__ */ React.createElement("tbody", { className: "divide-y divide-slate-100 font-bold text-slate-700" }, !met.salespersonPerformance || met.salespersonPerformance.length === 0 ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 5, className: "py-4 text-center text-slate-400" }, "No performance records.")) : met.salespersonPerformance.map((sp, idx) => /* @__PURE__ */ React.createElement("tr", { key: idx }, /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 font-black" }, sp.name), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-right font-normal" }, sp.leads), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-right text-emerald-600 font-black" }, sp.wonDeals), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-right" }, "\u20B9", Number(sp.revenue || 0).toLocaleString()), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-right text-[#832D51]" }, "\u20B9", Number(sp.pipeline || 0).toLocaleString()))))))), /* @__PURE__ */ React.createElement("div", { className: "space-y-4 border-t border-slate-100 pt-4" }, /* @__PURE__ */ React.createElement("h4", { className: "text-xs font-black uppercase text-[#832D51] tracking-wider" }, "Manager Analysis Remarks"), /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 sm:grid-cols-2" }, /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 p-3.5 rounded-xl border border-slate-150" }, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] uppercase text-slate-400 font-black block" }, "Key Achievements"), /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-slate-800 mt-1 whitespace-pre-wrap" }, met.keyAchievements || "None")), isWeekly ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 p-3.5 rounded-xl border border-slate-150" }, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] uppercase text-slate-400 font-black block" }, "Pending Activities"), /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-slate-800 mt-1 whitespace-pre-wrap" }, met.pendingActivities || "None")), /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 p-3.5 rounded-xl border border-slate-150" }, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] uppercase text-slate-400 font-black block text-rose-800" }, "Issues / Escalations"), /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-rose-900 mt-1 whitespace-pre-wrap" }, met.issuesEscalations || "None"))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 p-3.5 rounded-xl border border-slate-150" }, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] uppercase text-slate-400 font-black block" }, "Major Challenges"), /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-slate-800 mt-1 whitespace-pre-wrap" }, met.majorChallenges || "None")), /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 p-3.5 rounded-xl border border-slate-150" }, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] uppercase text-slate-400 font-black block" }, "Lost Deal Analysis"), /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-slate-800 mt-1 whitespace-pre-wrap" }, met.lostDealAnalysis || "None")), /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 p-3.5 rounded-xl border border-slate-150" }, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] uppercase text-slate-400 font-black block" }, "Forecast (\u20B9)"), /* @__PURE__ */ React.createElement("p", { className: "font-bold text-slate-900 mt-1" }, "\u20B9", Number(met.forecastVal || 0).toLocaleString())), /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 p-3.5 rounded-xl border border-slate-150" }, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] uppercase text-slate-400 font-black block" }, "Month-on-Month Comparison"), /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-slate-800 mt-1" }, met.prevMonthComparison || "N/A"))), /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 p-3.5 rounded-xl border border-slate-150" }, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] uppercase text-slate-400 font-black block" }, "Action Plan / Next Steps"), /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-slate-800 mt-1 whitespace-pre-wrap" }, met.nextPeriodPlan || "None")))), /* @__PURE__ */ React.createElement("div", { className: "bg-[#832D51]/5 border border-[#832D51]/15 p-5 rounded-2xl space-y-3" }, /* @__PURE__ */ React.createElement("h4", { className: "text-xs font-black uppercase text-[#832D51] tracking-wider flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement(CheckCircle, { className: "size-4" }), "CEO Review & Remarks Feedback"), /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5" }, /* @__PURE__ */ React.createElement("label", { className: "text-[10px] font-black text-slate-400 uppercase tracking-wider block" }, "Remarks / Notes"), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        rows: 3,
        placeholder: "Add CEO remarks, suggestions, and targets updates...",
        value: ceoRemarks,
        onChange: (e) => setCeoRemarks(e.target.value),
        className: "w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-medium focus:outline-none focus:border-[#832D51] text-slate-950"
      }
    )))), /* @__PURE__ */ React.createElement("div", { className: "px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setViewingCeoReport(null),
        className: "px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-black cursor-pointer transition shadow-2xs"
      },
      "Close View"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        disabled: submittingRemarks,
        onClick: async () => {
          setSubmittingRemarks(true);
          try {
            const res = reportAPI.reviewSalesReport ? await reportAPI.reviewSalesReport(rep.id, { status: "Reviewed", ceo_remarks: ceoRemarks }) : await hrmsAPI.reviewSalesReport(rep.id, { status: "Reviewed", ceo_remarks: ceoRemarks });
            if (res && res.data) {
              showToast("Report reviewed successfully!", "success");
              fetchCeoReports();
              setViewingCeoReport(null);
            }
          } catch (err) {
            showToast("Failed to review report", "error");
          } finally {
            setSubmittingRemarks(false);
          }
        },
        className: "px-5 py-2.5 bg-[#832D51] hover:bg-[#6c2442] text-white rounded-xl text-xs font-black cursor-pointer shadow-md transition"
      },
      "Submit Remarks"
    ))));
  })(), showFinancialReportModal && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white border border-slate-200 shadow-2xl rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-[#832D51] text-white" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2.5" }, /* @__PURE__ */ React.createElement("span", { className: "grid size-9 place-items-center rounded-xl bg-white/20 text-white" }, /* @__PURE__ */ React.createElement(TrendingUp, { className: "size-5" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-base font-black tracking-tight" }, "Financial Profit & Loss Statement"), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold text-pink-100 uppercase tracking-widest mt-0.5" }, "Real-time Revenue, Reimbursements & Incentives analysis"))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setShowFinancialReportModal(false),
      className: "rounded-xl p-1.5 text-pink-100 hover:bg-white/10 hover:text-white transition cursor-pointer"
    },
    /* @__PURE__ */ React.createElement(X, { className: "size-5" })
  )), /* @__PURE__ */ React.createElement("div", { className: "p-6 pb-2 border-b border-slate-100 space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/60" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-black text-slate-500 uppercase tracking-wider px-2" }, "Select statement period"), /* @__PURE__ */ React.createElement("div", { className: "flex bg-slate-200/60 p-1 rounded-xl" }, ["Monthly", "Yearly", "Custom"].map((filter) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: filter,
      onClick: () => setModalTimeFilter(filter),
      className: `px-4 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${modalTimeFilter === filter ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-800"}`
    },
    filter
  )))), modalTimeFilter === "Custom" && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 bg-slate-50/50 p-3.5 border border-slate-200/50 rounded-2xl flex-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("label", { className: "text-[10px] font-black text-slate-400 uppercase tracking-wider" }, "From"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "date",
      value: modalFromDate,
      onChange: (e) => setModalFromDate(e.target.value),
      className: "bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#832D51]"
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("label", { className: "text-[10px] font-black text-slate-400 uppercase tracking-wider" }, "To"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "date",
      value: modalToDate,
      onChange: (e) => setModalToDate(e.target.value),
      className: "bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#832D51]"
    }
  )))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-y-auto p-6 space-y-6" }, /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-5" }, /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 border border-slate-200/70 p-4.5 rounded-2xl relative" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center text-slate-400" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-black uppercase tracking-wider" }, "Total Sales Revenue"), /* @__PURE__ */ React.createElement(DollarSign, { className: "size-4 text-[#832D51]" })), /* @__PURE__ */ React.createElement("h4", { className: "text-xl font-black text-slate-900 mt-2" }, "\u20B9", modalTotalRevenue.toLocaleString()), /* @__PURE__ */ React.createElement("p", { className: "text-[9px] text-slate-400 font-bold mt-1" }, "Sum of closed won deals")), /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 border border-slate-200/70 p-4.5 rounded-2xl relative" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center text-slate-400" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-black uppercase tracking-wider" }, "Reimbursements"), /* @__PURE__ */ React.createElement(Wallet, { className: "size-4 text-[#832D51]" })), /* @__PURE__ */ React.createElement("h4", { className: "text-xl font-black text-slate-900 mt-2" }, "\u20B9", modalTotalReimbursements.toLocaleString()), /* @__PURE__ */ React.createElement("p", { className: "text-[9px] text-slate-400 font-bold mt-1" }, "Approved executive expense claims")), /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 border border-slate-200/70 p-4.5 rounded-2xl relative" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center text-slate-400" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-black uppercase tracking-wider" }, "Incentives Given"), /* @__PURE__ */ React.createElement(Award, { className: "size-4 text-[#832D51]" })), /* @__PURE__ */ React.createElement("h4", { className: "text-xl font-black text-slate-900 mt-2" }, "\u20B9", modalTotalIncentives.toLocaleString()), /* @__PURE__ */ React.createElement("p", { className: "text-[9px] text-slate-400 font-bold mt-1" }, "Commission earned by executives")), /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 border border-slate-200/70 p-4.5 rounded-2xl relative" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center text-slate-400" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-black uppercase tracking-wider" }, "Total Salaries"), /* @__PURE__ */ React.createElement(Users, { className: "size-4 text-[#832D51]" })), /* @__PURE__ */ React.createElement("h4", { className: "text-xl font-black text-slate-900 mt-2" }, "\u20B9", modalTotalSalary.toLocaleString()), /* @__PURE__ */ React.createElement("p", { className: "text-[9px] text-slate-400 font-bold mt-1" }, "Salary allocation for active team")), /* @__PURE__ */ React.createElement("div", { className: `p-4.5 rounded-2xl border relative ${isProfit ? "bg-emerald-50/60 border-emerald-200/80 text-emerald-950" : "bg-red-50/60 border-red-200/80 text-red-950"}` }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-black uppercase tracking-wider opacity-85" }, isProfit ? "Net Profit" : "Net Loss"), /* @__PURE__ */ React.createElement(Sparkles, { className: `size-4 ${isProfit ? "text-emerald-600" : "text-red-600"}` })), /* @__PURE__ */ React.createElement("h4", { className: "text-xl font-black mt-2" }, "\u20B9", Math.abs(netProfitLoss).toLocaleString()), /* @__PURE__ */ React.createElement("p", { className: "text-[9px] font-bold mt-1 opacity-70" }, isProfit ? "Revenue - Expenses = Profit" : "Expenses exceeded Revenue"))), /* @__PURE__ */ React.createElement("div", { className: "space-y-3.5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between border-b border-slate-100 pb-2" }, /* @__PURE__ */ React.createElement("h4", { className: "text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement(Calendar, { className: "size-4 text-slate-400" }), "Date-wise Transaction Ledger (", modalRevenueRecords.length + modalReimbursementRecords.length + salariesList.length, " records)"), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-black text-[#832D51] bg-[#F8CAE4]/25 px-2.5 py-1 rounded-md" }, "Total Revenue: \u20B9", modalTotalRevenue.toLocaleString())), /* @__PURE__ */ React.createElement("div", { className: "border border-slate-100 rounded-2xl overflow-hidden shadow-2xs" }, /* @__PURE__ */ React.createElement("div", { className: "overflow-x-auto max-h-[300px]" }, /* @__PURE__ */ React.createElement("table", { className: "w-full text-left border-collapse text-xs" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "bg-slate-50 border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider" }, /* @__PURE__ */ React.createElement("th", { className: "px-4 py-2.5" }, "Date"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-2.5" }, "Transaction Details"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-2.5" }, "Employee / Executive"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-2.5 text-right" }, "Revenue Amount"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-2.5 text-right" }, "Reimbursement"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-2.5 text-right" }, "Incentive"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-2.5 text-right" }, "Salary"))), /* @__PURE__ */ React.createElement("tbody", { className: "divide-y divide-slate-100 font-medium text-slate-800" }, unifiedModalLedger.length === 0 ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 7, className: "py-10 text-center text-slate-400 font-bold" }, "No transactions recorded for this period.")) : unifiedModalLedger.map((group) => /* @__PURE__ */ React.createElement(React.Fragment, { key: group.date }, /* @__PURE__ */ React.createElement("tr", { className: "bg-slate-50/70 border-b border-slate-200" }, /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2 font-black text-slate-900" }, group.date), /* @__PURE__ */ React.createElement("td", { colSpan: 2, className: "px-4 py-2 text-slate-400 font-bold text-[10px] uppercase" }, "Daily Subtotal"), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2 text-right font-black text-slate-950" }, group.totalRevenue > 0 ? `\u20B9${group.totalRevenue.toLocaleString()}` : "\u2014"), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2 text-right font-black text-amber-700" }, group.totalReimbursements > 0 ? `\u20B9${group.totalReimbursements.toLocaleString()}` : "\u2014"), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2 text-right font-black text-emerald-700" }, group.totalIncentives > 0 ? `\u20B9${group.totalIncentives.toLocaleString()}` : "\u2014"), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2 text-right font-black text-[#832D51]" }, group.totalSalary > 0 ? `\u20B9${group.totalSalary.toLocaleString()}` : "\u2014")), group.transactions.map((tx, idx) => /* @__PURE__ */ React.createElement("tr", { key: `${group.date}-${tx.id || idx}`, className: "hover:bg-slate-50/30" }, /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2.5 pl-6 text-slate-400 font-mono text-[10px]" }, "\u21B3 ", tx.type), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2.5 text-slate-600 font-semibold" }, tx.details || "\u2014"), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2.5 text-slate-600" }, tx.sales_executive), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2.5 text-right font-bold text-slate-700" }, tx.amount > 0 ? `\u20B9${tx.amount.toLocaleString()}` : "\u2014"), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2.5 text-right font-bold text-amber-700" }, tx.reimbursement > 0 ? `\u20B9${tx.reimbursement.toLocaleString()}` : "\u2014"), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2.5 text-right font-semibold text-emerald-600" }, tx.incentive > 0 ? `\u20B9${tx.incentive.toLocaleString()}` : "\u2014"), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2.5 text-right font-bold text-[#832D51]" }, tx.salary > 0 ? `\u20B9${tx.salary.toLocaleString()}` : "\u2014"))))))))))), /* @__PURE__ */ React.createElement("div", { className: "px-6 py-4.5 bg-slate-50 border-t border-slate-100 flex justify-end" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setShowFinancialReportModal(false),
      className: "bg-[#832D51] hover:bg-[#6c2442] text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
    },
    "Close Statement"
  )))), showTargetsModal && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white border border-slate-200 shadow-2xl rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-[#832D51] text-white" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2.5" }, /* @__PURE__ */ React.createElement("span", { className: "grid size-9 place-items-center rounded-xl bg-white/20 text-white" }, /* @__PURE__ */ React.createElement(Target, { className: "size-5" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-base font-black tracking-tight" }, "Monthly Sales Target vs Achieved"), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold text-pink-100 uppercase tracking-widest mt-0.5" }, "Yearly Performance Analysis Statement"))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setShowTargetsModal(false),
      className: "rounded-xl p-1.5 text-pink-100 hover:bg-white/10 hover:text-white transition cursor-pointer"
    },
    /* @__PURE__ */ React.createElement(X, { className: "size-5" })
  )), /* @__PURE__ */ React.createElement("div", { className: "p-6 pb-2 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50 border-slate-200/60" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-black text-slate-500 uppercase tracking-wider px-2" }, "Select Target Year"), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: targetsYearFilter,
      onChange: (e) => setTargetsYearFilter(Number(e.target.value)),
      className: "bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#832D51] cursor-pointer shadow-xs"
    },
    availableYears.map((y) => /* @__PURE__ */ React.createElement("option", { key: y, value: y }, y, " Target Year"))
  )), /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-y-auto p-6 space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "border border-slate-100 rounded-2xl overflow-hidden shadow-2xs" }, /* @__PURE__ */ React.createElement("table", { className: "w-full text-left border-collapse text-xs" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "bg-slate-50 border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider" }, /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3" }, "Month"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3 text-right" }, "Target Value"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3 text-right" }, "Achieved Value"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3 text-center" }, "Achievement %"))), /* @__PURE__ */ React.createElement("tbody", { className: "divide-y divide-slate-100 font-medium text-slate-800" }, modalTargetsData.map((m) => /* @__PURE__ */ React.createElement("tr", { key: m.month, className: "hover:bg-slate-50/50" }, /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5 font-bold text-slate-900" }, m.month), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5 text-right text-slate-500" }, "\u20B9", m.target.toLocaleString()), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5 text-right font-black text-slate-900" }, "\u20B9", m.achieved.toLocaleString()), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5 text-center" }, /* @__PURE__ */ React.createElement("span", { className: `inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-black border ${m.achieved >= m.target ? "bg-emerald-50 text-emerald-700 border-emerald-100" : m.pct >= 60 ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-rose-50 text-rose-700 border-rose-100"}` }, m.pct, "%")))))))), /* @__PURE__ */ React.createElement("div", { className: "px-6 py-4.5 bg-slate-50 border-t border-slate-100 flex justify-end" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setShowTargetsModal(false),
      className: "bg-[#832D51] hover:bg-[#6c2442] text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
    },
    "Close Statement"
  )))));
}
export default SalesOverview;
