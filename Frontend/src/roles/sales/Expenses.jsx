import React, { useState, useEffect } from "react";
import {
  Receipt,
  Plus,
  IndianRupee,
  CalendarDays,
  FileImage,
  CheckCircle,
  Clock3,
  XCircle,
  Wallet,
  Building2,
  Send,
  Check,
  X,
  MapPin,
  FileText,
  UserCheck,
} from "lucide-react";
import { useToast } from "../../common/ToastContext.jsx";
import useCurrentUser from "../../hooks/useCurrentUser.js";
import { filterUserItems, isItemOwnedByUser } from "../../utils/userScope.js";
import { expenseAPI, notificationAPI } from "../../services/api.js";
import { useAutoSave } from "../../services/useAutoSave.js";

const formatDateDDMMYYYY = (val) => {
  if (!val || val === '—' || val === 'N/A') return '—';
  try {
    const s = String(val).trim();
    if (s.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) return s;
    const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[3]}/${match[2]}/${match[1]}`;
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return s;
  } catch {
    return val;
  }
};

export default function Expenses(props) {
  const { showToast } = useToast();
  const isModalView = props?.isModalView || false;
  const currentUser = useCurrentUser();

  const userEmail = (currentUser.email || "").toLowerCase().trim();
  const userName = currentUser.name || currentUser.full_name || userEmail.split("@")[0] || "Sales Executive";
  const userEmpCode = currentUser.employee_code || currentUser.employee_id || "";
  const userId = currentUser.id || currentUser.user_id || "";
  const userPhone = currentUser.phone || currentUser.mobile || currentUser.phone_number || "";

  const matchesUser = () => true; // API scoping already filters to current user's expenses

  // Load Sales Visits from Shared LocalStorage
  const [visitsList, setVisitsList] = useState([]);
  useEffect(() => {
    try {
      const savedVisits = JSON.parse(localStorage.getItem("tc_sales_visits") || "[]");
      setVisitsList(filterUserItems(savedVisits, currentUser));
    } catch (err) {}
  }, [userEmail]);

  // Persistent Expense State - empty by default, loaded from API
  const [expenseList, setExpenseList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await expenseAPI.getExpenses();
      if (res?.data && Array.isArray(res.data)) {
        const normalized = res.data.map((e, idx) => {
          const eId = e.expense_id || e.id;
          let rawDesc = e.title || e.description || "—";
          let clientName = e.customer_name || e.employee_name || "—";
          let location = e.location || "—";
          let remarks = rawDesc;
          let visitDate = e.expense_date || e.date || "";

          if (rawDesc.startsWith("EXPENSE_VISIT_DETAILS:::")) {
            try {
              const parsed = JSON.parse(rawDesc.replace("EXPENSE_VISIT_DETAILS:::", ""));
              clientName = parsed.customer_name || clientName;
              location = parsed.visit_location || location;
              remarks = parsed.description || "";
              visitDate = parsed.visit_date || visitDate;
            } catch (err) {
              console.warn("Failed parsing expense JSON:", err);
            }
          }

          return {
            ...e,
            id: eId,
            visitId: e.visit_id || "direct",
            type: e.category || "General",
            category: e.category || "General",
            amount: e.amount ? `₹${parseFloat(e.amount).toLocaleString("en-IN")}` : "₹0",
            rawAmount: parseFloat(e.amount) || 0,
            clientName: clientName,
            location: location,
            remarks: remarks,
            status: e.status || "Pending Team Lead Review",
            date: formatDateDDMMYYYY(visitDate),
            submittedAt: e.created_at ? new Date(e.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "",
            billFileName: e.bill_file_name || "",
            reporting_manager: e.reporting_manager || "Not Assigned",
            reporting_manager_email: e.reporting_manager_email || "",
          };
        });
        const userOnlyExpenses = normalized.filter((item) => isItemOwnedByUser(item, currentUser));
        setExpenseList(userOnlyExpenses);
      } else {
        setExpenseList([]);
      }
    } catch (err) {
      console.error("Failed fetching expenses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [userEmail]);


  // Form State
  const initialFormValues = {
    visitId: "",
    clientName: "",
    location: "",
    type: "Travel / Fuel",
    customType: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    remarks: "",
    billFile: null,
    billDataUrl: "",
  };

  const {
    formData: form,
    setFormData: setForm,
    clearDraft: clearFormDraft,
    saveStatus: formSaveStatus
  } = useAutoSave('draft_expense_form', initialFormValues);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setForm((prev) => ({
          ...prev,
          billFile: file,
          billDataUrl: evt.target.result,
        }));
      };
      reader.readAsDataURL(file);
    } else {
      setForm((prev) => ({ ...prev, billFile: null, billDataUrl: "" }));
    }
  };

  const [showSubmitModal, setShowSubmitModal] = useState(props?.defaultOpenSubmit || false);

  useEffect(() => {
    if (props?.defaultOpenSubmit) {
      setShowSubmitModal(props.defaultOpenSubmit);
    }
  }, [props?.defaultOpenSubmit]);

  // When a site visit is selected, auto-fill Client Name & Location
  const handleVisitSelect = (vId) => {
    const selectedVisit = visitsList.find((v) => v.id === vId);
    if (selectedVisit) {
      setForm((prev) => ({
        ...prev,
        visitId: vId,
        clientName: selectedVisit.customer || selectedVisit.client || selectedVisit.customerName || "Client Site",
        location: selectedVisit.location || selectedVisit.address || "Client Site",
        date: selectedVisit.date || prev.date,
      }));
    } else {
      setForm((prev) => ({ ...prev, visitId: vId }));
    }
  };

  // Submit Expense Request to Sales Manager
  const handleSubmitExpense = async (e) => {
    e.preventDefault();

    if (!form.amount || parseFloat(form.amount) <= 0) {
      showToast("Please enter a valid expense amount!", "error");
      return;
    }

    const numericVal = parseFloat(form.amount) || 0;
    const formattedAmountStr = `₹${numericVal.toLocaleString("en-IN")}`;
    const finalType = form.type === "Other" && form.customType.trim() ? form.customType.trim() : form.type;

    let uploadedDataUrl = "";
    if (form.billFile) {
      try {
        uploadedDataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (evt) => resolve(evt.target.result);
          reader.onerror = () => resolve("");
          reader.readAsDataURL(form.billFile);
        });
      } catch (err) {}
    }

    // 1. Persist to Supabase via backend API
    try {
      const selectedVisit = visitsList.find((v) => v.id === form.visitId);
      const visitDetails = {
        customer_name: form.clientName?.trim() || "Client Site",
        company: form.clientName?.trim() || "Client Company",
        visit_location: form.location?.trim() || "Client Location",
        visit_date: form.date || new Date().toISOString().slice(0, 10),
        visit_time: selectedVisit?.visit_time || "10:30 AM",
        purpose: selectedVisit?.purpose || "Client meeting",
        description: form.remarks || "Site visit expense"
      };
      const encodedDescription = `EXPENSE_VISIT_DETAILS:::${JSON.stringify(visitDetails)}`;

      await expenseAPI.createExpense({
        category: finalType,
        amount: numericVal,
        description: encodedDescription,
        currency: "INR",
        receipt_url: uploadedDataUrl || null,
        bill_file_name: form.billFile ? form.billFile.name : null,
        visit_id: form.visitId || null,
        customer_name: form.clientName?.trim() || null,
        location: form.location?.trim() || null,
        date: form.date,
      });

      showToast(`📨 Expense Request (${formattedAmountStr}) submitted for Team Lead review!`, "success");

      // 2. Reset Form
      clearFormDraft();
      setShowSubmitModal(false);

      // 3. Refresh list from backend database
      await fetchExpenses();
    } catch (apiErr) {
      const errMsg = apiErr.response?.data?.detail || apiErr.message || "Failed to submit expense request";
      showToast(errMsg, "error");
    }
  };

  // Compute Live Metrics strictly for logged in executive
  const allMyExpenses = expenseList.filter(matchesUser);
  const totalAmount = allMyExpenses.reduce((acc, curr) => acc + (curr.rawAmount || parseInt(String(curr.amount || 0).replace(/[^0-9]/g, "")) || 0), 0);
  const approvedAmount = allMyExpenses
    .filter((e) => (e.status || "").toLowerCase().includes("approved"))
    .reduce((acc, curr) => acc + (curr.rawAmount || parseInt(String(curr.amount || 0).replace(/[^0-9]/g, "")) || 0), 0);

  const pendingAmount = allMyExpenses
    .filter((e) => (e.status || "").toLowerCase().includes("pending"))
    .reduce((acc, curr) => acc + (curr.rawAmount || parseInt(String(curr.amount || 0).replace(/[^0-9]/g, "")) || 0), 0);

  const rejectedAmount = allMyExpenses
    .filter((e) => (e.status || "").toLowerCase().includes("reject"))
    .reduce((acc, curr) => acc + (curr.rawAmount || parseInt(String(curr.amount || 0).replace(/[^0-9]/g, "")) || 0), 0);

  const myExpenseList = allMyExpenses.filter((e) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "approved") return (e.status || "").toLowerCase().includes("approved");
    if (statusFilter === "pending") return (e.status || "").toLowerCase().includes("pending");
    if (statusFilter === "rejected") return (e.status || "").toLowerCase().includes("reject");
    return true;
  });

  return (
    <div className="space-y-6 font-sans text-slate-900">
      {/* Header Banner */}
      {!isModalView ? (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-md shadow-amber-500/20">
              <Wallet size={24} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Reimbursements
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowSubmitModal(true)}
            className="px-5 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer shadow-md shadow-teal-600/20"
          >
            <Plus size={18} /> Request Visit Expense
          </button>
        </div>
      ) : (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => setShowSubmitModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer shadow-md shadow-teal-600/20"
          >
            <Plus size={16} /> Request Visit Expense
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter("all")}
          className={`rounded-3xl p-5 border shadow-2xs space-y-1 transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${
            statusFilter === "all"
              ? "bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-850 border-blue-800 ring-2 ring-blue-500/40 shadow-lg shadow-blue-500/20 text-white"
              : "bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50/20 border-blue-100 hover:from-blue-100/50 hover:to-indigo-100/30 hover:border-blue-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-black uppercase tracking-wider ${statusFilter === "all" ? "text-blue-100" : "text-slate-500"}`}>Total Claims</span>
            <Wallet size={18} className={statusFilter === "all" ? "text-white" : "text-blue-600"} />
          </div>
          <h2 className={`text-xl sm:text-2xl font-black ${statusFilter === "all" ? "text-white" : "text-slate-900"}`}>
            ₹{totalAmount.toLocaleString("en-IN")}
          </h2>
          <p className={`text-[11px] font-semibold ${statusFilter === "all" ? "text-blue-200" : "text-slate-500"}`}>{expenseList.length} total requests</p>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === "approved" ? "all" : "approved")}
          className={`rounded-3xl p-5 border shadow-2xs space-y-1 transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${
            statusFilter === "approved"
              ? "bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-850 border-emerald-800 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-500/20 text-white"
              : "bg-gradient-to-br from-emerald-50 via-slate-50 to-teal-50/20 border-emerald-100 hover:from-emerald-100/50 hover:to-teal-100/30 hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-black uppercase tracking-wider ${statusFilter === "approved" ? "text-emerald-100" : "text-emerald-800"}`}>Approved</span>
            <CheckCircle size={18} className={statusFilter === "approved" ? "text-white" : "text-emerald-600"} />
          </div>
          <h2 className={`text-xl sm:text-2xl font-black ${statusFilter === "approved" ? "text-white" : "text-emerald-700"}`}>
            ₹{approvedAmount.toLocaleString("en-IN")}
          </h2>
          <p className={`text-[11px] font-semibold ${statusFilter === "approved" ? "text-emerald-200" : "text-emerald-600"}`}>Cleared by Manager</p>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === "pending" ? "all" : "pending")}
          className={`rounded-3xl p-5 border shadow-2xs space-y-1 transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${
            statusFilter === "pending"
              ? "bg-gradient-to-br from-amber-600 via-amber-700 to-orange-850 border-amber-850 ring-2 ring-amber-500/40 shadow-lg shadow-amber-500/20 text-white"
              : "bg-gradient-to-br from-amber-50 via-slate-50 to-orange-50/20 border-amber-100 hover:from-amber-100/50 hover:to-orange-100/30 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-black uppercase tracking-wider ${statusFilter === "pending" ? "text-amber-100" : "text-amber-800"}`}>Pending</span>
            <Clock3 size={18} className={statusFilter === "pending" ? "text-white" : "text-amber-500"} />
          </div>
          <h2 className={`text-xl sm:text-2xl font-black ${statusFilter === "pending" ? "text-white" : "text-amber-600"}`}>
            ₹{pendingAmount.toLocaleString("en-IN")}
          </h2>
          <p className={`text-[11px] font-semibold ${statusFilter === "pending" ? "text-amber-200" : "text-amber-600"}`}>Awaiting Manager Approval</p>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === "rejected" ? "all" : "rejected")}
          className={`rounded-3xl p-5 border shadow-2xs space-y-1 transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${
            statusFilter === "rejected"
              ? "bg-gradient-to-br from-rose-600 via-rose-700 to-pink-850 border-rose-800 ring-2 ring-rose-500/40 shadow-lg shadow-rose-500/20 text-white"
              : "bg-gradient-to-br from-rose-50 via-slate-50 to-pink-50/20 border-rose-100 hover:from-rose-100/50 hover:to-pink-100/30 hover:border-rose-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-black uppercase tracking-wider ${statusFilter === "rejected" ? "text-rose-100" : "text-rose-800"}`}>Rejected</span>
            <XCircle size={18} className={statusFilter === "rejected" ? "text-white" : "text-rose-600"} />
          </div>
          <h2 className={`text-xl sm:text-2xl font-black ${statusFilter === "rejected" ? "text-white" : "text-rose-600"}`}>
            ₹{rejectedAmount.toLocaleString("en-IN")}
          </h2>
          <p className={`text-[11px] font-semibold ${statusFilter === "rejected" ? "text-rose-200" : "text-rose-600"}`}>Requires revision</p>
        </div>
      </div>

      {/* Expense Requests History Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900">Visit Expense Claim History</h2>
            <p className="text-xs text-slate-500 font-medium">All logged visit expenses submitted to Sales Manager</p>
          </div>
          <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
            {myExpenseList.length} Requests Logged
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Visit / Client Account</th>
                <th className="py-3.5 px-4">Expense Type</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Claim Amount</th>
                <th className="py-3.5 px-4">Remarks & Vouchers</th>
                <th className="py-3.5 px-4 text-right">Approval Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {myExpenseList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 font-bold">
                    No visit expenses submitted yet.
                  </td>
                </tr>
              ) : (
                myExpenseList.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900 text-sm">{exp.clientName || "Field Site Visit"}</div>
                      <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                        <MapPin size={12} className="text-rose-500 shrink-0" />
                        {exp.location || "Site Location"}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-extrabold border border-slate-200">
                        {exp.type}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-700">{formatDateDDMMYYYY(exp.date)}</td>

                    <td className="py-3.5 px-4 font-black text-teal-700 text-sm">{exp.amount}</td>

                    <td className="py-3.5 px-4 max-w-[240px]">
                      <p className="text-[11px] text-slate-600 font-medium leading-relaxed truncate">{exp.remarks}</p>
                      <div className="flex items-center gap-1 text-[10px] text-indigo-600 font-bold mt-0.5">
                        <FileImage size={11} /> {exp.billFileName || "Voucher Uploaded"}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {(() => {
                        const st = (exp.status || "").toLowerCase();
                        if (st.includes("approved")) {
                          return (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold border bg-emerald-50 text-emerald-800 border-emerald-300">
                              <CheckCircle size={13} /> Approved
                            </span>
                          );
                        } else if (st.includes("manager")) {
                          return (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold border bg-indigo-50 text-indigo-800 border-indigo-300">
                              <Clock3 size={13} /> Pending Manager Approval
                            </span>
                          );
                        } else if (st.includes("reject")) {
                          return (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold border bg-rose-50 text-rose-800 border-rose-300">
                              <XCircle size={13} /> Rejected
                            </span>
                          );
                        } else {
                          return (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold border bg-amber-50 text-amber-900 border-amber-300">
                              <Clock3 size={13} /> Pending Team Lead Review
                            </span>
                          );
                        }
                      })()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SUBMIT EXPENSE TO SALES MANAGER MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900">Request Visit Expense Approval</h3>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <p className="text-xs font-semibold text-teal-600">Send record directly to Sales Manager for verification</p>
                  <span className="text-[10px] font-black text-slate-400">·</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full transition-all ${
                    formSaveStatus === "saving" ? "bg-amber-100 text-amber-700 animate-pulse" : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {formSaveStatus === "saving" ? "⏳ Auto-saving..." : "✓ Saved to Supabase"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="p-2 rounded-2xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitExpense} className="space-y-4 text-xs sm:text-sm font-semibold">
              {/* Select Visit Option */}
              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">
                  Select Associated Client Visit (Optional)
                </label>
                <select
                  value={form.visitId}
                  onChange={(e) => handleVisitSelect(e.target.value)}
                  className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-slate-50 font-bold text-slate-800 focus:outline-none focus:border-teal-500 cursor-pointer"
                >
                  <option value="">-- General Field Visit / Standalone Expense --</option>
                  {visitsList.map((v) => (
                    <option key={v.id} value={v.id}>
                      📍 {v.customer || v.client || "Client"} - {v.location || "Site"} ({v.date || "Date"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Client Name & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Client / Company Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Global Solutions"
                    value={form.clientName}
                    onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white font-medium focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Visit Location</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Coimbatore Site"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white font-medium focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Category & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Expense Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white font-bold text-slate-800 focus:outline-none focus:border-teal-500 cursor-pointer"
                  >
                    <option value="Travel / Fuel">🚗 Travel / Fuel / Toll</option>
                    <option value="Client Food & Meeting">🍔 Client Food & Refreshments</option>
                    <option value="Accommodation / Stay">🏨 Accommodation / Hotel Stay</option>
                    <option value="Client Presentation / Printing">📑 Presentation / Printing / Demo</option>
                    <option value="Miscellaneous Field Cost">💼 Miscellaneous Field Cost</option>
                    <option value="Other">💼 Other Expense (Specify...)</option>
                  </select>
                  {form.type === "Other" && (
                    <input
                      type="text"
                      required
                      placeholder="Type custom expense category..."
                      value={form.customType}
                      onChange={(e) => setForm({ ...form, customType: e.target.value })}
                      className="w-full h-9 border border-teal-300 rounded-xl px-3 mt-2 bg-white font-extrabold text-slate-900 focus:outline-none focus:border-teal-600 text-xs"
                    />
                  )}
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Claim Amount (INR)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 1850"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white font-extrabold text-slate-900 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Date & Bill Upload */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Visit Date</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white font-medium focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Attach Receipt / Voucher</label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="w-full h-10 border border-slate-200 rounded-xl px-2.5 bg-white text-xs font-medium text-slate-600 focus:outline-none file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-extrabold file:bg-teal-50 file:text-teal-700"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Expense Remarks / Details for Manager</label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Travel & toll charges for client product demo & contract signing meeting..."
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-3 bg-white font-medium focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Send size={16} /> Submit Expense Request to Sales Manager
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}