import React, { useState, useEffect } from "react";
import {
  PhoneCall,
  Search,
  Filter,
  CalendarDays,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LayoutGrid,
  Table,
  Eye,
  X
} from "lucide-react";
import { useToast } from "../../common/ToastContext.jsx";
import { formatDate } from "../../utils/dateUtils.js";
const STATUS_COLORS = {
  Completed: "bg-emerald-100 text-emerald-800 border-emerald-300",
  Pending: "bg-amber-100 text-amber-800 border-amber-300",
  Overdue: "bg-rose-100 text-rose-800 border-rose-300",
  Rescheduled: "bg-sky-100 text-sky-800 border-sky-300"
};
const PRIORITY_COLORS = {
  High: "text-rose-700",
  Medium: "text-amber-700",
  Low: "text-emerald-700"
};
export default function CEOFollowups() {
  const { showToast } = useToast();
  const [viewMode, setViewMode] = useState("cards");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedItem, setSelectedItem] = useState(null);
  const [followups, setFollowups] = useState([]);
  const loadData = () => {
    let combined = [
      { id: "fol_1", customer: "ABC Industries", contactPerson: "John Doe", executive: "John Doe", employeeCode: "EMP-101", type: "Follow-up Call", status: "Pending", scheduledTime: "30 Apr 2026", priority: "High", reminder: "Email Reminder", notes: "Send updated enterprise contract and pricing sheet." },
      { id: "fol_2", customer: "Tech Solutions", contactPerson: "Mary Jane", executive: "Mary Jane", employeeCode: "EMP-102", type: "Demo Meeting", status: "Pending", scheduledTime: "01 May 2026", priority: "Medium", reminder: "Popup Alert", notes: "Product demo for engineering team on deployment." },
      { id: "fol_3", customer: "Global Corp", contactPerson: "Robert Smith", executive: "Robert Smith", employeeCode: "EMP-103", type: "Negotiation", status: "Overdue", scheduledTime: "25 Apr 2026", priority: "High", reminder: "Email Reminder", notes: "Follow up on negotiation email sent last week." },
      { id: "fol_4", customer: "Prime Systems", contactPerson: "David Brown", executive: "David Brown", employeeCode: "EMP-104", type: "Discovery", status: "Completed", scheduledTime: "27 Apr 2026", priority: "Low", reminder: "No reminder", notes: "Initial call completed, scheduled site visit." }
    ];
    try {
      const savedStr = localStorage.getItem("tc_sales_followups");
      if (savedStr) {
        const parsed = JSON.parse(savedStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = parsed.map((f, idx) => ({
            id: f.id || `fol_${2e3 + idx}`,
            customer: f.customer || f.clientName || f.company || "Client Account",
            contactPerson: f.contactPerson || f.contactName || "Contact Person",
            executive: f.executive || f.assigned_to || f.executiveName || "Sales Executive",
            employeeCode: f.employeeCode || f.employee_code || f.empCode || "EMP000101",
            type: f.type || f.followUpType || f.purpose || "Follow-up Call",
            status: f.status || "Pending",
            scheduledTime: f.scheduledTime || f.scheduledDate || f.date || "TBD",
            priority: f.priority || "Medium",
            reminder: f.reminder || "No reminder set",
            notes: f.notes || f.remarks || f.description || "Client follow-up scheduled."
          }));
          const map = /* @__PURE__ */ new Map();
          combined.forEach((d) => map.set(`${d.customer}_${d.executive}`, d));
          normalized.forEach((n) => map.set(`${n.customer}_${n.executive}`, n));
          combined = Array.from(map.values());
        }
      }
    } catch (e) {
    }
    setFollowups(combined);
  };
  useEffect(() => {
    loadData();
  }, []);
  const filteredFollowups = followups.filter((f) => {
    const q = search.toLowerCase();
    const matchesSearch = (f.customer || "").toLowerCase().includes(q) || (f.executive || "").toLowerCase().includes(q) || (f.contactPerson || "").toLowerCase().includes(q) || (f.employeeCode || "").toLowerCase().includes(q) || (f.notes || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "All" || f.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const totalPending = followups.filter((f) => f.status === "Pending").length;
  const totalCompleted = followups.filter((f) => f.status === "Completed").length;
  const totalOverdue = followups.filter((f) => f.status === "Overdue").length;
  const totalHigh = followups.filter((f) => f.priority === "High").length;
  return /* @__PURE__ */ React.createElement("div", { className: "mx-auto max-w-[1400px] space-y-6 font-sans text-slate-900 pb-12 animate-in fade-in duration-200" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white border border-slate-200 p-6 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-black text-slate-900 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(PhoneCall, { className: "w-6 h-6 text-[#832D51]" }), " Team Follow-Ups & Call Reminders"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500 font-bold mt-1" }, "Monitor company-wide call schedules, client follow-ups, overdue alerts, and executive interaction notes.")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: loadData,
      className: "p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-650 transition cursor-pointer",
      title: "Refresh List"
    },
    /* @__PURE__ */ React.createElement(RefreshCw, { size: 15 })
  ), /* @__PURE__ */ React.createElement("div", { className: "flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setViewMode("cards"),
      className: `px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 transition cursor-pointer ${viewMode === "cards" ? "bg-[#832D51] text-white shadow-xs" : "text-slate-500 hover:text-slate-800"}`
    },
    /* @__PURE__ */ React.createElement(LayoutGrid, { size: 12 }),
    " Cards"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setViewMode("table"),
      className: `px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 transition cursor-pointer ${viewMode === "table" ? "bg-[#832D51] text-white shadow-xs" : "text-slate-500 hover:text-slate-800"}`
    },
    /* @__PURE__ */ React.createElement(Table, { size: 12 }),
    " Table"
  )))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-[#EA6993]/5 border border-[#EA6993]/20 p-4 rounded-xl shadow-xs space-y-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] font-black uppercase tracking-wider text-[#EA6993]" }, "Pending Calls"), /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-black text-slate-900" }, totalPending)), /* @__PURE__ */ React.createElement("div", { className: "bg-emerald-50 border border-emerald-250 p-4 rounded-xl shadow-xs space-y-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] font-black uppercase tracking-wider text-emerald-800" }, "Completed Today"), /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-black text-emerald-700" }, totalCompleted)), /* @__PURE__ */ React.createElement("div", { className: "bg-rose-50 border border-rose-250 p-4 rounded-xl shadow-xs space-y-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] font-black uppercase tracking-wider text-rose-800" }, "Overdue Reminders"), /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-black text-rose-600" }, totalOverdue)), /* @__PURE__ */ React.createElement("div", { className: "bg-[#832D51]/5 border border-[#832D51]/20 p-4 rounded-xl shadow-xs space-y-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] font-black uppercase tracking-wider text-[#832D51]" }, "High Priority"), /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-black text-slate-900" }, totalHigh))), /* @__PURE__ */ React.createElement("div", { className: "bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs" }, /* @__PURE__ */ React.createElement("div", { className: "relative flex-1 min-w-[240px]" }, /* @__PURE__ */ React.createElement(Search, { className: "w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" }), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      placeholder: "Search customer, representative, notes...",
      value: search,
      onChange: (e) => setSearch(e.target.value),
      className: "w-full h-9 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#832D51]"
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold" }, /* @__PURE__ */ React.createElement("span", { className: "text-slate-500" }, "Status:"), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: statusFilter,
      onChange: (e) => setStatusFilter(e.target.value),
      className: "bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer font-black"
    },
    /* @__PURE__ */ React.createElement("option", { value: "All" }, "All Statuses"),
    /* @__PURE__ */ React.createElement("option", { value: "Pending" }, "Pending"),
    /* @__PURE__ */ React.createElement("option", { value: "Completed" }, "Completed"),
    /* @__PURE__ */ React.createElement("option", { value: "Overdue" }, "Overdue"),
    /* @__PURE__ */ React.createElement("option", { value: "Rescheduled" }, "Rescheduled")
  ))), viewMode === "cards" ? /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 sm:grid-cols-2" }, filteredFollowups.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-bold text-xs col-span-2" }, "No follow-ups match search filters.") : filteredFollowups.map((item) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: item.id,
      className: "bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-[#832D51]/35 transition space-y-3"
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between border-b border-slate-100 pb-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("h3", { className: "text-sm font-black text-slate-900" }, item.customer), /* @__PURE__ */ React.createElement("span", { className: `px-2 py-0.5 rounded-full text-[9px] font-black border ${STATUS_COLORS[item.status] || "bg-slate-100 text-slate-700 border-slate-350"}` }, item.status)), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold text-slate-450 mt-0.5" }, "Contact POC: ", item.contactPerson)), /* @__PURE__ */ React.createElement("div", { className: "text-right" }, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] font-bold text-[#832D51] bg-[#832D51]/5 px-2 py-1 rounded-md border border-[#832D51]/15" }, "SE: ", item.executive))),
    /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-3 gap-2 text-[10px] font-bold text-slate-650 p-2.5 bg-slate-50 border border-slate-100 rounded-xl" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "text-[8px] text-slate-400 block uppercase" }, "Type"), /* @__PURE__ */ React.createElement("span", { className: "text-slate-900 font-extrabold" }, item.type)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "text-[8px] text-slate-400 block uppercase" }, "Scheduled"), /* @__PURE__ */ React.createElement("span", { className: "text-[#EA6993] font-extrabold" }, item.scheduledTime)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "text-[8px] text-slate-400 block uppercase" }, "Priority"), /* @__PURE__ */ React.createElement("span", { className: `font-extrabold ${PRIORITY_COLORS[item.priority] || "text-slate-750"}` }, item.priority))),
    /* @__PURE__ */ React.createElement("div", { className: "p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] text-slate-700 font-medium" }, /* @__PURE__ */ React.createElement("span", { className: "text-[8px] font-black text-slate-400 block uppercase" }, "Details"), /* @__PURE__ */ React.createElement("p", { className: "mt-0.5 leading-relaxed" }, item.notes))
  ))) : /* @__PURE__ */ React.createElement("div", { className: "bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm" }, /* @__PURE__ */ React.createElement("div", { className: "overflow-x-auto" }, /* @__PURE__ */ React.createElement("table", { className: "w-full text-left text-xs text-slate-700 min-w-[900px]" }, /* @__PURE__ */ React.createElement("thead", { className: "bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-200" }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { className: "px-5 py-4" }, "Customer"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-4" }, "POC Contact"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-4" }, "Rep Code"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-4" }, "Sales Rep"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-4" }, "Type"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-4" }, "Scheduled Date"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-4" }, "Priority"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-4" }, "Status"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-4 text-center" }, "Action"))), /* @__PURE__ */ React.createElement("tbody", { className: "divide-y divide-slate-100 font-bold" }, filteredFollowups.length === 0 ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: "9", className: "text-center py-10 text-slate-400" }, "No matching follow-ups.")) : filteredFollowups.map((item) => /* @__PURE__ */ React.createElement("tr", { key: item.id, className: "hover:bg-slate-50/50 transition" }, /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5 text-slate-900 font-black" }, item.customer), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5 text-slate-600 font-semibold" }, item.contactPerson), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5" }, /* @__PURE__ */ React.createElement("span", { className: "bg-slate-50 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded font-mono font-bold text-[10px]" }, item.employeeCode)), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5 text-[#832D51]" }, item.executive), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5 text-slate-650" }, item.type), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5 text-slate-800" }, formatDate(item.scheduledTime)), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5" }, /* @__PURE__ */ React.createElement("span", { className: `font-black ${PRIORITY_COLORS[item.priority] || "text-slate-700"}` }, item.priority)), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5" }, /* @__PURE__ */ React.createElement("span", { className: `px-2 py-0.5 rounded-full text-[9px] font-black border ${STATUS_COLORS[item.status] || "bg-slate-100 text-slate-700 border-slate-300"}` }, item.status)), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5 text-center" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setSelectedItem(item),
      className: "px-2.5 py-1.5 rounded-xl bg-[#832D51] hover:bg-[#6a2240] text-white font-extrabold text-[10px] shadow-xs cursor-pointer transition active:scale-95 flex items-center gap-1 mx-auto"
    },
    /* @__PURE__ */ React.createElement(Eye, { size: 12 }),
    " View"
  )))))))), selectedItem && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-in fade-in duration-150" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 text-slate-900 text-xs font-bold" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between border-b border-slate-100 pb-3" }, /* @__PURE__ */ React.createElement("h3", { className: "text-base font-black text-slate-900 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(PhoneCall, { className: "w-5 h-5 text-[#832D51]" }), " Follow-Up Log Detail"), /* @__PURE__ */ React.createElement("button", { onClick: () => setSelectedItem(null), className: "p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer" }, /* @__PURE__ */ React.createElement(X, { size: 18 }))), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] text-slate-400 block uppercase" }, "CLIENT COMPANY"), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-black text-slate-900 mt-0.5" }, selectedItem.customer)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] text-slate-400 block uppercase" }, "PRIMARY POC CONTACT"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-800 mt-0.5" }, selectedItem.contactPerson)), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3 pt-2" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] text-slate-400 block uppercase" }, "REPRESENTATIVE"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-[#832D51] mt-0.5" }, selectedItem.executive)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] text-slate-400 block uppercase" }, "EMPLOYEE CODE"), /* @__PURE__ */ React.createElement("p", { className: "text-xs font-mono text-slate-700 mt-0.5" }, selectedItem.employeeCode))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-3 gap-2 pt-2 border-t border-slate-100" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] text-slate-400 block uppercase" }, "TYPE"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-850 mt-0.5" }, selectedItem.type)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] text-slate-400 block uppercase" }, "SCHEDULED"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-teal-850 mt-0.5" }, selectedItem.scheduledTime)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] text-slate-400 block uppercase" }, "PRIORITY"), /* @__PURE__ */ React.createElement("p", { className: `text-xs font-black mt-0.5 ${PRIORITY_COLORS[selectedItem.priority] || "text-slate-800"}` }, selectedItem.priority))), /* @__PURE__ */ React.createElement("div", { className: "p-3 bg-slate-50 border border-slate-100 rounded-xl mt-3 font-semibold text-slate-700" }, /* @__PURE__ */ React.createElement("span", { className: "text-[8px] font-black text-slate-400 block uppercase" }, "FOLLOW UP DESCRIPTION & REMARKS"), /* @__PURE__ */ React.createElement("p", { className: "mt-0.5 leading-relaxed" }, selectedItem.notes))))));
}
