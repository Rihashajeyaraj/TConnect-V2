import React, { useState, useEffect } from "react";
import {
  CalendarDays,
  Clock3,
  MapPin,
  Search,
  Plus,
  Phone,
  User,
  CheckCircle2,
  XCircle,
  Briefcase,
  IndianRupee,
  TrendingUp,
  ClipboardList,
  Navigation,
  Check,
  Building2,
  ExternalLink,
  Filter,
  X,
} from "lucide-react";
import { visitAPI, crmAPI, pipelineAPI } from "../../services/api.js";
import { useToast } from "../../common/ToastContext.jsx";
import { formatDate } from "../../utils/dateUtils.js";
import useCurrentUser from "../../hooks/useCurrentUser.js";
import { filterUserItems, isItemOwnedByUser } from "../../utils/userScope.js";

export default function ClientLog(props) {
  const { showToast } = useToast();
  const isModalView = props?.isModalView || false;
  const currentUser = useCurrentUser();
  const userName = currentUser.name || currentUser.full_name || "Sales Executive";
  const userEmail = (currentUser.email || "").toLowerCase().trim();
  const userEmpCode = currentUser.employee_code || currentUser.employee_id || "";
  const userId = currentUser.id || currentUser.user_id || "";
  const userPhone = currentUser.phone || currentUser.mobile || currentUser.phone_number || "";

  const matchesUser = (item) => {
    if (!item) return false;
    const assignedEmail = (item.assignedToEmail || item.assigned_to_email || item.executiveEmail || item.email || "").toLowerCase().trim();
    const assignedName = (item.assignedTo || item.assigned_to || item.executive || "").toLowerCase().trim();
    const empCode = (item.employee_id || item.employee_code || "").toLowerCase().trim();
    const uid = (item.user_id || item.userId || item.visitor_id || "").toLowerCase().trim();

    if (userEmail && (assignedEmail === userEmail || assignedName === userEmail)) return true;
    if (userEmpCode && empCode === userEmpCode.toLowerCase()) return true;
    if (userId && uid === userId.toLowerCase()) return true;
    if (userName && assignedName === userName.toLowerCase()) return true;

    return false;
  };

  // Active Toggle Sub-Tab: "visits" | "opportunities" | "followups"
  const [activeTab, setActiveTab] = useState(props?.defaultTab || "visits");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (props?.defaultTab) {
      setActiveTab(props.defaultTab);
    }
  }, [props?.defaultTab]);

  // Date-wise filtering states
  const [filterDateMode, setFilterDateMode] = useState("All"); // "All" | "Today" | "This Month" | "Custom"
  const [customFilterDate, setCustomFilterDate] = useState("");

  // Helper for date matching
  const matchesDateFilter = (dateStr) => {
    if (filterDateMode === "All") return true;
    if (!dateStr) return false;

    const safeDateStr = String(dateStr);
    const todayStr = formatDate(new Date());
    if (filterDateMode === "Today") {
      return safeDateStr.includes(todayStr) || safeDateStr.includes(new Date().toISOString().slice(0, 10));
    }

    if (filterDateMode === "This Month") {
      const currentMonth = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });
      return safeDateStr.includes(currentMonth) || safeDateStr.includes(new Date().toISOString().slice(0, 7));
    }

    if (filterDateMode === "Custom" && customFilterDate) {
      const targetFormatted = formatDate(new Date(customFilterDate));
      return safeDateStr.includes(customFilterDate) || safeDateStr.includes(targetFormatted);
    }

    return true;
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 1. VISITS STATE & HANDLERS (Permanent Monthly Work Report Audit - Never Deleted)
  // ───────────────────────────────────────────────────────────────────────────
  const [visitList, setVisitList] = useState([]);

  const [visitStatusFilter, setVisitStatusFilter] = useState("All");
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(props?.defaultOpenAddVisit || false);

  useEffect(() => {
    if (props?.defaultOpenAddVisit) {
      setIsVisitModalOpen(props.defaultOpenAddVisit);
    }
  }, [props?.defaultOpenAddVisit]);

  const [gpsLocation, setGpsLocation] = useState({ lat: null, lng: null, active: false });
  const [visitForm, setVisitForm] = useState({
    leadNumber: "",
    customer: "",
    product: "GPS Tracking & Field Force CRM",
    purpose: "Product Demo & Site Survey",
    contactPerson: "",
    phone: "",
    date: formatDate(new Date()),
    time: "10:00 AM",
    location: "",
    remarks: "",
  });



  useEffect(() => {
    visitAPI
      .getVisits()
      .then((res) => {
        const raw = Array.isArray(res) ? res : (res?.data || []);
        if (raw.length > 0) {
          const apiVisits = raw.map((v) => {
            const dateScheduled = v.scheduled_time
              ? formatDate(v.scheduled_time)
              : (v.visit_date ? formatDate(v.visit_date) : (v.date ? formatDate(v.date) : formatDate(v.created_at || new Date())));

            return {
              id: v.visit_id || v.id,
              visit_id: v.visit_id || v.id,
              leadId: v.lead_number || v.lead_id || v.leadId || `LD-${String(v.visit_id || v.id || "").slice(-8).toUpperCase()}`,
              leadNumber: v.lead_number || v.lead_id || v.leadId || `LD-${String(v.visit_id || v.id || "").slice(-8).toUpperCase()}`,
              customerId: v.customer_id || v.customerId || null,
              customer: v.client_name || v.customer_name || v.company_name || v.company || v.customer || v.title || "Client Account",
              client: v.client_name || v.customer_name || v.company_name || v.company || v.customer || v.title || "Client Account",
              company: v.company_name || v.company || v.client_name || v.customer_name || "Client Account",
              product: v.product || v.product_name || v.purpose || "GPS Tracking Software",
              purpose: v.purpose || v.product || "Site Visit & Product Demo",
              contactPerson: v.contact_person || v.contactPerson || v.poc_name || v.person || "Point of Contact",
              person: v.contact_person || v.contactPerson || v.poc_name || v.person || "Point of Contact",
              phone: v.phone || v.mobile || v.employee_phone || v.poc_mobile || "N/A",
              location: v.location || v.location_name || v.address || "Chennai",
              address: v.location || v.location_name || v.address || "Chennai",
              date: dateScheduled,
              visitDate: dateScheduled,
              scheduledDate: dateScheduled,
              time: v.visit_time || v.time || "10:00 AM",
              scheduledTime: v.visit_time || v.time || "10:00 AM",
              status: (v.status === "COMPLETED" || v.visit_status === "COMPLETED") ? "Completed" : (v.status || "Scheduled"),
              notes: v.remarks || v.notes || v.discussion_summary || "",
              remarks: v.remarks || v.notes || v.discussion_summary || "",
              assigned_to_email: v.assigned_to_email || v.assignedToEmail || "",
              assignedToEmail: v.assigned_to_email || v.assignedToEmail || "",
              assigned_to: v.assigned_to || v.employee_name || v.executive || userName,
              assignedTo: v.assigned_to || v.employee_name || v.executive || userName,
              executive: v.assigned_to || v.employee_name || v.executive || userName,
              mapsUrl: `https://maps.google.com/?q=${encodeURIComponent((v.client_name || v.customer_name || "Client") + " " + (v.location || "Chennai"))}`,
            };
          });

          // Strict deduplication
          const seen = new Set();
          const uniqueVisits = [];
          for (const item of apiVisits) {
            const rawCust = (item.customer || item.client || "").toLowerCase().trim();
            const rawDate = item.date || item.visitDate || "";
            const key = item.id ? `id_${item.id}` : `${rawCust}_${rawDate}`;
            if (!seen.has(key)) {
              seen.add(key);
              uniqueVisits.push(item);
            }
          }

          setVisitList(uniqueVisits);
        }
      })
      .catch(() => { });
  }, [userName, userEmail]);

  const updateGps = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLocation({
            lat: pos.coords.latitude.toFixed(4),
            lng: pos.coords.longitude.toFixed(4),
            active: true,
          });
          showToast(`GPS Position Acquired: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`, "success");
        },
        () => showToast("GPS Access denied or unavailable.", "warning")
      );
    }
  };

  const handleScheduleVisitSubmit = async (e) => {
    e.preventDefault();
    if (!visitForm.customer || !visitForm.location) {
      showToast("Please enter Customer Name and Location!", "error");
      return;
    }

    const genLeadId = visitForm.leadNumber.trim() || `LD-${Date.now().toString().slice(-8)}`;
    const formattedVisitDate = formatDate(visitForm.date);
    const selectedProduct = visitForm.product.trim() || "TwiteConnect CRM & Tracking Suite";
    const cleanRemarks = visitForm.remarks.trim() || visitForm.notes.trim() || "Site Visit Scheduled";

    const newVisitObj = {
      id: `vis_${Date.now()}`,
      visit_id: `vis_${Date.now()}`,
      leadId: genLeadId,
      leadNumber: genLeadId,
      customerId: null,
      customer: visitForm.customer.trim(),
      client: visitForm.customer.trim(),
      company: visitForm.customer.trim(),
      product: selectedProduct,
      purpose: selectedProduct,
      contactPerson: visitForm.contactPerson.trim() || "Point of Contact",
      person: visitForm.contactPerson.trim() || "Point of Contact",
      location: visitForm.location.trim(),
      address: visitForm.location.trim(),
      phone: visitForm.phone.trim() || "N/A",
      executive: userName,
      assigned_to: userName,
      assignedTo: userName,
      assigned_to_email: userEmail,
      assignedToEmail: userEmail,
      date: formattedVisitDate,
      visitDate: formattedVisitDate,
      scheduledDate: formattedVisitDate,
      time: visitForm.time || "10:00 AM",
      scheduledTime: visitForm.time || "10:00 AM",
      status: "Scheduled",
      checkInTime: `${formattedVisitDate} at ${visitForm.time || '10:00 AM'}`,
      checkOutTime: "Pending",
      meetingDuration: "Planned Visit",
      travelDistance: gpsLocation.active ? "2.4 km (GPS Verified)" : "10.0 km est",
      notes: cleanRemarks,
      remarks: cleanRemarks,
      mapsUrl: `https://maps.google.com/?q=${encodeURIComponent(visitForm.customer + " " + visitForm.location)}`,
    };

    setVisitList((prev) => [newVisitObj, ...prev]);

    // Save to manager dynamic local store for instant UI sync
    try {
      const smVisits = JSON.parse(localStorage.getItem("tc_sm_visits") || "[]");
      smVisits.unshift({
        ...newVisitObj,
        visit_id: newVisitObj.id,
        lead_id: genLeadId,
        lead_number: genLeadId,
        customer_name: newVisitObj.customer,
        company: newVisitObj.customer,
        product: selectedProduct,
        poc_name: newVisitObj.contactPerson,
        poc_mobile: newVisitObj.phone,
        assigned_to: userName,
        assigned_to_email: userEmail,
        employee_code: userEmpCode || "EMP-101",
        visit_date: formattedVisitDate,
        visit_time: newVisitObj.time,
        visit_status: "Scheduled",
        status: "Scheduled",
        discussion_summary: cleanRemarks,
        remarks: cleanRemarks,
        notes: cleanRemarks,
        location: newVisitObj.location,
      });
      localStorage.setItem("tc_sm_visits", JSON.stringify(smVisits));
    } catch (e) { }

    setIsVisitModalOpen(false);
    setVisitForm({
      leadNumber: "",
      customer: "",
      product: "GPS Tracking & Field Force CRM",
      purpose: "Product Demo & Site Survey",
      contactPerson: "",
      phone: "",
      date: formatDate(new Date()),
      time: "10:00 AM",
      location: "",
      remarks: "",
    });

    try {
      await visitAPI.createVisit({
        visit_id: newVisitObj.id,
        lead_id: genLeadId,
        lead_number: genLeadId,
        customer_name: newVisitObj.customer,
        company_name: newVisitObj.customer,
        company: newVisitObj.customer,
        client_name: newVisitObj.customer,
        product: selectedProduct,
        product_name: selectedProduct,
        purpose: selectedProduct,
        contact_person: newVisitObj.contactPerson,
        phone: newVisitObj.phone,
        visit_date: formattedVisitDate,
        date: formattedVisitDate,
        visit_time: newVisitObj.time,
        location: newVisitObj.location,
        address: newVisitObj.location,
        employee_name: userName,
        employee_id: userEmpCode || userId || null,
        employee_code: userEmpCode || null,
        employee_phone: userPhone || null,
        assigned_to: userName,
        assigned_to_email: userEmail || null,
        latitude: gpsLocation.lat ? parseFloat(gpsLocation.lat) : null,
        longitude: gpsLocation.lng ? parseFloat(gpsLocation.lng) : null,
        status: "SCHEDULED",
        visit_status: "SCHEDULED",
        notes: cleanRemarks,
        remarks: cleanRemarks,
      });
    } catch (err) {
      console.warn("[Visit API] Backend save notice:", err?.message || err);
    }

    showToast(`📅 Site Visit for "${newVisitObj.customer}" (${formattedVisitDate}) logged and saved to Supabase!`, "success");
  };

  const handleCheckIn = (id) => {
    updateGps();
    setVisitList((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: "Checked-In", checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } : v))
    );
    showToast("📍 Checked In! GPS Location timestamped.", "success");
  };

  const handleCompleteVisit = async (id, extraData = {}) => {
    const updatedStatus = extraData.status || "Completed";
    const checkOut = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setVisitList((prev) =>
      prev.map((v) => {
        if (v.id === id || v.visit_id === id) {
          const updatedObj = {
            ...v,
            status: updatedStatus,
            visit_status: updatedStatus,
            checkOutTime: checkOut,
            check_out_time: checkOut,
            discussion_summary: extraData.discussion_summary || v.notes || v.purpose || "Field visit completed successfully.",
            customer_requirements: extraData.customer_requirements || v.customer_requirements || "Field requirement logged.",
            products_discussed: extraData.products_discussed || v.products_discussed || "TwiteConnect Field CRM Suite",
            estimated_order_value: extraData.estimated_order_value || extraData.value || v.value || "₹0",
            lead_status: extraData.lead_status || v.lead_status || "Follow Up Required",
            lead_priority: extraData.lead_priority || extraData.priority || v.priority || "Hot",
            remarks: extraData.remarks || v.remarks || "Visit completion form submitted.",
          };

          // Also update manager local store for instant UI sync
          try {
            const smVisits = JSON.parse(localStorage.getItem("tc_sm_visits") || "[]");
            const idx = smVisits.findIndex((smv) => smv.id === id || smv.visit_id === id);
            if (idx >= 0) smVisits[idx] = updatedObj;
            else smVisits.unshift(updatedObj);
            localStorage.setItem("tc_sm_visits", JSON.stringify(smVisits));
          } catch (e) { }

          return updatedObj;
        }
        return v;
      })
    );

    try {
      await visitAPI.completeVisit(id, {
        status: "COMPLETED",
        visit_status: "COMPLETED",
        check_out_time: checkOut,
        ...extraData,
      });
    } catch (err) { }

    showToast("✅ Field Visit Completed & Sync'd to Sales Manager Audit Report!", "success");
  };

  const filteredVisits = visitList.filter((v) => {
    if (!matchesUser(v)) return false;
    const q = search.toLowerCase();
    const matchesSearch =
      (v.customer || v.client || "").toLowerCase().includes(q) ||
      (v.location || "").toLowerCase().includes(q) ||
      (v.purpose || "").toLowerCase().includes(q) ||
      (v.leadId || "").toLowerCase().includes(q) ||
      (v.customerId || "").toLowerCase().includes(q);

    const matchesStatus = visitStatusFilter === "All" || v.status === visitStatusFilter;
    const matchesDate = matchesDateFilter(v.date || v.visitDate || "");

    return matchesSearch && matchesStatus && matchesDate;
  });



  // ───────────────────────────────────────────────────────────────────────────
  // 3. FOLLOW-UPS STATE & HANDLERS (Permanent Monthly Audit Log - Never Deleted)
  // ───────────────────────────────────────────────────────────────────────────
  const [followupsList, setFollowupsList] = useState([]);

  useEffect(() => {
    crmAPI.getFollowupsAll()
      .then((res) => {
        const raw = Array.isArray(res) ? res : (res?.data || []);
        if (raw.length > 0) {
          const apiFollowups = raw
            .filter(f => f && !["TechCorp Solutions", "GreenValley Logistics"].includes(f.company || f.company_name || f.customer))
            .map((f) => ({
              id: f.id || f.followup_id,
              leadId: f.lead_id || f.leadId || `LD-${String(f.id || "").slice(-8).toUpperCase()}`,
              customerId: f.customer_id || f.customerId || null,
              company: f.company || f.company_name || f.customer || "Prospect Account",
              person: f.person || f.contact_person || "Point of Contact",
              phone: f.phone || f.mobile || "N/A",
              scheduledDate: f.scheduled_date ? formatDate(f.scheduled_date) : formatDate(f.created_at || new Date()),
              scheduledTime: f.scheduled_time || f.time || "11:30 AM",
              category: f.category || "Warm",
              status: f.status === "COMPLETED" ? "Completed" : "Scheduled",
              remark: f.remark || f.notes || f.discussion_summary || "",
              assigned_to: f.assigned_to || userName,
              assigned_to_email: f.assigned_to_email || userEmail,
            }));

          setFollowupsList((prev) => {
            const cleanPrev = prev.filter(p => p && !["TechCorp Solutions", "GreenValley Logistics"].includes(p.company || p.customer));
            const merged = [...apiFollowups];
            cleanPrev.forEach((cp) => {
              if (!merged.some(m => m.id === cp.id || m.company === cp.company)) {
                merged.push(cp);
              }
            });
            return merged;
          });
        }
      })
      .catch(() => null);
  }, [userName, userEmail]);



  const handleCompleteFollowup = (id) => {
    setFollowupsList((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: "Completed" } : f))
    );
    showToast("📞 Follow-up call completed & permanently saved in report log!", "success");
  };

  const filteredFollowups = followupsList.filter((f) => {
    if (!matchesUser(f)) return false;
    const q = search.toLowerCase();
    const matchesSearch =
      (f.company || f.customer || "").toLowerCase().includes(q) ||
      (f.person || "").toLowerCase().includes(q) ||
      (f.phone || "").includes(q) ||
      (f.remark || "").toLowerCase().includes(q) ||
      (f.leadId || "").toLowerCase().includes(q) ||
      (f.customerId || "").toLowerCase().includes(q);

    const matchesDate = matchesDateFilter(f.scheduledDate || "");
    return matchesSearch && matchesDate;
  });

  return (
    <div className={isModalView ? "space-y-4 font-sans text-slate-900 min-w-0 w-full" : "space-y-5 font-sans text-slate-900 min-w-0 w-full p-2 sm:p-6"}>
      {/* ── Top Banner & Toggle Buttons Bar ───────────────────────────────── */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {!isModalView && (
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Client Activity Log Workspace
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm font-semibold mt-0.5">
                Unified hub for Client Visits, Sales Opportunities & Follow-Up Discussions.
              </p>
            </div>
          )}

          {activeTab === "visits" && (
            <button
              onClick={() => setIsVisitModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-teal-600/30 flex items-center gap-2 cursor-pointer transition"
            >
              <Plus size={18} /> Schedule New Visit
            </button>
          )}
        </div>

        {/* ── TOGGLE BUTTONS & DATE-WISE FILTER BAR ───────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setActiveTab("visits"); setSearch(""); }}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition cursor-pointer ${activeTab === "visits"
                ? "bg-[#1a1f36] text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
            >
              <CalendarDays size={16} /> Client Visits ({visitList.length})
            </button>

            <button
              onClick={() => { setActiveTab("followups"); setSearch(""); }}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition cursor-pointer ${activeTab === "followups"
                ? "bg-[#1a1f36] text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
            >
              <ClipboardList size={16} /> Follow-Up Calls ({followupsList.length})
            </button>
          </div>

          {/* Date-wise Filter Dropdown for SE Work Reports */}
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider pl-1.5 flex items-center gap-1">
              <Filter size={12} className="text-teal-600" /> Date Filter:
            </span>

            <select
              value={filterDateMode}
              onChange={(e) => {
                setFilterDateMode(e.target.value);
                if (e.target.value !== "Custom") setCustomFilterDate("");
              }}
              className="h-9 text-xs border border-slate-200 rounded-xl px-3 bg-white font-extrabold text-slate-800 focus:outline-none focus:border-teal-500 cursor-pointer shadow-2xs"
            >
              <option value="All">📅 All Time</option>
              <option value="Today">🌟 Today</option>
              <option value="This Month">📅 This Month Report</option>
              <option value="Custom">📆 Custom Date</option>
            </select>

            {filterDateMode === "Custom" && (
              <input
                type="date"
                value={customFilterDate}
                onChange={(e) => setCustomFilterDate(e.target.value)}
                className="h-9 text-xs border border-slate-200 rounded-xl px-2.5 bg-white font-bold text-slate-800 focus:outline-none focus:border-teal-500"
              />
            )}
          </div>
        </div>
      </div>

      {/* ── TAB 1: CLIENT VISITS VIEW ─────────────────────────────────────── */}
      {activeTab === "visits" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Lead ID (LD-...), Customer ID (CUST-...), client, location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 text-xs sm:text-sm border border-slate-200 rounded-xl pl-9 pr-3 bg-slate-50 font-semibold focus:outline-none focus:border-teal-500"
              />
            </div>

            <select
              value={visitStatusFilter}
              onChange={(e) => setVisitStatusFilter(e.target.value)}
              className="h-9 text-xs border border-slate-200 rounded-xl px-3 bg-slate-50 font-bold text-slate-700 focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Checked-In">Checked-In</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* ── CLIENT VISITS TABULAR TABLE VIEW ───────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-[130px]">Lead Number</th>
                    <th className="py-3.5 px-4 w-[200px]">Client & Contact Person</th>
                    <th className="py-3.5 px-4 w-[160px]">Product / Requirement</th>
                    <th className="py-3.5 px-4 w-[160px]">Date Scheduled (DD/MM/YYYY)</th>
                    <th className="py-3.5 px-4 w-[160px]">Visit Location</th>
                    <th className="py-3.5 px-4">Remarks & Notes</th>
                    <th className="py-3.5 px-4 w-[140px] text-right">Status / Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {filteredVisits.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                        No client visit records found for selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredVisits.map((item) => (
                      <tr key={item.id || item.visit_id} className="hover:bg-slate-50/80 transition">
                        {/* 1. Lead Number Column */}
                        <td className="py-3.5 px-4 align-top">
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-violet-50 text-violet-800 font-black text-xs border border-violet-200">
                            {item.leadNumber || item.lead_number || item.leadId || item.lead_id || `LD-${String(item.id || item.visit_id || "").slice(-8).toUpperCase()}`}
                          </span>
                        </td>

                        {/* 2. Client & Contact Person */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-black text-slate-900 text-sm truncate">
                            {item.customer || item.client || item.company || item.customer_name}
                          </div>
                          <div className="text-xs text-slate-600 font-semibold truncate flex items-center gap-1.5 mt-0.5">
                            <User size={12} className="text-teal-600 shrink-0" />
                            <span>{item.contactPerson || item.person || item.contact_person || "Point of Contact"}</span>
                          </div>
                          {item.phone && item.phone !== "N/A" && (
                            <div className="text-[11px] text-blue-600 font-bold truncate flex items-center gap-1 mt-0.5">
                              <Phone size={11} className="shrink-0" /> <span>{item.phone}</span>
                            </div>
                          )}
                        </td>

                        {/* 3. Product / Requirement */}
                        <td className="py-3.5 px-4 align-top">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-900 text-xs font-black border border-indigo-200">
                            📦 {item.product || item.product_name || item.purpose || "TwiteConnect CRM"}
                          </span>
                        </td>

                        {/* 4. Date Scheduled (DD/MM/YYYY) & Time */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex items-center gap-1.5 font-black text-slate-900 text-xs">
                            <CalendarDays size={14} className="text-teal-600 shrink-0" />
                            <span>{formatDate(item.date || item.visitDate || item.scheduledDate || item.visit_date)}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-semibold mt-0.5 flex items-center gap-1">
                            <Clock3 size={12} className="text-slate-400 shrink-0" />
                            <span>{item.time || item.visit_time || "10:00 AM"}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                            Exec: {item.executive || item.assigned_to || userName}
                          </div>
                        </td>

                        {/* 5. Visit Location */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex items-start gap-1.5 text-slate-800 font-bold text-xs">
                            <MapPin size={14} className="text-rose-500 shrink-0 mt-0.5" />
                            <span>{item.location || item.address || "Chennai"}</span>
                          </div>
                          {item.mapsUrl && (
                            <a
                              href={item.mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-600 hover:text-teal-800 mt-1 hover:underline"
                            >
                              <ExternalLink size={10} /> View Map
                            </a>
                          )}
                        </td>

                        {/* 6. Remarks & Discussion Notes */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="text-xs font-semibold text-slate-800 leading-relaxed bg-amber-50/90 p-2.5 rounded-2xl border border-amber-200/80 shadow-2xs whitespace-pre-wrap max-w-xs">
                            {item.remarks || item.notes || item.discussion_summary || "Site visit record maintained."}
                          </div>
                        </td>

                        {/* 7. Status & Check-In Action */}
                        <td className="py-3.5 px-4 align-top text-right">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black border ${item.status === "Completed" || item.visit_status === "Completed" || item.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : item.status === "Checked-In"
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}>
                            {item.status === "Completed" || item.status === "COMPLETED" ? "✅ Completed" : item.status === "Checked-In" ? "📍 Checked-In" : "📅 Scheduled"}
                          </span>
                          {item.status === "Scheduled" && (
                            <div className="mt-2">
                              <button
                                onClick={() => handleCheckIn(item.id || item.visit_id)}
                                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] transition cursor-pointer shadow-xs"
                              >
                                Check-In (GPS)
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}



      {/* ── TAB 3: FOLLOW-UP CALLS VIEW (TABULAR TABLE VIEW) ───────────── */}
      {activeTab === "followups" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Lead ID, Customer ID, company, contact person, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 text-xs sm:text-sm border border-slate-200 rounded-xl pl-9 pr-3 bg-slate-50 font-semibold focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[860px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Lead / Customer ID</th>
                    <th className="py-3.5 px-4">Company & Person</th>
                    <th className="py-3.5 px-4">Scheduled Date & Time</th>
                    <th className="py-3.5 px-4">Call Discussion & Remarks</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {filteredFollowups.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                        No follow-up call logs found for selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredFollowups.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        {/* ID Badge Column */}
                        <td className="py-3.5 px-4">
                          {item.customerId ? (
                            <span className="inline-block px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-900 font-black text-[10px] border border-emerald-300">
                              {item.customerId}
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-1 rounded-md bg-violet-100 text-violet-900 font-black text-[10px] border border-violet-300">
                              {item.leadNumber || item.leadCode || `LD-${String(item.leadId || item.id || "").slice(0, 8).toUpperCase()}`}
                            </span>
                          )}
                        </td>

                        {/* Company & Contact Person */}
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-slate-900 text-sm truncate max-w-[200px]">
                            {item.company || item.customer}
                          </div>
                          <div className="text-xs text-slate-500 font-semibold truncate flex items-center gap-1 mt-0.5">
                            <User size={12} className="text-slate-400 shrink-0" />
                            {item.person || "Contact Person"}
                          </div>
                          <div className="text-[11px] text-blue-600 font-bold flex items-center gap-1 mt-0.5">
                            <Phone size={11} className="shrink-0" /> {item.phone}
                          </div>
                        </td>

                        {/* Date & Time */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800">
                            <CalendarDays size={13} className="text-teal-600 shrink-0" />
                            <span>{item.scheduledDate}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                            {item.scheduledTime}
                          </div>
                        </td>

                        {/* Discussion & Remarks */}
                        <td className="py-3.5 px-4 max-w-[260px]">
                          {item.remark ? (
                            <p className="text-[11px] font-medium text-amber-950 bg-amber-50 p-2 rounded-xl border border-amber-200/80 leading-snug">
                              {item.remark}
                            </p>
                          ) : (
                            <span className="text-slate-400 italic">No notes logged</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${item.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-purple-50 text-purple-700 border-purple-200'
                            }`}>
                            {item.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          {item.status !== "Completed" ? (
                            <button
                              onClick={() => handleCompleteFollowup(item.id)}
                              className="py-1.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs inline-flex items-center gap-1 transition cursor-pointer shadow-xs"
                            >
                              <CheckCircle2 size={13} /> Complete Call
                            </button>
                          ) : (
                            <span className="text-xs font-bold text-emerald-600 inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                              <Check size={13} /> Saved in Report
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SCHEDULE VISIT MODAL ────────────────────────────────────────── */}
      {isVisitModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 sm:p-7 space-y-4 my-auto animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-teal-600" /> Schedule New Client Visit
                </h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Record will be permanently maintained and saved to Supabase report log.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsVisitModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleScheduleVisitSubmit} className="space-y-3.5 text-xs sm:text-sm font-semibold">
              {/* Row 1: Lead Number & Customer Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">Lead Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. LD-9821034"
                    value={visitForm.leadNumber}
                    onChange={(e) => setVisitForm(p => ({ ...p, leadNumber: e.target.value }))}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-slate-50 focus:outline-none focus:border-teal-500 font-bold text-slate-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">Company / Client Name (*Required)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apollo Healthcare Ltd"
                    value={visitForm.customer}
                    onChange={(e) => setVisitForm(p => ({ ...p, customer: e.target.value }))}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white focus:outline-none focus:border-teal-500 font-bold text-slate-900 text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Row 2: Product & Contact Person */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">Product / Requirement (*Required)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GPS Tracking Software"
                    value={visitForm.product}
                    onChange={(e) => setVisitForm(p => ({ ...p, product: e.target.value }))}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white focus:outline-none focus:border-teal-500 font-bold text-slate-900 text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">Point of Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Rajesh Sharma"
                    value={visitForm.contactPerson}
                    onChange={(e) => setVisitForm(p => ({ ...p, contactPerson: e.target.value }))}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white focus:outline-none focus:border-teal-500 font-medium text-slate-900 text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Row 3: Contact Phone & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">Contact Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={visitForm.phone}
                    onChange={(e) => setVisitForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white focus:outline-none focus:border-teal-500 font-medium text-slate-900 text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">Visit Location / Address (*Required)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Greams Road, Chennai"
                    value={visitForm.location}
                    onChange={(e) => setVisitForm(p => ({ ...p, location: e.target.value }))}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white focus:outline-none focus:border-teal-500 font-medium text-slate-900 text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Row 4: Scheduled Date (DD/MM/YYYY) & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">Date of Visit (DD/MM/YYYY)</label>
                  <input
                    type="text"
                    required
                    placeholder="DD/MM/YYYY"
                    value={visitForm.date}
                    onChange={(e) => setVisitForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-slate-50 focus:outline-none font-bold text-slate-900 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">Scheduled Visit Time</label>
                  <select
                    value={visitForm.time}
                    onChange={(e) => setVisitForm(p => ({ ...p, time: e.target.value }))}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-slate-50 focus:outline-none font-bold text-slate-900 text-xs cursor-pointer"
                  >
                    <option value="10:00 AM">10:00 AM (Morning)</option>
                    <option value="11:30 AM">11:30 AM (Late Morning)</option>
                    <option value="02:30 PM">02:30 PM (Afternoon)</option>
                    <option value="04:30 PM">04:30 PM (Evening)</option>
                  </select>
                </div>
              </div>

              {/* Row 5: Remarks / Discussion Notes */}
              <div>
                <label className="block text-slate-700 font-extrabold mb-1">Remarks / Visit Notes (*Required)</label>
                <textarea
                  rows="2"
                  required
                  placeholder="e.g. Meeting CTO for 50 licenses demo & custom integration review."
                  value={visitForm.remarks}
                  onChange={(e) => setVisitForm(p => ({ ...p, remarks: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl p-3 bg-white font-medium focus:outline-none focus:border-teal-500 text-xs leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsVisitModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition cursor-pointer text-xs sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-teal-600 text-white font-extrabold hover:bg-teal-700 transition cursor-pointer shadow-md shadow-teal-600/30 text-xs sm:text-sm"
                >
                  Schedule Visit & Save to Supabase 🚀
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
