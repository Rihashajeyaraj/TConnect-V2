import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  RefreshCw,
  Building2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Filter,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  Calendar,
  X,
  Sparkles,
  Info,
  Layers,
  UserCheck,
  Briefcase,
  Target
} from "lucide-react";
import { customerAPI, hrmsAPI, crmAPI } from "../../services/api.js";
import { useToast } from "../../common/ToastContext.jsx";
import useCurrentUser from "../../hooks/useCurrentUser.js";
import { formatDDMMYYYY } from "../../utils/formatUtils.js";
function CeoCustomers() {
  const { showToast } = useToast();
  const currentUser = useCurrentUser();
  const isAdmin = currentUser.role?.toLowerCase() === "admin";
  const [data, setData] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("customers");
  const [employees, setEmployees] = useState([]);
  const [selectedCustIds, setSelectedCustIds] = useState([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedExecutiveId, setSelectedExecutiveId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedManager, setSelectedManager] = useState("All");
  const [selectedExecutive, setSelectedExecutive] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [expandedManagers, setExpandedManagers] = useState({});
  const [expandedExecutives, setExpandedExecutives] = useState({});
  const [selectedCust, setSelectedCust] = useState(null);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const loadCustomerDirectory = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await customerAPI.getCeoCustomerDirectory();
      if (res && res.data) {
        setData(res.data);
        const mgrExpand = {};
        const execExpand = {};
        (res.data.managers || []).forEach((m) => {
          mgrExpand[m.manager_id] = true;
          (m.executives || []).forEach((e, ei) => {
            if (e.customer_count > 0) {
              execExpand[`${m.manager_id}_${e.executive_id || e.executive_name || "ex"}_${ei}`] = true;
            }
          });
        });
        setExpandedManagers(mgrExpand);
        setExpandedExecutives(execExpand);
      } else {
        setData({ managers: [], totals: { managers: 0, executives: 0, customers: 0, revenue: 0 } });
      }
      const empRes = await hrmsAPI.getEmployees().catch(() => null);
      if (empRes && (empRes.data || empRes)) {
        const rawEmps = empRes.data || empRes;
        if (Array.isArray(rawEmps)) {
          setEmployees(rawEmps);
        }
      }
      const leadsRes = await crmAPI.getLeads().catch(() => null);
      if (leadsRes && leadsRes.data && Array.isArray(leadsRes.data)) {
        setLeads(leadsRes.data);
      }
    } catch (err) {
      console.error("Failed to load customer directory:", err);
      setError(err?.message || "Failed to fetch customer directory");
      showToast("Error loading customer directory", "error");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadCustomerDirectory();
  }, []);
  const rawCustomers = [];
  if (data && Array.isArray(data.managers)) {
    data.managers.forEach((mgr) => {
      if (mgr && Array.isArray(mgr.executives)) {
        mgr.executives.forEach((exec) => {
          if (exec && Array.isArray(exec.customers)) {
            exec.customers.forEach((cust) => {
              rawCustomers.push({
                ...cust,
                manager_id: mgr.manager_id,
                manager_name: mgr.manager_name,
                executive_id: exec.executive_id,
                executive_name: exec.executive_name
              });
            });
          }
        });
      }
    });
  }
  const allManagersList = Array.from(/* @__PURE__ */ new Set([
    ...employees.filter((emp) => {
      const r = (emp.role || emp.designation || "").toLowerCase();
      return r.includes("manager");
    }).map((emp) => emp.name || emp.full_name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim()),
    ...rawCustomers.map((c) => c.manager_name)
  ])).filter((name) => name && name !== "Unassigned / Direct" && name !== "Unassigned");
  const allExecutivesList = Array.from(/* @__PURE__ */ new Set([
    ...employees.filter((emp) => {
      const r = (emp.role || emp.designation || "").toLowerCase();
      return r.includes("executive");
    }).map((emp) => emp.name || emp.full_name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim()),
    ...rawCustomers.map((c) => c.executive_name)
  ])).filter((name) => name && name !== "Direct / Unassigned" && name !== "Unassigned");
  const allProductsList = Array.from(/* @__PURE__ */ new Set([
    ...rawCustomers.map((c) => c.product),
    ...leads.map((l) => l.product_name || l.product)
  ])).filter(Boolean);
  const q = searchQuery.toLowerCase().trim();
  const leadsCount = leads.length;
  const filteredCustomers = rawCustomers.filter((cust) => {
    if (q) {
      const matchCust = (cust.customer_name || "").toLowerCase().includes(q);
      const matchComp = (cust.company_name || "").toLowerCase().includes(q);
      const matchID = (cust.customer_id || "").toLowerCase().includes(q);
      const matchProd = (cust.product || "").toLowerCase().includes(q);
      const matchExec = (cust.executive_name || "").toLowerCase().includes(q);
      const matchMgr = (cust.manager_name || "").toLowerCase().includes(q);
      if (!matchCust && !matchComp && !matchID && !matchProd && !matchExec && !matchMgr) return false;
    }
    if (selectedManager !== "All") {
      if (cust.manager_name !== selectedManager) return false;
    }
    if (selectedExecutive !== "All") {
      if (cust.executive_name !== selectedExecutive) return false;
    }
    if (selectedProduct !== "All") {
      if (cust.product !== selectedProduct) return false;
    }
    return true;
  });
  const filteredLeads = leads.filter((lead) => {
    if (q) {
      const matchLead = (lead.name || lead.contact_name || "").toLowerCase().includes(q);
      const matchComp = (lead.company_name || lead.company || "").toLowerCase().includes(q);
      const matchID = (lead.id || lead.lead_id || "").toLowerCase().includes(q);
      const matchProd = (lead.product_name || lead.product || "").toLowerCase().includes(q);
      const matchLoc = (lead.location || lead.city || lead.address || "").toLowerCase().includes(q);
      const matchExec = (lead.sales_executive || lead.assigned_to || "").toLowerCase().includes(q);
      if (!matchLead && !matchComp && !matchID && !matchProd && !matchLoc && !matchExec) return false;
    }
    if (selectedCategory !== "All") {
      const leadCat = lead.category || "Warm";
      if (leadCat.toLowerCase() !== selectedCategory.toLowerCase()) return false;
    }
    if (selectedProduct !== "All") {
      const leadProd = lead.product_name || lead.product || "";
      if (leadProd !== selectedProduct) return false;
    }
    return true;
  });
  const activeExecutives = employees.filter((emp) => {
    const isInactive = ["inactive", "deactivated", "terminated", "disabled", "resigned", "left"].includes((emp.status || "").toLowerCase());
    const isNotActive = emp.is_active === false;
    const isExec = (emp.role || emp.designation || "").toLowerCase().includes("executive");
    return !isInactive && !isNotActive && isExec;
  });
  const totalCompanyCustomers = rawCustomers.length;
  const totalCompanyRevenue = rawCustomers.reduce((sum, c) => sum + (c.amount || c.contract_value || 0), 0);
  const liveUniqueCustomers = filteredCustomers.length;
  const liveTotalRevenue = filteredCustomers.reduce((sum, c) => sum + (c.amount || 0), 0);
  const ITEMS_PER_PAGE = 10;
  const [customerPage, setCustomerPage] = useState(1);
  const [leadPage, setLeadPage] = useState(1);
  useEffect(() => {
    setCustomerPage(1);
    setLeadPage(1);
  }, [searchQuery, selectedManager, selectedExecutive, selectedProduct, selectedCategory]);
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    const dA = String(a.date || a.created_at || a.created_date || "1970-01-01");
    const dB = String(b.date || b.created_at || b.created_date || "1970-01-01");
    return dB.localeCompare(dA);
  });
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    const dA = String(a.date || a.created_at || a.created_date || "1970-01-01");
    const dB = String(b.date || b.created_at || b.created_date || "1970-01-01");
    return dB.localeCompare(dA);
  });
  const customerTotalPages = Math.ceil(sortedCustomers.length / ITEMS_PER_PAGE) || 1;
  const paginatedCustomers = sortedCustomers.slice((customerPage - 1) * ITEMS_PER_PAGE, customerPage * ITEMS_PER_PAGE);
  const leadTotalPages = Math.ceil(sortedLeads.length / ITEMS_PER_PAGE) || 1;
  const paginatedLeads = sortedLeads.slice((leadPage - 1) * ITEMS_PER_PAGE, leadPage * ITEMS_PER_PAGE);
  const liveManagersCount = Array.from(new Set(
    filteredCustomers.map((c) => c.manager_name).filter((name) => name && name !== "Unassigned / Direct" && name !== "Unassigned")
  )).length;
  const liveExecutivesCount = Array.from(new Set(
    filteredCustomers.map((c) => c.executive_name).filter((name) => name && name !== "Direct / Unassigned" && name !== "Unassigned")
  )).length;
  return /* @__PURE__ */ React.createElement("div", { className: "mx-auto max-w-[1600px] space-y-6 pb-12" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "grid size-7 place-items-center rounded-lg bg-[#F8CAE4]/20 text-[#832D51]" }, /* @__PURE__ */ React.createElement(Building2, { className: "size-4.5" })), /* @__PURE__ */ React.createElement("h1", { className: "text-xl font-black text-slate-900 tracking-tight" }, "Customers Directory")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500 font-medium mt-0.5" }, "Centralized organization-wide customer directory grouped by Sales Manager & Executive hierarchy")), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: loadCustomerDirectory,
      disabled: loading,
      className: "flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 transition cursor-pointer disabled:opacity-50"
    },
    /* @__PURE__ */ React.createElement(RefreshCw, { className: `size-3.5 ${loading ? "animate-spin" : ""}` }),
    "Refresh Directory"
  )), /* @__PURE__ */ React.createElement("div", { className: "flex bg-white border border-slate-200/90 p-0.5 sm:p-1 rounded-xl self-start lg:self-auto shrink-0 max-w-[280px] shadow-2xs" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setActiveTab("customers");
        setSelectedCustIds([]);
        setSelectedManager("All");
        setSelectedExecutive("All");
        setSelectedProduct("All");
        setSelectedCategory("All");
        setSearchQuery("");
        setIsTableModalOpen(false);
      },
      className: `flex-1 px-3 py-1 sm:px-3.5 sm:py-1.5 text-[11px] sm:text-xs font-extrabold uppercase rounded-lg transition-all duration-150 active:scale-95 cursor-pointer ${activeTab === "customers" ? "bg-[#832D51] text-white shadow-xs" : "text-slate-500 hover:text-slate-900"}`
    },
    "Customers"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setActiveTab("leads");
        setSelectedCustIds([]);
        setSelectedManager("All");
        setSelectedExecutive("All");
        setSelectedProduct("All");
        setSelectedCategory("All");
        setSearchQuery("");
        setIsTableModalOpen(false);
      },
      className: `flex-1 px-3 py-1 sm:px-3.5 sm:py-1.5 text-[11px] sm:text-xs font-extrabold uppercase rounded-lg transition-all duration-150 active:scale-95 cursor-pointer ${activeTab === "leads" ? "bg-[#832D51] text-white shadow-xs" : "text-slate-500 hover:text-slate-900"}`
    },
    "Leads (",
    leadsCount,
    ")"
  )), activeTab === "customers" ? /* @__PURE__ */ React.createElement("div", { className: "grid gap-2.5 sm:gap-3 sm:grid-cols-2 lg:grid-cols-4" }, /* @__PURE__ */ React.createElement(
    "div",
    {
      onClick: () => {
        setSelectedManager("All");
        setSelectedExecutive("All");
        setSelectedProduct("All");
        setSearchQuery("");
        setIsTableModalOpen(true);
      },
      className: "bg-[#DCFCE7] border-2 border-[#16A34A] rounded-xl p-2.5 shadow-2xs transition-all duration-150 hover:scale-[1.01] active:scale-95 cursor-pointer text-slate-900"
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center" }, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[#15803D]" }, "Total Customers"), /* @__PURE__ */ React.createElement("span", { className: "p-1 rounded-lg bg-[#16A34A]/20 text-[#15803D]" }, /* @__PURE__ */ React.createElement(Building2, { className: "size-3.5" }))),
    /* @__PURE__ */ React.createElement("div", { className: "flex items-baseline justify-between mt-1" }, /* @__PURE__ */ React.createElement("p", { className: "text-base sm:text-lg font-black tracking-tight text-slate-950" }, totalCompanyCustomers), /* @__PURE__ */ React.createElement("span", { className: "text-[9px] font-bold text-[#166534]" }, "Accounts")),
    /* @__PURE__ */ React.createElement("div", { className: "mt-1.5 pt-1 border-t border-[#16A34A]/25 flex items-center gap-1 text-[9px] font-bold text-[#15803D]" }, /* @__PURE__ */ React.createElement("span", null, "\u25B6 Click card to view pop-up table"))
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      onClick: () => {
        setSelectedManager("All");
        setSelectedExecutive("All");
        setSelectedProduct("All");
        setSearchQuery("");
        setIsTableModalOpen(true);
      },
      className: "bg-[#DBEAFE] border-2 border-[#2563EB] rounded-xl p-2.5 shadow-2xs transition-all duration-150 hover:scale-[1.01] active:scale-95 cursor-pointer text-slate-900"
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center" }, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[#1E40AF]" }, "Total Revenue Portfolio"), /* @__PURE__ */ React.createElement("span", { className: "p-1 rounded-lg bg-[#2563EB]/20 text-[#1E40AF]" }, /* @__PURE__ */ React.createElement(DollarSign, { className: "size-3.5" }))),
    /* @__PURE__ */ React.createElement("div", { className: "flex items-baseline justify-between mt-1" }, /* @__PURE__ */ React.createElement("p", { className: "text-base sm:text-lg font-black tracking-tight text-slate-950" }, "\u20B9", totalCompanyRevenue.toLocaleString()), /* @__PURE__ */ React.createElement("span", { className: "text-[9px] font-bold text-[#1D4ED8]" }, "Portfolio")),
    /* @__PURE__ */ React.createElement("div", { className: "mt-1.5 pt-1 border-t border-[#2563EB]/25 flex items-center gap-1 text-[9px] font-bold text-[#1E40AF]" }, /* @__PURE__ */ React.createElement("span", null, "\u25B6 Click card to view pop-up table"))
  )) : /* @__PURE__ */ React.createElement("div", { className: "grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4" }, /* @__PURE__ */ React.createElement(
    "div",
    {
      onClick: () => {
        setSelectedCategory("All");
        setSelectedProduct("All");
        setSearchQuery("");
        setIsTableModalOpen(true);
      },
      className: "bg-[#F3E8FF] border-2 border-[#9333EA] rounded-2xl p-3.5 sm:p-4 shadow-sm transition-all duration-150 hover:scale-[1.01] active:scale-95 cursor-pointer text-slate-900"
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-black uppercase tracking-wider text-[#6B21A8]" }, "Total Leads"), /* @__PURE__ */ React.createElement("span", { className: "p-1.5 rounded-lg bg-[#9333EA]/20 text-[#6B21A8]" }, /* @__PURE__ */ React.createElement(Target, { className: "size-4" }))),
    /* @__PURE__ */ React.createElement("p", { className: "text-xl sm:text-2xl font-black tracking-tight mt-2 text-slate-950" }, filteredLeads.length),
    /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold text-[#7E22CE] mt-0.5" }, "Total active lead records"),
    /* @__PURE__ */ React.createElement("div", { className: "mt-2 pt-1.5 border-t border-[#9333EA]/30 flex items-center gap-1 text-[10px] font-bold text-[#6B21A8]" }, /* @__PURE__ */ React.createElement("span", null, "\u25B6 Click card to view pop-up table"))
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      onClick: () => {
        setSelectedCategory("Hot");
        setSelectedProduct("All");
        setSearchQuery("");
        setIsTableModalOpen(true);
      },
      className: "bg-[#FFE4E6] border-2 border-[#E11D48] rounded-2xl p-3.5 sm:p-4 shadow-sm transition-all duration-150 hover:scale-[1.01] active:scale-95 cursor-pointer text-slate-900"
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-black uppercase tracking-wider text-[#9F1239]" }, "Hot Leads"), /* @__PURE__ */ React.createElement("span", { className: "size-2.5 rounded-full bg-red-500 animate-pulse inline-block ring-2 ring-red-300" })),
    /* @__PURE__ */ React.createElement("p", { className: "text-xl sm:text-2xl font-black tracking-tight mt-2 text-slate-950" }, filteredLeads.filter((l) => (l.category || "").toLowerCase() === "hot").length),
    /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold text-[#BE123C] mt-0.5" }, "High conversion priority"),
    /* @__PURE__ */ React.createElement("div", { className: "mt-2 pt-1.5 border-t border-[#E11D48]/30 flex items-center gap-1 text-[10px] font-bold text-[#9F1239]" }, /* @__PURE__ */ React.createElement("span", null, "\u25B6 Click card to view pop-up table"))
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      onClick: () => {
        setSelectedCategory("Warm");
        setSelectedProduct("All");
        setSearchQuery("");
        setIsTableModalOpen(true);
      },
      className: "bg-[#FEF08A] border-2 border-[#CA8A04] rounded-2xl p-3.5 sm:p-4 shadow-sm transition-all duration-150 hover:scale-[1.01] active:scale-95 cursor-pointer text-slate-900"
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-black uppercase tracking-wider text-[#854D0E]" }, "Warm Leads"), /* @__PURE__ */ React.createElement("span", { className: "size-2.5 rounded-full bg-amber-500 inline-block ring-2 ring-amber-300" })),
    /* @__PURE__ */ React.createElement("p", { className: "text-xl sm:text-2xl font-black tracking-tight mt-2 text-slate-950" }, filteredLeads.filter((l) => (l.category || "").toLowerCase() === "warm").length),
    /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold text-[#A16207] mt-0.5" }, "Medium conversion priority"),
    /* @__PURE__ */ React.createElement("div", { className: "mt-2 pt-1.5 border-t border-[#CA8A04]/30 flex items-center gap-1 text-[10px] font-bold text-[#854D0E]" }, /* @__PURE__ */ React.createElement("span", null, "\u25B6 Click card to view pop-up table"))
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      onClick: () => {
        setSelectedCategory("Cold");
        setSelectedProduct("All");
        setSearchQuery("");
        setIsTableModalOpen(true);
      },
      className: "bg-[#CFFAFE] border-2 border-[#0891B2] rounded-2xl p-3.5 sm:p-4 shadow-sm transition-all duration-150 hover:scale-[1.01] active:scale-95 cursor-pointer text-slate-900"
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-black uppercase tracking-wider text-[#155E75]" }, "Cold Leads"), /* @__PURE__ */ React.createElement("span", { className: "size-2.5 rounded-full bg-cyan-500 inline-block ring-2 ring-cyan-300" })),
    /* @__PURE__ */ React.createElement("p", { className: "text-xl sm:text-2xl font-black tracking-tight mt-2 text-slate-950" }, filteredLeads.filter((l) => (l.category || "").toLowerCase() === "cold").length),
    /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold text-[#0E7490] mt-0.5" }, "Low conversion priority"),
    /* @__PURE__ */ React.createElement("div", { className: "mt-2 pt-1.5 border-t border-[#0891B2]/30 flex items-center gap-1 text-[10px] font-bold text-[#155E75]" }, /* @__PURE__ */ React.createElement("span", null, "\u25B6 Click card to view pop-up table"))
  )), activeTab === "customers" && allManagersList.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "space-y-2.5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-black text-slate-800 uppercase tracking-wider" }, "SALES MANAGERS DIRECTORY")), /* @__PURE__ */ React.createElement("div", { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-4" }, allManagersList.map((mgr, idx) => {
    const mgrCusts = rawCustomers.filter((c) => (c.manager_name || c.sales_manager || "").trim().toLowerCase() === mgr.toLowerCase());
    const totalVal = mgrCusts.reduce((s, c) => s + (c.amount || c.contract_value || 0), 0);
    const isSelected = selectedManager === mgr;
    const themes = [
      { bg: "bg-[#DCFCE7]", border: "border-2 border-[#16A34A]", text: "text-[#15803D]", badge: "bg-[#16A34A]/20" },
      { bg: "bg-[#DBEAFE]", border: "border-2 border-[#2563EB]", text: "text-[#1E40AF]", badge: "bg-[#2563EB]/20" },
      { bg: "bg-[#F3E8FF]", border: "border-2 border-[#9333EA]", text: "text-[#6B21A8]", badge: "bg-[#9333EA]/20" },
      { bg: "bg-[#FEF08A]", border: "border-2 border-[#CA8A04]", text: "text-[#854D0E]", badge: "bg-[#CA8A04]/20" }
    ];
    const theme = themes[idx % themes.length];
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        key: mgr,
        onClick: () => {
          setSelectedManager(mgr);
          setSelectedExecutive("All");
          setSelectedProduct("All");
          setSearchQuery("");
          setIsTableModalOpen(true);
        },
        className: `${theme.bg} ${theme.border} rounded-2xl p-3.5 shadow-sm transition-all duration-150 hover:scale-[1.02] active:scale-95 cursor-pointer text-slate-900 ${isSelected ? "ring-4 ring-[#832D51]/30 scale-[1.02]" : ""}`
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "size-7 rounded-lg bg-slate-950/10 flex items-center justify-center font-black text-slate-950 text-xs" }, mgr.charAt(0).toUpperCase()), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-black uppercase tracking-wider text-slate-600" }, "Manager")), /* @__PURE__ */ React.createElement("span", { className: `px-2 py-0.5 rounded-md text-[10px] font-black ${theme.text} ${theme.badge}` }, mgrCusts.length, " Accounts")),
      /* @__PURE__ */ React.createElement("h4", { className: "text-sm font-black text-slate-950 mt-2" }, mgr),
      /* @__PURE__ */ React.createElement("div", { className: "mt-2.5 pt-2 border-t border-black/10 flex items-center justify-between text-xs" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-bold text-slate-700" }, "Portfolio Value:"), /* @__PURE__ */ React.createElement("span", { className: "font-black text-slate-950" }, "\u20B9", totalVal.toLocaleString())),
      /* @__PURE__ */ React.createElement("div", { className: `mt-2 pt-1 border-t border-black/10 flex items-center justify-between text-[10px] font-black ${theme.text}` }, /* @__PURE__ */ React.createElement("span", null, "Click to view ", mgr, "'s deals"), /* @__PURE__ */ React.createElement("span", null, "\u2192"))
    );
  }))), isTableModalOpen && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white border border-slate-200/90 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "grid size-10 place-items-center rounded-xl bg-[#832D51] text-white font-black" }, /* @__PURE__ */ React.createElement(Layers, { className: "size-5" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-base sm:text-lg font-black text-slate-900" }, activeTab === "customers" ? selectedManager !== "All" ? `${selectedManager}'s Customer Accounts` : "Customer Accounts Directory Table" : selectedCategory !== "All" ? `${selectedCategory} Priority Leads Directory` : "Leads Directory Table"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500 font-semibold mt-0.5" }, "Showing ", activeTab === "customers" ? filteredCustomers.length : filteredLeads.length, " matching records datewise (10 per page)"))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setIsTableModalOpen(false),
      className: "grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer",
      title: "Close Table Modal"
    },
    /* @__PURE__ */ React.createElement(X, { className: "size-5" })
  )), /* @__PURE__ */ React.createElement("div", { className: "p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/30" }, /* @__PURE__ */ React.createElement("div", { className: `bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs grid gap-3 ${activeTab === "leads" ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4"}` }, /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement(Search, { className: "absolute left-3 top-2.5 size-4 text-slate-400" }), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      placeholder: activeTab === "leads" ? "Search leads..." : "Search Customer / Company / Executive...",
      value: searchQuery,
      onChange: (e) => setSearchQuery(e.target.value),
      className: "w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#832D51] transition"
    }
  )), activeTab === "customers" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
    "select",
    {
      value: selectedManager,
      onChange: (e) => setSelectedManager(e.target.value),
      className: "bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#832D51] cursor-pointer"
    },
    /* @__PURE__ */ React.createElement("option", { value: "All" }, "All Sales Managers"),
    allManagersList.map((m) => /* @__PURE__ */ React.createElement("option", { key: m, value: m }, m))
  ), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: selectedExecutive,
      onChange: (e) => setSelectedExecutive(e.target.value),
      className: "bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#832D51] cursor-pointer"
    },
    /* @__PURE__ */ React.createElement("option", { value: "All" }, "All Sales Executives"),
    allExecutivesList.map((ex) => /* @__PURE__ */ React.createElement("option", { key: ex, value: ex }, ex))
  )) : /* @__PURE__ */ React.createElement(
    "select",
    {
      value: selectedCategory,
      onChange: (e) => setSelectedCategory(e.target.value),
      className: "bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#832D51] cursor-pointer"
    },
    /* @__PURE__ */ React.createElement("option", { value: "All" }, "All Categories"),
    /* @__PURE__ */ React.createElement("option", { value: "Hot" }, "Hot"),
    /* @__PURE__ */ React.createElement("option", { value: "Warm" }, "Warm"),
    /* @__PURE__ */ React.createElement("option", { value: "Cold" }, "Cold")
  ), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: selectedProduct,
      onChange: (e) => setSelectedProduct(e.target.value),
      className: "bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#832D51] cursor-pointer"
    },
    /* @__PURE__ */ React.createElement("option", { value: "All" }, "All Products"),
    allProductsList.map((p) => /* @__PURE__ */ React.createElement("option", { key: p, value: p }, p))
  )), selectedCustIds.length > 0 && isAdmin && /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between bg-[#832D51]/10 border border-[#832D51]/20 rounded-2xl p-4 animate-in slide-in-from-top-2 duration-200" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-black text-[#832D51]" }, selectedCustIds.length, " ", activeTab === "leads" ? selectedCustIds.length === 1 ? "Lead" : "Leads" : selectedCustIds.length === 1 ? "Customer" : "Customers", " selected"), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => {
        setSelectedExecutiveId("");
        setIsAssignModalOpen(true);
      },
      className: "px-4 py-2 bg-[#832D51] text-white rounded-xl text-xs font-black shadow-sm hover:bg-[#6c2442] transition cursor-pointer"
    },
    "Assign Selected"
  )), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, loading ? /* @__PURE__ */ React.createElement("div", { className: "bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-bold text-xs" }, /* @__PURE__ */ React.createElement(RefreshCw, { className: "size-6 animate-spin mx-auto mb-3 text-[#832D51]" }), "Loading organization records...") : activeTab === "customers" ? /* @__PURE__ */ React.createElement("div", { className: "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" }, /* @__PURE__ */ React.createElement("div", { className: "overflow-x-auto" }, /* @__PURE__ */ React.createElement("table", { className: "w-full text-left border-collapse text-xs" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "bg-slate-50/80 border-b border-slate-200/70 text-slate-400 font-bold uppercase tracking-wider text-[10px]" }, isAdmin && /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 w-12" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "checkbox",
      checked: filteredCustomers.length > 0 && selectedCustIds.length === filteredCustomers.length,
      onChange: (e) => {
        if (e.target.checked) {
          setSelectedCustIds(filteredCustomers.map((c) => c.customer_id || c.id).filter(Boolean));
        } else {
          setSelectedCustIds([]);
        }
      },
      className: "rounded border-slate-300 text-[#832D51] focus:ring-[#832D51] cursor-pointer"
    }
  )), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3" }, "Date"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3" }, "Customer Name"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3" }, "Company Name"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3" }, "Product"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3" }, "Sales Manager"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3" }, "Sales Executive"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-center" }, "Assignment Status"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-right" }, "Amount"), isAdmin && /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-center" }, "Action"))), /* @__PURE__ */ React.createElement("tbody", { className: "divide-y divide-slate-100 font-medium" }, paginatedCustomers.length === 0 ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: "9", className: "text-center py-12 text-slate-400 font-semibold italic" }, "No customer records found")) : paginatedCustomers.map((cust, ci) => {
    const custId = cust.customer_id || cust.id;
    const hasExec = !!(cust.executive_id && cust.executive_name && cust.executive_name !== "Direct / Unassigned" && cust.executive_name !== "Unassigned");
    const isManagerUnassigned = !cust.manager_name || cust.manager_name === "Unassigned / Direct" || cust.manager_name === "Unassigned";
    return /* @__PURE__ */ React.createElement(
      "tr",
      {
        key: `${custId}_${ci}`,
        className: "hover:bg-slate-50/60 transition cursor-pointer",
        onClick: () => setSelectedCust(cust)
      },
      isAdmin && /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "checkbox",
          checked: selectedCustIds.includes(custId),
          onChange: (e) => {
            if (e.target.checked) {
              setSelectedCustIds((prev) => [...prev, custId]);
            } else {
              setSelectedCustIds((prev) => prev.filter((id) => id !== custId));
            }
          },
          className: "rounded border-slate-300 text-[#832D51] focus:ring-[#832D51] cursor-pointer"
        }
      )),
      /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 text-slate-700 font-bold text-[11px] whitespace-nowrap" }, formatDDMMYYYY(cust.date || cust.created_at)),
      /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 font-bold text-slate-900 hover:text-[#832D51]" }, cust.customer_name),
      /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 text-slate-650" }, cust.company_name),
      /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 text-slate-600" }, cust.product),
      /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 text-[#3a7d63] font-bold" }, isManagerUnassigned ? "Unassigned" : cust.manager_name),
      /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 text-slate-900 font-bold" }, hasExec ? cust.executive_name : /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-slate-100 text-slate-500 border border-slate-200" }, "NOT ASSIGNED")),
      /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 text-center" }, /* @__PURE__ */ React.createElement("span", { className: `px-2.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase border ${!hasExec ? "bg-slate-50 text-slate-500 border-slate-200" : cust.reassigned_at ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-emerald-50 text-emerald-700 border-emerald-250"}` }, !hasExec ? "Not Assigned" : cust.reassigned_at ? "Reassigned" : "Assigned")),
      /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 text-right font-black text-slate-950" }, "\u20B9", (cust.amount || 0).toLocaleString()),
      isAdmin && /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 text-center", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => {
            setSelectedCustIds([custId]);
            setSelectedExecutiveId(cust.executive_id || "");
            setIsAssignModalOpen(true);
          },
          className: "px-2.5 py-1 bg-[#832D51] text-white hover:bg-[#6c2442] rounded-md text-[10px] font-black shadow-2xs transition cursor-pointer"
        },
        hasExec ? "Reassign" : "Assign"
      ))
    );
  })))), sortedCustomers.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/80 border-t border-slate-200/80" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-slate-500 font-medium" }, "Showing ", /* @__PURE__ */ React.createElement("span", { className: "font-black text-slate-900" }, Math.min((customerPage - 1) * ITEMS_PER_PAGE + 1, sortedCustomers.length)), " to ", /* @__PURE__ */ React.createElement("span", { className: "font-black text-slate-900" }, Math.min(customerPage * ITEMS_PER_PAGE, sortedCustomers.length)), " of ", /* @__PURE__ */ React.createElement("span", { className: "font-black text-slate-900" }, sortedCustomers.length.toLocaleString()), " records"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setCustomerPage((prev) => Math.max(1, prev - 1)),
      disabled: customerPage === 1,
      className: "flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition shadow-2xs"
    },
    /* @__PURE__ */ React.createElement(ChevronLeft, { className: "size-3.5" }),
    "Previous"
  ), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1 px-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-black text-slate-800" }, "Page ", customerPage, " of ", customerTotalPages)), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setCustomerPage((prev) => Math.min(customerTotalPages, prev + 1)),
      disabled: customerPage >= customerTotalPages,
      className: "flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition shadow-2xs"
    },
    "Next",
    /* @__PURE__ */ React.createElement(ChevronRight, { className: "size-3.5" })
  )))) : /* @__PURE__ */ React.createElement("div", { className: "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" }, /* @__PURE__ */ React.createElement("div", { className: "overflow-x-auto" }, /* @__PURE__ */ React.createElement("table", { className: "w-full text-left border-collapse text-xs" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "bg-slate-50/80 border-b border-slate-200/70 text-slate-400 font-bold uppercase tracking-wider text-[10px]" }, isAdmin && /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 w-12" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "checkbox",
      checked: filteredLeads.length > 0 && selectedCustIds.length === filteredLeads.length,
      onChange: (e) => {
        if (e.target.checked) {
          setSelectedCustIds(filteredLeads.map((l) => l.id || l.lead_id).filter(Boolean));
        } else {
          setSelectedCustIds([]);
        }
      },
      className: "rounded border-slate-300 text-[#832D51] focus:ring-[#832D51] cursor-pointer"
    }
  )), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3" }, "Date"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3" }, "Name"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3" }, "Company Name"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3" }, "Sales Manager"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3" }, "Sales Executive"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3" }, "Location"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3" }, "Category"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3" }, "Product"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-center" }, "Assignment Status"), isAdmin && /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-center" }, "Action"))), /* @__PURE__ */ React.createElement("tbody", { className: "divide-y divide-slate-100 font-medium" }, paginatedLeads.length === 0 ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: "8", className: "text-center py-12 text-slate-400 font-semibold italic" }, "No lead records found")) : paginatedLeads.map((lead, li) => {
    const leadId = lead.id || lead.lead_id;
    const hasOwner = !!(lead.sales_executive || lead.assigned_to || lead.assigned_to_email || lead.employee_code);
    return /* @__PURE__ */ React.createElement(
      "tr",
      {
        key: `${leadId}_${li}`,
        className: "hover:bg-slate-50/60 transition"
      },
      isAdmin && /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "checkbox",
          checked: selectedCustIds.includes(leadId),
          onChange: (e) => {
            if (e.target.checked) {
              setSelectedCustIds((prev) => [...prev, leadId]);
            } else {
              setSelectedCustIds((prev) => prev.filter((id) => id !== leadId));
            }
          },
          className: "rounded border-slate-300 text-[#832D51] focus:ring-[#832D51] cursor-pointer"
        }
      )),
      /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 text-slate-700 font-bold text-[11px] whitespace-nowrap" }, formatDDMMYYYY(lead.date || lead.created_at)),
      /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 font-bold text-slate-900" }, lead.name || lead.contact_name),
      /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 text-slate-650" }, lead.company_name || lead.company),
      /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 text-[#3a7d63] font-bold" }, lead.manager_name || "Unassigned"),
      /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 text-slate-900 font-bold" }, hasOwner ? lead.sales_executive || lead.assigned_to : /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-slate-100 text-slate-500 border border-slate-200" }, "NOT ASSIGNED")),
      /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 text-slate-550" }, lead.location || lead.city || "N/A"),
      /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3" }, /* @__PURE__ */ React.createElement("span", { className: `px-2.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase ${(lead.category || "Warm").toLowerCase() === "hot" ? "bg-red-50 text-red-700 border border-red-100" : (lead.category || "Warm").toLowerCase() === "warm" ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-blue-50 text-blue-700 border border-blue-100"}` }, lead.category || "Warm")),
      /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 text-slate-600" }, lead.product_name || lead.product),
      /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 text-center" }, /* @__PURE__ */ React.createElement("span", { className: `px-2.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase border ${!hasOwner ? "bg-slate-50 text-slate-500 border-slate-200" : lead.reassigned_at ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-emerald-50 text-emerald-700 border-emerald-250"}` }, !hasOwner ? "Not Assigned" : lead.reassigned_at ? "Reassigned" : "Assigned")),
      isAdmin && /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 text-center" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => {
            setSelectedCustIds([leadId]);
            setSelectedExecutiveId(lead.employee_id || "");
            setIsAssignModalOpen(true);
          },
          className: "px-2.5 py-1 bg-[#832D51] text-white hover:bg-[#6c2442] rounded-md text-[10px] font-black shadow-2xs transition cursor-pointer"
        },
        hasOwner ? "Reassign" : "Assign"
      ))
    );
  })))), sortedLeads.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/80 border-t border-slate-200/80" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-slate-500 font-medium" }, "Showing ", /* @__PURE__ */ React.createElement("span", { className: "font-black text-slate-900" }, Math.min((leadPage - 1) * ITEMS_PER_PAGE + 1, sortedLeads.length)), " to ", /* @__PURE__ */ React.createElement("span", { className: "font-black text-slate-900" }, Math.min(leadPage * ITEMS_PER_PAGE, sortedLeads.length)), " of ", /* @__PURE__ */ React.createElement("span", { className: "font-black text-slate-900" }, sortedLeads.length.toLocaleString()), " records"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setLeadPage((prev) => Math.max(1, prev - 1)),
      disabled: leadPage === 1,
      className: "flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition shadow-2xs"
    },
    /* @__PURE__ */ React.createElement(ChevronLeft, { className: "size-3.5" }),
    "Previous"
  ), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1 px-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-black text-slate-800" }, "Page ", leadPage, " of ", leadTotalPages)), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setLeadPage((prev) => Math.min(leadTotalPages, prev + 1)),
      disabled: leadPage >= leadTotalPages,
      className: "flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition shadow-2xs"
    },
    "Next",
    /* @__PURE__ */ React.createElement(ChevronRight, { className: "size-3.5" })
  )))))))), selectedCust && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-xs transition-opacity" }, /* @__PURE__ */ React.createElement("div", { className: "h-full w-full max-w-md bg-white p-6 shadow-2xl overflow-y-auto space-y-6 animate-in slide-in-from-right duration-200" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between pb-4 border-b border-slate-100" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2.5" }, /* @__PURE__ */ React.createElement("span", { className: "grid size-8 place-items-center rounded-lg bg-[#F8CAE4]/25 text-[#832D51]" }, /* @__PURE__ */ React.createElement(Building2, { className: "size-4.5" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-sm font-black text-slate-900" }, selectedCust.customer_name), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500 font-semibold" }, selectedCust.company_name))), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => setSelectedCust(null),
      className: "rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
    },
    /* @__PURE__ */ React.createElement(X, { className: "size-4.5" })
  )), /* @__PURE__ */ React.createElement("div", { className: "space-y-4 text-xs font-semibold" }, /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-black uppercase tracking-wider text-slate-400 block" }, "Assignment Hierarchy"), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-slate-500 font-bold" }, "Sales Manager:"), /* @__PURE__ */ React.createElement("span", { className: "text-slate-900 font-black" }, selectedCust.manager_name || "Unassigned")), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-slate-500 font-bold" }, "Sales Executive:"), /* @__PURE__ */ React.createElement("span", { className: "text-slate-900 font-black" }, selectedCust.executive_name || "Unassigned"))), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between pb-2 border-b border-slate-100" }, /* @__PURE__ */ React.createElement("span", { className: "text-slate-500" }, "Product / Service:"), /* @__PURE__ */ React.createElement("span", { className: "text-slate-900 font-bold" }, selectedCust.product)), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between pb-2 border-b border-slate-100" }, /* @__PURE__ */ React.createElement("span", { className: "text-slate-500" }, "Contract / Deal Value:"), /* @__PURE__ */ React.createElement("span", { className: "text-[#832D51] font-black text-sm" }, "\u20B9", (selectedCust.amount || 0).toLocaleString())), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between pb-2 border-b border-slate-100" }, /* @__PURE__ */ React.createElement("span", { className: "text-slate-500" }, "Account Status:"), /* @__PURE__ */ React.createElement("span", { className: "text-emerald-700 font-black" }, selectedCust.status)), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between pb-2 border-b border-slate-100" }, /* @__PURE__ */ React.createElement("span", { className: "text-slate-500" }, "Onboarding Date:"), /* @__PURE__ */ React.createElement("span", { className: "text-slate-900 font-bold" }, selectedCust.date || "N/A")), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between pb-2 border-b border-slate-100" }, /* @__PURE__ */ React.createElement("span", { className: "text-slate-500" }, "Customer ID:"), /* @__PURE__ */ React.createElement("span", { className: "text-slate-400 font-mono text-[10px]" }, selectedCust.customer_id)))))), isAssignModalOpen && isAdmin && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-xs p-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl max-w-md w-full space-y-4 animate-in zoom-in-95 duration-150" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-sm font-black text-slate-900" }, activeTab === "leads" ? "Assign Selected Leads" : "Assign Selected Customers"), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-500 font-semibold mt-1" }, "Select an active Sales Executive to own these ", selectedCustIds.length, " ", activeTab === "leads" ? "leads" : "customers", ".")), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("label", { className: "text-[10px] font-black uppercase tracking-wider text-slate-400 block" }, "Active Sales Executive"), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: selectedExecutiveId,
      onChange: (e) => setSelectedExecutiveId(e.target.value),
      className: "w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#832D51] cursor-pointer"
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, "-- Select Active Executive --"),
    activeExecutives.map((exec) => /* @__PURE__ */ React.createElement("option", { key: exec.employee_id || exec.id, value: exec.employee_id || exec.id }, exec.name, " (", exec.employee_code || "No Code", ")"))
  )), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end gap-3 pt-3 border-t border-slate-100" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => setIsAssignModalOpen(false),
      className: "px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition cursor-pointer"
    },
    "Cancel"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      disabled: !selectedExecutiveId || assigning,
      onClick: async () => {
        setAssigning(true);
        try {
          const isLeads = activeTab === "leads";
          const res = isLeads ? await crmAPI.reassignLeads({
            lead_ids: selectedCustIds,
            new_employee_id: selectedExecutiveId
          }) : await customerAPI.reassignCustomers({
            customer_ids: selectedCustIds,
            new_employee_id: selectedExecutiveId
          });
          if (res && (res.success || res.data)) {
            showToast(`Successfully reassigned ${selectedCustIds.length} ${isLeads ? "leads" : "customers"}`, "success");
            setSelectedCustIds([]);
            setIsAssignModalOpen(false);
            loadCustomerDirectory();
          } else {
            showToast(res?.message || "Reassignment failed", "error");
          }
        } catch (err) {
          console.error("Reassignment error:", err);
          const errorMsg = err?.detail || err?.message || err?.error || "Failed to complete reassignment";
          showToast(errorMsg, "error");
        } finally {
          setAssigning(false);
        }
      },
      className: "px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm disabled:opacity-50 transition cursor-pointer"
    },
    assigning ? "Assigning..." : "Confirm Assignment"
  )))));
}
export default CeoCustomers;
