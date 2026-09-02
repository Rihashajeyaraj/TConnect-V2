import { useState, useEffect, useMemo } from "react";
import { Search, Receipt, RefreshCw, Calendar, ExternalLink, CheckCircle2, Clock, XCircle, Download } from "lucide-react";
import { expenseAPI } from "../../services/api.js";
const STATUS_META = {
  APPROVED: { label: "Approved", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  approved: { label: "Approved", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  Approved: { label: "Approved", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PENDING: { label: "Pending", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  REJECTED: { label: "Rejected", cls: "bg-rose-50 text-rose-700 border-rose-200" }
};
function fmtINR(val) {
  const n = parseFloat(String(val).replace(/[^\d.]/g, "")) || 0;
  return "\u20B9" + n.toLocaleString("en-IN");
}
function fmtDate(str) {
  if (!str || str === "\u2014" || str === "--") return "\u2014";
  try {
    const s = String(str).split("T")[0].split(" ")[0];
    const parts = s.split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      const [y, m, d] = parts;
      return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
    }
    const dObj = new Date(str);
    if (!isNaN(dObj.getTime())) {
      const day = String(dObj.getDate()).padStart(2, "0");
      const month = String(dObj.getMonth() + 1).padStart(2, "0");
      const year = dObj.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return String(str);
  } catch {
    return String(str);
  }
}
function normalize(e, idx) {
  const statusRaw = e.status || e.approval_status || "PENDING";
  const meta = STATUS_META[statusRaw] || { label: statusRaw, cls: "bg-slate-50 text-slate-600 border-slate-200" };
  const isApproved = (statusRaw || "").toLowerCase() === "approved";
  return {
    id: e.id || e.expense_id || `EXP-${idx}`,
    executive_name: e.employee_name || e.assigned_to || e.executive_name || e.name || "Sales Executive",
    executive_email: e.employee_email || e.assigned_to_email || e.executive_email || e.email || "",
    category: e.category || e.type || e.expense_type || "General",
    description: e.description || e.notes || e.purpose || "\u2014",
    amount: parseFloat(String(e.amount || 0).replace(/[^\d.]/g, "")) || 0,
    claim_date: e.created_at || e.claim_date || e.submitted_at || "",
    approved_by: e.reviewed_by || e.approved_by || e.manager_name || "\u2014",
    approved_at: e.approved_at || e.reviewed_at || e.approved_date || e.approval_date || e.updated_at || (isApproved ? e.created_at || e.claim_date || e.submitted_at : "") || "",
    receipt_url: e.receipt_url || e.receipt || e.bill_url || "",
    receipt_name: e.receipt_name || e.bill || e.file_name || "Receipt",
    status: statusRaw,
    status_label: meta.label,
    status_cls: meta.cls,
    remarks: e.remarks || e.manager_remarks || ""
  };
}
export default function CeoExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatus] = useState("Approved");
  async function fetchData() {
    setLoading(true);
    try {
      const res = await expenseAPI.getManagerExpenses({ status: "" });
      const raw = Array.isArray(res) ? res : res?.data?.expenses || res?.data || [];
      setExpenses(raw.map(normalize));
    } catch (err) {
      console.warn("CEO expenses fetch notice:", err);
      try {
        const res2 = await expenseAPI.getExpenses();
        const raw2 = Array.isArray(res2) ? res2 : res2?.data || [];
        setExpenses(raw2.map(normalize));
      } catch {
        setExpenses([]);
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    fetchData();
  }, []);
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return expenses.filter((e) => {
      const matchStatus = statusFilter === "All" || e.status_label === statusFilter || e.status.toUpperCase() === statusFilter.toUpperCase();
      const matchSearch = !q || e.executive_name.toLowerCase().includes(q) || e.executive_email.toLowerCase().includes(q) || e.category.toLowerCase().includes(q) || e.approved_by.toLowerCase().includes(q) || e.description.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [expenses, search, statusFilter]);
  const totalAmount = filtered.reduce((s, e) => s + e.amount, 0);
  const approvedCount = expenses.filter((e) => e.status_label === "Approved").length;
  const pendingCount = expenses.filter((e) => e.status_label === "Pending").length;
  return /* @__PURE__ */ React.createElement("div", { className: "mx-auto max-w-[1500px] space-y-6 pb-12" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "grid size-9 place-items-center rounded-xl bg-[#F8CAE4]/20 text-[#832D51]" }, /* @__PURE__ */ React.createElement(Receipt, { className: "size-5" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-black text-slate-900 tracking-tight" }, "Expense Claims Audit"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500 font-medium mt-0.5" }, "Full audit log of all executive expense claims approved by Sales Managers"))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: fetchData,
      disabled: loading,
      className: "flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#832D51] hover:bg-[#6a2240] text-white font-black text-xs shadow-xs transition cursor-pointer disabled:opacity-60"
    },
    /* @__PURE__ */ React.createElement(RefreshCw, { size: 13, className: loading ? "animate-spin" : "" }),
    "Refresh"
  )), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-4" }, [
    { label: "Total Claims", value: expenses.length, sub: "All time", color: "text-slate-900" },
    { label: "Approved", value: approvedCount, sub: "By Sales Managers", color: "text-emerald-700" },
    { label: "Pending", value: pendingCount, sub: "Awaiting approval", color: "text-amber-700" },
    { label: "Approved Amount", value: fmtINR(expenses.filter((e) => e.status_label === "Approved").reduce((s, e) => s + e.amount, 0)), sub: "Total disbursed", color: "text-[#832D51]" }
  ].map((c) => /* @__PURE__ */ React.createElement("div", { key: c.label, className: "rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs" }, /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-bold uppercase tracking-wider text-slate-500" }, c.label), /* @__PURE__ */ React.createElement("p", { className: `text-2xl font-black mt-2 ${c.color}` }, c.value), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-400 font-medium mt-0.5" }, c.sub)))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col sm:flex-row items-center gap-3 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs" }, /* @__PURE__ */ React.createElement("div", { className: "relative flex-1 w-full" }, /* @__PURE__ */ React.createElement(Search, { className: "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" }), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      placeholder: "Search executive, category, manager, description...",
      value: search,
      onChange: (e) => setSearch(e.target.value),
      className: "h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 text-xs font-semibold text-slate-900 outline-none focus:border-[#832D51] focus:bg-white"
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200" }, ["All", "Approved", "Pending", "Rejected"].map((s) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: s,
      onClick: () => setStatus(s),
      className: `px-3.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${statusFilter === s ? "bg-[#832D51] text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"}`
    },
    s
  )))), /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden" }, loading ? /* @__PURE__ */ React.createElement("div", { className: "py-16 text-center" }, /* @__PURE__ */ React.createElement(RefreshCw, { className: "animate-spin size-6 text-[#832D51] mx-auto mb-3" }), /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold text-slate-500" }, "Loading expense records...")) : filtered.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "py-16 text-center text-xs text-slate-400 font-semibold" }, "No expense records found for the selected filter.") : /* @__PURE__ */ React.createElement("div", { className: "overflow-x-auto" }, /* @__PURE__ */ React.createElement("table", { className: "w-full text-left text-xs" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/60" }, /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3.5" }, "Executive"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3.5" }, "Category"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3.5" }, "Description"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3.5 text-right" }, "Amount"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3.5" }, "Claim Date"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3.5" }, "Approved By"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3.5" }, "Approved On"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3.5" }, "Receipt"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3.5" }, "Status"))), /* @__PURE__ */ React.createElement("tbody", { className: "divide-y divide-slate-100 font-medium" }, filtered.map((e) => /* @__PURE__ */ React.createElement("tr", { key: e.id, className: "hover:bg-slate-50/60 transition" }, /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5" }, /* @__PURE__ */ React.createElement("p", { className: "font-extrabold text-slate-900" }, e.executive_name), e.executive_email && /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-400" }, e.executive_email)), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5 text-slate-700 font-bold" }, e.category), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5 text-slate-600 max-w-[180px] truncate", title: e.description }, e.description), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5 text-right font-black text-slate-900" }, fmtINR(e.amount)), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5 text-slate-600" }, /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Calendar, { className: "size-3 text-slate-400" }), fmtDate(e.claim_date))), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5 font-bold text-slate-800" }, e.approved_by), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5 text-slate-600" }, fmtDate(e.approved_at)), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5" }, e.receipt_url ? /* @__PURE__ */ React.createElement(
    "a",
    {
      href: e.receipt_url,
      target: "_blank",
      rel: "noreferrer",
      className: "inline-flex items-center gap-1 text-[#832D51] font-bold hover:underline"
    },
    /* @__PURE__ */ React.createElement(ExternalLink, { className: "size-3" }),
    "View"
  ) : /* @__PURE__ */ React.createElement("span", { className: "text-slate-400 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Receipt, { className: "size-3" }), e.receipt_name !== "Receipt" ? e.receipt_name : "\u2014")), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5" }, /* @__PURE__ */ React.createElement("span", { className: `inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black border ${e.status_cls}` }, e.status_label === "Approved" && /* @__PURE__ */ React.createElement(CheckCircle2, { className: "size-3" }), e.status_label === "Pending" && /* @__PURE__ */ React.createElement(Clock, { className: "size-3" }), e.status_label === "Rejected" && /* @__PURE__ */ React.createElement(XCircle, { className: "size-3" }), e.status_label))))), /* @__PURE__ */ React.createElement("tfoot", null, /* @__PURE__ */ React.createElement("tr", { className: "border-t-2 border-slate-200 bg-slate-50/80 font-black text-slate-900 text-xs" }, /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5", colSpan: 3 }, "Showing ", filtered.length, " of ", expenses.length, " records"), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3.5 text-right text-[#832D51]" }, fmtINR(totalAmount)), /* @__PURE__ */ React.createElement("td", { colSpan: 5 })))))));
}
