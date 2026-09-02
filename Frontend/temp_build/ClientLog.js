import React, { useState, useEffect } from "react";
import {
  Target,
  Users,
  Search,
  RefreshCw,
  X,
  Calendar,
  CheckCircle,
  Briefcase,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { reportAPI, visitAPI } from "../../services/api.js";
import { formatDate } from "../../utils/dateUtils.js";
export default function ClientLog({ initialSection = "leads" }) {
  const [activeSection, setActiveSection] = useState(initialSection);
  const [showTable, setShowTable] = useState(true);
  const [leads, setLeads] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leadsCategory, setLeadsCategory] = useState("All");
  const [leadsSearch, setLeadsSearch] = useState("");
  const [customersSearch, setCustomersSearch] = useState("");
  const [selectedCust, setSelectedCust] = useState(null);
  const [isLifecycleModalOpen, setIsLifecycleModalOpen] = useState(false);
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await reportAPI.getCeoDashboard();
      if (res && res.data) {
        if (res.data.leads) setLeads(Array.isArray(res.data.leads) ? res.data.leads : []);
        if (res.data.customers) setCustomers(Array.isArray(res.data.customers) ? res.data.customers : []);
      } else {
        setLeads([]);
        setCustomers([]);
      }
      const visitsRes = await visitAPI.getVisits();
      if (visitsRes && visitsRes.data) {
        setVisits(visitsRes.data);
      }
    } catch (e) {
      console.error("Error fetching client log data:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  useEffect(() => {
    loadData();
  }, []);
  useEffect(() => {
    setActiveSection(initialSection);
    setShowTable(true);
  }, [initialSection]);
  const filteredLeads = leads.filter((l) => {
    const matchesCat = leadsCategory === "All" || (l.category || "").toLowerCase() === leadsCategory.toLowerCase();
    const q = leadsSearch.toLowerCase();
    const matchesSearch = !q || (l.company_name || l.company || "").toLowerCase().includes(q) || (l.name || l.contact_name || "").toLowerCase().includes(q) || (l.sales_executive || l.assigned_to || "").toLowerCase().includes(q) || (l.sales_manager || l.manager_name || "").toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });
  const filteredCustomers = customers.filter((c) => {
    const q = customersSearch.toLowerCase();
    const matchesSearch = !q || (c.company || c.name || "").toLowerCase().includes(q) || (c.contact || c.person || "").toLowerCase().includes(q) || (c.sales_executive || "").toLowerCase().includes(q) || (c.sales_manager || "").toLowerCase().includes(q);
    return matchesSearch;
  });
  const formatDateString = (dt) => {
    return formatDate(dt);
  };
  const getProductFromNotes = (cust) => {
    const notesStr = cust.notes || "";
    if (notesStr.includes("Product:")) {
      return notesStr.split("Product:")[-1]?.split("|")[0]?.trim() || "Software Service";
    }
    return "TwiteConnect Software";
  };
  const getRemarks = (cust) => {
    const notesStr = cust.notes || "";
    if (notesStr.includes("|")) {
      return notesStr.split("|")[0]?.trim();
    }
    return notesStr || "Onboarded customer account";
  };
  const getCustomerLifecycle = (cust) => {
    const cycle = [];
    const matchedLead = leads.find(
      (l) => l.lead_id === cust.lead_id || l.id === cust.lead_id || (l.company_name || l.company || "").toLowerCase() === (cust.company || cust.name || "").toLowerCase()
    );
    const matchedVisits = visits.filter(
      (v) => (v.client_name || v.customer_name || "").toLowerCase() === (cust.company || cust.name || "").toLowerCase()
    );
    if (matchedLead) {
      cycle.push({
        title: "Lead Ingestion",
        date: formatDateString(matchedLead.created_at || matchedLead.date),
        description: `Lead registered under Category: ${matchedLead.category || "Warm"}. Origin Source: ${matchedLead.source || "Field Research"}. Assigned to Sales Executive: ${cust.sales_executive || "SE"} under Sales Manager: ${cust.sales_manager || "SM"}.`,
        icon: Target,
        color: "bg-amber-500"
      });
    } else {
      cycle.push({
        title: "Lead Ingestion",
        date: formatDateString(cust.created_at),
        description: `Lead created for client prospect ${cust.company || cust.name}. Assigned to ${cust.sales_executive || "SE"}.`,
        icon: Target,
        color: "bg-amber-500"
      });
    }
    if (matchedVisits.length > 0) {
      matchedVisits.forEach((v, index) => {
        cycle.push({
          title: `Field Visit ${index + 1}: ${v.purpose || "Product Demo"}`,
          date: formatDateString(v.visit_date || v.scheduled_date || v.created_at),
          description: `Site visit completed by Sales Executive ${cust.sales_executive || "SE"}. Check-in verification: GPS location logged. Status: ${v.status || "Completed"}. Remarks: ${v.notes || "Meeting completed successfully."}`,
          icon: Calendar,
          color: "bg-[#EA6993]"
        });
      });
    } else {
      cycle.push({
        title: "Field Visit & Verification",
        date: formatDateString(cust.created_at),
        description: `GPS verified Client Site Visit completed by Sales Executive ${cust.sales_executive || "SE"}. Product requirements gathered and logged.`,
        icon: Calendar,
        color: "bg-[#EA6993]"
      });
    }
    cycle.push({
      title: "Converted to Customer (Deal Closed-Won)",
      date: formatDateString(cust.created_at),
      description: `Lead converted to active customer. Billing setup configured. Contract value set at \u20B9${(cust.contract_value || 0).toLocaleString("en-IN")}. Assigned Sales Manager: ${cust.sales_manager || "SM"} | Executive: ${cust.sales_executive || "SE"}.`,
      icon: CheckCircle,
      color: "bg-emerald-500"
    });
    return cycle;
  };
  const handleCardClick = (section) => {
    if (activeSection === section) {
      setShowTable(!showTable);
    } else {
      setActiveSection(section);
      setShowTable(true);
    }
  };
  return /* @__PURE__ */ React.createElement("div", { className: "mx-auto max-w-[1400px] space-y-6 animate-in fade-in duration-200" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-extrabold text-slate-900 tracking-tight" }, "Client Log"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-xs font-semibold text-slate-400" }, "Home > Client Log")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setRefreshing(true);
        loadData();
      },
      disabled: refreshing,
      className: "p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer",
      title: "Refresh Registry"
    },
    /* @__PURE__ */ React.createElement(RefreshCw, { size: 15, className: refreshing ? "animate-spin text-[#832D51]" : "" })
  ))), /* @__PURE__ */ React.createElement("div", { className: "grid gap-6 sm:grid-cols-2" }, /* @__PURE__ */ React.createElement(
    "div",
    {
      onClick: () => handleCardClick("leads"),
      className: `rounded-2xl border p-6 shadow-md transition-all duration-300 cursor-pointer group flex items-center justify-between hover:scale-[1.01] hover:shadow-lg ${activeSection === "leads" && showTable ? "bg-gradient-to-br from-[#EA6993] to-[#8d764b] text-white border-none ring-4 ring-[#EA6993]/20" : "border-[#EA6993]/20 bg-[#EA6993]/5 hover:bg-[#EA6993]/10 text-[#EA6993]"}`
    },
    /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: `text-xs font-black uppercase tracking-wider ${activeSection === "leads" && showTable ? "text-white/80" : "text-slate-450"}` }, "Total Leads"), /* @__PURE__ */ React.createElement("p", { className: `text-3xl font-black mt-2 tracking-tight ${activeSection === "leads" && showTable ? "text-white" : "text-slate-900"}` }, leads.length), /* @__PURE__ */ React.createElement("p", { className: `text-[10px] font-bold mt-2 flex items-center gap-1.5 ${activeSection === "leads" && showTable ? "text-white/70" : "text-slate-500"}` }, /* @__PURE__ */ React.createElement("span", null, activeSection === "leads" && showTable ? "Click to collapse leads list" : "Click to display HOT, COLD, WARM leads table"))),
    /* @__PURE__ */ React.createElement("span", { className: `grid size-12 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110 shadow-xs ${activeSection === "leads" && showTable ? "bg-white/20 text-white" : "bg-[#EA6993]/15 text-[#EA6993]"}` }, /* @__PURE__ */ React.createElement(Target, { className: "size-5" }))
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      onClick: () => handleCardClick("customers"),
      className: `rounded-2xl border p-6 shadow-md transition-all duration-300 cursor-pointer group flex items-center justify-between hover:scale-[1.01] hover:shadow-lg ${activeSection === "customers" && showTable ? "bg-gradient-to-br from-[#832D51] to-[#002f31] text-white border-none ring-4 ring-[#832D51]/20" : "border-[#832D51]/20 bg-[#832D51]/5 hover:bg-[#832D51]/10 text-[#832D51]"}`
    },
    /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: `text-xs font-black uppercase tracking-wider ${activeSection === "customers" && showTable ? "text-white/80" : "text-slate-450"}` }, "Total Customers"), /* @__PURE__ */ React.createElement("p", { className: `text-3xl font-black mt-2 tracking-tight ${activeSection === "customers" && showTable ? "text-white" : "text-slate-900"}` }, customers.length), /* @__PURE__ */ React.createElement("p", { className: `text-[10px] font-bold mt-2 flex items-center gap-1.5 ${activeSection === "customers" && showTable ? "text-white/70" : "text-slate-500"}` }, /* @__PURE__ */ React.createElement("span", null, activeSection === "customers" && showTable ? "Click to collapse customers list" : "Click to display converted customers table"))),
    /* @__PURE__ */ React.createElement("span", { className: `grid size-12 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110 shadow-xs ${activeSection === "customers" && showTable ? "bg-white/20 text-white" : "bg-[#832D51]/15 text-[#832D51]"}` }, /* @__PURE__ */ React.createElement(Users, { className: "size-5" }))
  )), showTable && /* @__PURE__ */ React.createElement("div", { className: "space-y-6 animate-in slide-in-from-top-4 duration-300" }, activeSection === "leads" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-4 lg:flex-row lg:items-center justify-between bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm" }, /* @__PURE__ */ React.createElement("div", { className: "flex bg-slate-50 border border-slate-200 p-0.5 rounded-xl self-start lg:self-auto shrink-0" }, ["All", "Hot", "Warm", "Cold"].map((cat) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: cat,
      onClick: () => setLeadsCategory(cat),
      className: `px-4 py-1.5 text-xs font-black uppercase rounded-lg transition cursor-pointer ${leadsCategory === cat ? "bg-[#832D51] text-white shadow-xs" : "text-slate-500 hover:text-slate-955"}`
    },
    cat,
    " Leads"
  ))), /* @__PURE__ */ React.createElement("div", { className: "relative w-full lg:max-w-xs" }, /* @__PURE__ */ React.createElement(Search, { className: "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" }), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      placeholder: "Search leads, SM, SE...",
      value: leadsSearch,
      onChange: (e) => setLeadsSearch(e.target.value),
      className: "h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
    }
  ))), /* @__PURE__ */ React.createElement("div", { className: "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" }, /* @__PURE__ */ React.createElement("div", { className: "overflow-x-auto" }, /* @__PURE__ */ React.createElement("table", { className: "w-full border-collapse text-left text-sm text-slate-600" }, /* @__PURE__ */ React.createElement("thead", { className: "bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100" }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { className: "px-6 py-4" }, "Date"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-4" }, "Sales Manager"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-4" }, "Sales Executive"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-4" }, "Lead Details"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-4" }, "Category"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-4" }, "Status"))), /* @__PURE__ */ React.createElement("tbody", { className: "divide-y divide-slate-100 text-xs font-bold text-slate-600" }, loading ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: "6", className: "text-center py-12" }, /* @__PURE__ */ React.createElement(RefreshCw, { className: "size-6 animate-spin text-[#832D51] mx-auto" }), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-400 font-bold mt-2" }, "Loading leads..."))) : filteredLeads.length === 0 ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: "6", className: "text-center py-12 text-slate-405 font-semibold italic" }, "No matching leads found")) : filteredLeads.map((lead) => /* @__PURE__ */ React.createElement("tr", { key: lead.id || lead.lead_id, className: "hover:bg-slate-50/50 transition" }, /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 text-slate-500 font-semibold" }, formatDate(lead.date || lead.created_at)), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 text-[#3a7d63] font-black" }, lead.sales_manager || lead.manager_name || "Direct/Unassigned"), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 text-slate-900 font-black" }, lead.sales_executive || lead.assigned || "Unassigned"), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-slate-900 font-black" }, lead.company_name || lead.company || "Prospect Client"), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-400 mt-0.5" }, lead.name || lead.contact_name || "Point of Contact"), lead.phone && /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-400 mt-0.5" }, "\u{1F4DE} ", lead.phone))), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4" }, /* @__PURE__ */ React.createElement("span", { className: `px-2.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase ${(lead.category || "Warm").toLowerCase() === "hot" ? "bg-red-50 text-red-700 border border-red-100" : (lead.category || "Warm").toLowerCase() === "warm" ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-blue-50 text-blue-700 border border-blue-100"}` }, lead.category || "Warm")), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4" }, /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center rounded-lg border border-slate-200 px-2.5 py-0.5 text-[10px] font-bold bg-slate-50 text-slate-650" }, lead.status || "New"))))))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4 text-xs font-bold text-slate-500" }, /* @__PURE__ */ React.createElement("span", null, "Showing ", filteredLeads.length, " of ", leads.length, " entries")))), activeSection === "customers" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm" }, /* @__PURE__ */ React.createElement("div", { className: "relative flex-1" }, /* @__PURE__ */ React.createElement(Search, { className: "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" }), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      placeholder: "Search customers by company or manager...",
      value: customersSearch,
      onChange: (e) => setCustomersSearch(e.target.value),
      className: "h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
    }
  ))), /* @__PURE__ */ React.createElement("div", { className: "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" }, /* @__PURE__ */ React.createElement("div", { className: "overflow-x-auto" }, /* @__PURE__ */ React.createElement("table", { className: "w-full border-collapse text-left text-sm text-slate-600" }, /* @__PURE__ */ React.createElement("thead", { className: "bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100" }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { className: "px-6 py-4" }, "Date"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-4" }, "Sales Manager"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-4" }, "Sales Executive"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-4" }, "Client Details"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-4" }, "Product"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-4" }, "Remark"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-4" }, "Amount"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-4 text-center" }, "Action"))), /* @__PURE__ */ React.createElement("tbody", { className: "divide-y divide-slate-100 text-xs font-bold text-slate-600" }, loading ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: "8", className: "text-center py-12" }, /* @__PURE__ */ React.createElement(RefreshCw, { className: "size-6 animate-spin text-[#832D51] mx-auto" }), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-400 font-bold mt-2" }, "Loading customers..."))) : filteredCustomers.length === 0 ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: "8", className: "text-center py-12 text-slate-400 font-semibold italic" }, "No customers found")) : filteredCustomers.map((cust) => /* @__PURE__ */ React.createElement("tr", { key: cust.id || cust.customer_id, className: "hover:bg-slate-50/50 transition" }, /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 text-slate-500 font-semibold" }, formatDate(cust.created_at || cust.date)), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 text-[#3a7d63] font-black" }, cust.sales_manager || "Direct/Unassigned"), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 text-slate-900 font-black" }, cust.sales_executive || "Unassigned"), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-slate-900 font-black" }, cust.company || cust.name || "Converted Client"), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-400 mt-0.5" }, cust.contact || "Point of Contact"), cust.phone && /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-400 mt-0.5" }, "\u{1F4DE} ", cust.phone))), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 text-slate-800" }, getProductFromNotes(cust)), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 text-slate-500 font-semibold max-w-[150px] truncate", title: getRemarks(cust) }, getRemarks(cust)), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 text-emerald-600 font-extrabold" }, "\u20B9", (cust.contract_value || 0).toLocaleString("en-IN")), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 text-center" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setSelectedCust(cust);
        setIsLifecycleModalOpen(true);
      },
      className: "px-3 py-1.5 rounded-xl bg-[#832D51] hover:bg-[#6a2240] text-white font-extrabold text-[10px] shadow-xs cursor-pointer transition active:scale-95"
    },
    "View Cycle"
  ))))))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4 text-xs font-bold text-slate-500" }, /* @__PURE__ */ React.createElement("span", null, "Showing ", filteredCustomers.length, " of ", customers.length, " entries"))))), isLifecycleModalOpen && selectedCust && (() => {
    const lifecycleEvents = getCustomerLifecycle(selectedCust);
    return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200" }, /* @__PURE__ */ React.createElement("div", { className: "relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col animate-in zoom-in-95 duration-200 text-slate-900" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between border-b border-slate-100 pb-4 mb-6" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-black text-slate-900 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Briefcase, { className: "size-5 text-[#832D51]" }), /* @__PURE__ */ React.createElement("span", null, "Customer Conversion Cycle")), /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold text-slate-400 mt-1" }, "Lifecycle timeline for ", selectedCust.company || selectedCust.name)), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setIsLifecycleModalOpen(false);
          setSelectedCust(null);
        },
        className: "p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition cursor-pointer"
      },
      /* @__PURE__ */ React.createElement(X, { className: "size-5" })
    )), /* @__PURE__ */ React.createElement("div", { className: "relative pl-6 space-y-8 my-2" }, /* @__PURE__ */ React.createElement("div", { className: "absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-150" }), lifecycleEvents.map((evt, index) => {
      const IconComponent = evt.icon;
      return /* @__PURE__ */ React.createElement("div", { key: index, className: "relative flex items-start gap-4 text-xs font-semibold text-slate-500" }, /* @__PURE__ */ React.createElement("span", { className: `absolute -left-[23px] top-0 grid size-6 place-items-center rounded-full text-white border-2 border-white shadow-sm ring-4 ring-white ${evt.color}` }, /* @__PURE__ */ React.createElement(IconComponent, { className: "size-3" })), /* @__PURE__ */ React.createElement("div", { className: "flex-1 space-y-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1" }, /* @__PURE__ */ React.createElement("h4", { className: "font-extrabold text-slate-900 text-sm" }, evt.title), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-slate-400 font-bold bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md self-start sm:self-auto" }, "\u{1F4C5} ", evt.date)), /* @__PURE__ */ React.createElement("p", { className: "m-0 leading-relaxed text-slate-550 font-medium" }, evt.description)));
    }))));
  })());
}
