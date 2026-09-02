import { useState, useEffect } from "react";
import { Calendar, Search, AlertCircle, CheckCircle, Clock, Check, X, MessageSquare } from "lucide-react";
import { useToast } from "../../common/ToastContext.jsx";
import { attendanceAPI, hrmsAPI } from "../../services/api.js";
import { formatDate } from "../../utils/dateUtils.js";
const STATUS_COLORS = {
  Pending: "text-amber-600 bg-amber-50 border-amber-100",
  Approved: "text-emerald-600 bg-emerald-50 border-emerald-100",
  Rejected: "text-rose-600 bg-rose-50 border-rose-100"
};
function Leaves() {
  const { showToast } = useToast();
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState("Approved");
  const [remarks, setRemarks] = useState("");
  const loadData = async () => {
    setLoading(true);
    try {
      const leaveRes = await attendanceAPI.getLeaveRequests().catch(() => null);
      const empRes = await hrmsAPI.getEmployees().catch(() => null);
      const rawLeaves = leaveRes && leaveRes.data ? leaveRes.data : [];
      const rawEmps = empRes && empRes.data ? empRes.data : [];
      setEmployees(rawEmps);
      if (rawLeaves.length > 0) {
        const loadedLeaves = rawLeaves.map((l) => {
          const matchedEmp = rawEmps.find((e) => e.employee_id === l.employee_code || e.email === l.employee_email);
          return {
            id: l.id || l.leave_id,
            name: l.employee_name || matchedEmp?.name || "Staff Member",
            role: matchedEmp?.role || l.designation || "Sales Manager",
            type: l.leave_type || "Casual Leave",
            start: l.from_date || l.start_date || "N/A",
            end: l.to_date || l.end_date || "N/A",
            days: l.duration || 1,
            reason: l.reason || "Personal work",
            status: l.status || "Pending",
            remarks: l.comment || l.remarks || ""
          };
        });
        setLeaves(loadedLeaves);
      } else {
        setLeaves([]);
      }
    } catch (e) {
      console.warn("Leaves directory load notice:", e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadData();
  }, []);
  const handleOpenApproval = (req, type) => {
    setSelectedRequest(req);
    setActionType(type);
    setRemarks("");
    setShowApprovalModal(true);
  };
  const handleConfirmApproval = async () => {
    if (!selectedRequest) return;
    try {
      await attendanceAPI.updateLeaveStatus(selectedRequest.id, actionType, remarks);
      setLeaves(
        (prev) => prev.map(
          (l) => l.id === selectedRequest.id ? { ...l, status: actionType, remarks } : l
        )
      );
      showToast(`Leave request ${actionType.toLowerCase()} successfully!`, "success");
      setShowApprovalModal(false);
      setSelectedRequest(null);
    } catch (err) {
      showToast(`Failed to update leave status: ${err?.message || "Server Error"}`, "error");
    }
  };
  const filtered = leaves.filter((l) => {
    const isExecutiveRole = (l.role || "").toLowerCase().includes("manager") || (l.role || "").toLowerCase().includes("admin");
    const matchesSearch = l.name.toLowerCase().includes(search.toLowerCase()) || l.type.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || l.status === statusFilter;
    return isExecutiveRole && matchesSearch && matchesStatus;
  });
  return /* @__PURE__ */ React.createElement("div", { className: "mx-auto max-w-[1400px] space-y-6 font-sans" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Calendar, { className: "w-5 h-5 text-[#832D51]" }), " Executive Leave Management"), /* @__PURE__ */ React.createElement("p", { className: "mt-0.5 text-xs font-semibold text-slate-500" }, "Review and approve leave requests submitted by corporate Admins and Sales Managers."))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col sm:flex-row items-center gap-4 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm" }, /* @__PURE__ */ React.createElement("div", { className: "relative flex-1 w-full" }, /* @__PURE__ */ React.createElement(Search, { className: "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" }), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      placeholder: "Search by corporate representative...",
      value: search,
      onChange: (e) => setSearch(e.target.value),
      className: "h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-bold text-slate-900 outline-none transition focus:border-[#EA6993] focus:bg-white"
    }
  )), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: statusFilter,
      onChange: (e) => setStatusFilter(e.target.value),
      className: "h-10 text-xs border border-slate-200 rounded-xl px-3 bg-slate-50 font-bold text-slate-600 focus:outline-none"
    },
    /* @__PURE__ */ React.createElement("option", { value: "All" }, "All Requests"),
    /* @__PURE__ */ React.createElement("option", { value: "Pending" }, "Pending Only"),
    /* @__PURE__ */ React.createElement("option", { value: "Approved" }, "Approved Only"),
    /* @__PURE__ */ React.createElement("option", { value: "Rejected" }, "Rejected Only")
  )), /* @__PURE__ */ React.createElement("div", { className: "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" }, /* @__PURE__ */ React.createElement("table", { className: "w-full border-collapse text-left text-xs text-slate-600" }, /* @__PURE__ */ React.createElement("thead", { className: "bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100" }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { className: "px-6 py-4" }, "Employee Name"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-4" }, "Designation"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-4" }, "Leave Type"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-4" }, "Dates"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-4 text-center" }, "Duration"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-4" }, "Reason"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-4" }, "Remarks / Comments"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-4" }, "Status"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-4 text-right" }, "Actions"))), /* @__PURE__ */ React.createElement("tbody", { className: "divide-y divide-slate-100 font-semibold text-slate-700" }, filtered.map((l) => /* @__PURE__ */ React.createElement("tr", { key: l.id, className: "hover:bg-slate-50/50 transition" }, /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 text-slate-900 font-bold" }, l.name), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4" }, /* @__PURE__ */ React.createElement("span", { className: "bg-[#EA6993]/10 text-[#938160] px-2 py-0.5 rounded-lg text-[9px] font-black uppercase" }, l.role)), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 text-slate-800" }, l.type), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 whitespace-nowrap" }, formatDate(l.start), " to ", formatDate(l.end)), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 text-center font-bold text-slate-950" }, l.days, " days"), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 text-slate-500 max-w-xs truncate" }, l.reason), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 text-slate-400 italic font-normal" }, l.remarks || "No remarks added"), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4" }, /* @__PURE__ */ React.createElement("span", { className: `inline-flex items-center gap-1 rounded-lg border px-2.5 py-0.5 text-[10px] font-black ${STATUS_COLORS[l.status]}` }, l.status)), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 text-right space-x-2 whitespace-nowrap" }, l.status === "Pending" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleOpenApproval(l, "Approved"),
      className: "h-7 w-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold inline-flex items-center justify-center transition cursor-pointer",
      title: "Approve Request"
    },
    /* @__PURE__ */ React.createElement(Check, { className: "size-3.5" })
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleOpenApproval(l, "Rejected"),
      className: "h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold inline-flex items-center justify-center transition cursor-pointer",
      title: "Reject Request"
    },
    /* @__PURE__ */ React.createElement(X, { className: "size-3.5" })
  )) : /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-slate-400" }, "Processed")))), filtered.length === 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 9, className: "py-8 text-center text-slate-400 font-semibold" }, "No leave requests found matching filters."))))), showApprovalModal && selectedRequest && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-in fade-in duration-200" }, /* @__PURE__ */ React.createElement("div", { className: "w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between border-b border-slate-100 pb-3" }, /* @__PURE__ */ React.createElement("h3", { className: "text-base font-extrabold text-slate-900" }, "Confirm: ", actionType === "Approved" ? "Approve Leave" : "Reject Leave"), /* @__PURE__ */ React.createElement("button", { onClick: () => setShowApprovalModal(false), className: "text-slate-400 hover:text-slate-600" }, "\u2715")), /* @__PURE__ */ React.createElement("div", { className: "space-y-3.5 text-xs font-semibold text-slate-700" }, /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 border border-slate-100 p-3.5 rounded-xl space-y-1" }, /* @__PURE__ */ React.createElement("p", { className: "font-bold text-slate-900" }, selectedRequest.name, " (", selectedRequest.role, ")"), /* @__PURE__ */ React.createElement("p", { className: "text-slate-400" }, selectedRequest.type, " \u2022 ", selectedRequest.days, " days"), /* @__PURE__ */ React.createElement("p", { className: "text-slate-500 italic mt-1.5" }, '" ', selectedRequest.reason, ' "')), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-[11px] font-bold text-slate-500 mb-1.5 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(MessageSquare, { className: "size-3 text-slate-400" }), " Executive Remarks / Remarks"), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      value: remarks,
      onChange: (e) => setRemarks(e.target.value),
      placeholder: "Add corporate reason or note for this decision...",
      className: "w-full h-20 rounded-xl border border-slate-200 p-3 font-bold text-slate-900 outline-none focus:border-[#EA6993] resize-none"
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end gap-2 pt-2 border-t border-slate-50" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setShowApprovalModal(false),
      className: "px-4 py-2 rounded-xl border border-slate-250 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
    },
    "Cancel"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleConfirmApproval,
      className: `px-5 py-2 rounded-xl text-white font-extrabold shadow-sm cursor-pointer ${actionType === "Approved" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`
    },
    "Confirm Decision"
  ))))));
}
export default Leaves;
