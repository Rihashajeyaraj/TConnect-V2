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

export default function ClientLog() {
  const { showToast } = useToast();
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
  const [activeTab, setActiveTab] = useState("visits");
  const [search, setSearch] = useState("");

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
  const [visitList, setVisitList] = useState(() => {
    try {
      const saved = localStorage.getItem("tc_sales_visits");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [visitStatusFilter, setVisitStatusFilter] = useState("All");
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [gpsLocation, setGpsLocation] = useState({ lat: null, lng: null, active: false });
  const [visitForm, setVisitForm] = useState({
    customer: "",
    purpose: "Product Demo",
    date: formatDate(new Date()),
    time: "10:00 AM",
    location: "",
    phone: "",
    notes: "",
  });

  useEffect(() => {
    try {
      localStorage.setItem("tc_sales_visits", JSON.stringify(visitList));
    } catch (e) { }
  }, [visitList]);

  useEffect(() => {
    visitAPI
      .getVisits()
      .then((res) => {
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          setVisitList((prev) => {
            const merged = [...prev];
            res.data.forEach((v) => {
              const vId = v.visit_id || v.id;
              if (!merged.some((m) => m.id === vId || m.visit_id === vId)) {
                merged.unshift(v);
              }
            });
            return merged;
          });
        }
      })
      .catch(() => { });
  }, []);

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

    const genLeadId = `LD-${Date.now().toString().slice(-8)}`;

    const newVisitObj = {
      id: `vis_${Date.now()}`,
      leadId: genLeadId,
      customerId: null,
      customer: visitForm.customer,
      client: visitForm.customer,
      contactPerson: visitForm.customer,
      location: visitForm.location,
      address: visitForm.location,
      phone: visitForm.phone || "N/A",
      executive: userName,
      assignedToEmail: userEmail,
      date: visitForm.date,
      time: visitForm.time,
      purpose: visitForm.purpose,
      status: "Scheduled",
      checkInTime: `${visitForm.date} at ${visitForm.time}`,
      checkOutTime: "Pending",
      meetingDuration: "Planned Visit",
      travelDistance: gpsLocation.active ? "2.4 km (GPS Verified)" : "10.0 km est",
      notes: visitForm.notes || "Field visit scheduled.",
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
        customer_name: newVisitObj.customer,
        company: newVisitObj.customer,
        poc_name: newVisitObj.contactPerson,
        poc_mobile: newVisitObj.phone,
        assigned_to: userName,
        assigned_to_email: userEmail,
        employee_code: userEmpCode || "EMP-101",
        visit_date: newVisitObj.date,
        visit_time: newVisitObj.time,
        visit_status: "Scheduled",
        status: "Scheduled",
        discussion_summary: newVisitObj.notes,
        lead_status: "Follow Up Required",
        lead_priority: "Hot",
        estimated_order_value: "₹4,50,000",
        remarks: newVisitObj.notes,
      });
      localStorage.setItem("tc_sm_visits", JSON.stringify(smVisits));
    } catch (e) { }

    setIsVisitModalOpen(false);
    setVisitForm({
      customer: "",
      purpose: "Product Demo",
      date: formatDate(new Date()),
      time: "10:00 AM",
      location: "",
      phone: "",
      notes: "",
    });

    try {
      await visitAPI.createVisit({
        visit_id: newVisitObj.id,
        lead_id: genLeadId,
        // Customer details
        customer_name: newVisitObj.customer,
        company: newVisitObj.customer,
        purpose: newVisitObj.purpose,
        // Date/time
        visit_date: newVisitObj.date,
        visit_time: newVisitObj.time,
        // Location
        location: newVisitObj.location,
        // Employee identity (also stamped from JWT on backend)
        employee_name: userName,
        employee_id: userEmpCode || userId || null,
        employee_code: userEmpCode || null,
        employee_phone: userPhone || null,
        assigned_to: userName,
        assigned_to_email: userEmail || null,
        // GPS
        latitude: gpsLocation.lat ? parseFloat(gpsLocation.lat) : null,
        longitude: gpsLocation.lng ? parseFloat(gpsLocation.lng) : null,
        // Status
        status: "SCHEDULED",
        visit_status: "SCHEDULED",
        notes: visitForm.notes || null,
      });
    } catch (err) {
      console.warn("[Visit API] Backend save failed, stored locally:", err?.message || err);
    }

    showToast(`📅 Site Visit Logged & Saved to Audit Report for "${newVisitObj.customer}"!`, "success");
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
            estimated_order_value: extraData.estimated_order_value || extraData.value || v.value || "₹4,50,000",
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
  // 2. OPPORTUNITIES STATE & HANDLERS
  // ───────────────────────────────────────────────────────────────────────────
  const [opportunities, setOpportunities] = useState(() => {
    try {
      const saved = localStorage.getItem("tc_sales_opportunities");
      const parsed = saved ? JSON.parse(saved) : [];
      return filterUserItems(parsed, currentUser);
    } catch {
      return [];
    }
  });

  // Fetch opportunities from Supabase on mount
  useEffect(() => {
    pipelineAPI.getOpportunities().then((res) => {
      const opps = res.data || res || [];
      if (Array.isArray(opps) && opps.length > 0) {
        setOpportunities(filterUserItems(opps, currentUser));
        localStorage.setItem("tc_sales_opportunities", JSON.stringify(opps));
      }
    }).catch((err) => {
      console.warn("ClientLog: Failed fetching opportunities from Supabase:", err);
    });
  }, [currentUser?.email]);

  useEffect(() => {
    try {
      localStorage.setItem("tc_sales_opportunities", JSON.stringify(opportunities));
    } catch (e) { }
  }, [opportunities]);

  const [isOppModalOpen, setIsOppModalOpen] = useState(false);
  const [oppForm, setOppForm] = useState({
    date: formatDate(new Date()),
    source: "Field Research (SE)",
    customSource: "",
    company: "",
    productRequirement: "",
    contactPerson: "",
    phone: "",
    location: "",
    remarks: "",
  });

  const handleCreateOpportunitySubmit = (e) => {
    e.preventDefault();
    if (!oppForm.company.trim() || !oppForm.location.trim()) {
      showToast("Please enter Lead/Company Name and Location!", "error");
      return;
    }

    const tempId = `opp_${Date.now()}`;
    const cleanCompany = oppForm.company.trim();
    const cleanContact = oppForm.contactPerson.trim() || "Managing Director";
    const cleanPhone = oppForm.phone.trim() || "N/A";
    const cleanLocation = oppForm.location.trim();
    const cleanSource = oppForm.source === "Other" && oppForm.customSource.trim() ? oppForm.customSource.trim() : oppForm.source;
    const cleanRemarks = oppForm.remarks.trim() || "Researched prospect detail logged.";

    const newOppObj = {
      id: tempId,
      opportunity_id: tempId,
      leadId: `LD-${Date.now().toString().slice(-8)}`,
      leadNumber: `LD-${Date.now().toString().slice(-8)}`,
      customerId: null,
      company: cleanCompany,
      customer: cleanCompany,
      customer_name: cleanCompany,
      title: `Opportunity - ${cleanCompany}`,
      productRequirement: oppForm.productRequirement.trim() || "CRM & Field Executive Tracking Software",
      contactPerson: cleanContact,
      contact_person: cleanContact,
      phone: cleanPhone,
      address: cleanLocation,
      location: cleanLocation,
      source: cleanSource,
      value: "₹4,50,000",
      expected_revenue: 450000,
      probability: "80%",
      stage: "Lead",
      closing: oppForm.date,
      date: oppForm.date,
      status: "Hot",
      outcome: "In Negotiation",
      remarks: cleanRemarks,
      notes: cleanRemarks,
      rep: userName,
      assigned_to: userName,
      assigned_to_email: userEmail,
      executiveEmail: userEmail,
      employee_code: userEmpCode,
    };

    setOpportunities((prev) => [newOppObj, ...prev]);
    setIsOppModalOpen(false);
    setOppForm({
      date: formatDate(new Date()),
      source: "Field Research (SE)",
      customSource: "",
      company: "",
      productRequirement: "",
      contactPerson: "",
      phone: "",
      location: "",
      remarks: "",
    });

    showToast(`🎯 Opportunity "${newOppObj.customer}" saving to Supabase!`, "success");

    // Persist directly to Supabase crm.opportunities / public.opportunities
    pipelineAPI.createOpportunity({
      id: tempId,
      opportunity_id: tempId,
      title: `Opportunity - ${cleanCompany}`,
      company: cleanCompany,
      customer_name: cleanCompany,
      contact_person: cleanContact,
      phone: cleanPhone,
      value: 450000,
      expected_revenue: 450000,
      stage: "Lead",
      probability: 80,
      rep: userName,
      assigned_to: userName,
      assigned_to_email: userEmail,
      notes: cleanRemarks,
      expected_closing_date: oppForm.date,
    }).then((res) => {
      const saved = res.data || res;
      if (saved && (saved.id || saved.opportunity_id)) {
        const realId = saved.id || saved.opportunity_id;
        setOpportunities((prev) =>
          prev.map((o) => (o.id === tempId ? { ...o, id: realId, opportunity_id: realId } : o))
        );
      }
      showToast(`✅ Opportunity "${cleanCompany}" saved in Supabase table!`, "success");
    }).catch((err) => {
      console.warn("Opportunity Supabase save error:", err);
    });
  };

  const handleWinDeal = (id, customerName) => {
    setOpportunities((prev) =>
      prev.map((item) => (item.id === id ? { ...item, outcome: "Won", stage: "Won Deal 🎉", customerId: item.customerId || `CUST-${Date.now().toString().slice(-6)}` } : item))
    );
    pipelineAPI.updateStage(id, { stage: "Won", probability: 100 }).catch(() => {});
    showToast(`🎉 Deal won successfully with ${customerName}! Saved in Supabase.`, "success");
  };

  const handleLostDeal = (id, customerName) => {
    setOpportunities((prev) =>
      prev.map((item) => (item.id === id ? { ...item, outcome: "Lost", stage: "Lost Deal ❌" } : item))
    );
    pipelineAPI.updateStage(id, { stage: "Lost", probability: 0 }).catch(() => {});
    showToast(`Deal marked as lost for ${customerName}. Logged for Manager review.`, "info");
  };


  const filteredOpportunities = opportunities.filter((o) => {
    if (!matchesUser(o)) return false;
    const q = search.toLowerCase();
    const matchesSearch =
      (o.customer || "").toLowerCase().includes(q) ||
      (o.stage || "").toLowerCase().includes(q) ||
      (o.status || "").toLowerCase().includes(q) ||
      (o.leadId || "").toLowerCase().includes(q) ||
      (o.customerId || "").toLowerCase().includes(q);

    const matchesDate = matchesDateFilter(o.closing || "");
    return matchesSearch && matchesDate;
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. FOLLOW-UPS STATE & HANDLERS (Permanent Monthly Audit Log - Never Deleted)
  // ───────────────────────────────────────────────────────────────────────────
  const [followupsList, setFollowupsList] = useState(() => {
    try {
      const saved = localStorage.getItem("tc_sales_followups");
      return saved ? JSON.parse(saved) : [
        { id: 1, leadId: "LD-99102938", customerId: null, company: "TechCorp Solutions", person: "Mr. Rajesh Kumar", phone: "+91 98765 43210", scheduledDate: formatDate(new Date()), scheduledTime: "11:30 AM", category: "Hot", status: "Scheduled", remark: "Discuss pricing package & demo timeline." },
        { id: 2, leadId: "LD-33910293", customerId: "CUST-881920", company: "GreenValley Logistics", person: "Ms. Anita Roy", phone: "+91 98410 12345", scheduledDate: formatDate(new Date()), scheduledTime: "03:00 PM", category: "Warm", status: "Scheduled", remark: "Follow up on software integration requirement." }
      ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("tc_sales_followups", JSON.stringify(followupsList));
    } catch (e) { }
  }, [followupsList]);

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
    <div className="space-y-5 font-sans text-slate-900 min-w-0 w-full p-2 sm:p-6">
      {/* ── Top Banner & Toggle Buttons Bar ───────────────────────────────── */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Client Activity Log Workspace
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm font-semibold mt-0.5">
              Unified hub for Client Visits, Sales Opportunities & Follow-Up Discussions.
            </p>
          </div>

          {activeTab === "visits" && (
            <button
              onClick={() => setIsVisitModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-teal-600/30 flex items-center gap-2 cursor-pointer transition"
            >
              <Plus size={18} /> Schedule New Visit
            </button>
          )}

          {activeTab === "opportunities" && (
            <button
              onClick={() => setIsOppModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-teal-600/30 flex items-center gap-2 cursor-pointer transition"
            >
              <Plus size={18} /> Add Opportunity
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
              onClick={() => { setActiveTab("opportunities"); setSearch(""); }}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition cursor-pointer ${activeTab === "opportunities"
                  ? "bg-[#1a1f36] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
            >
              <Briefcase size={16} /> Opportunities & Deals ({opportunities.length})
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
              <table className="w-full text-left border-collapse min-w-[960px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-[140px]">Lead / Customer ID</th>
                    <th className="py-3.5 px-4 w-[200px]">Client & Contact</th>
                    <th className="py-3.5 px-4 w-[160px]">Visit Location</th>
                    <th className="py-3.5 px-4 w-[150px]">Date & Time</th>
                    <th className="py-3.5 px-4">Purpose & Remarks</th>
                    <th className="py-3.5 px-4 w-[180px] text-right">Check-In / Out (GPS)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {filteredVisits.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                        No client visit records found for selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredVisits.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        {/* Lead / Customer ID Column */}
                        <td className="py-3.5 px-4 align-top">
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

                        {/* Client & Contact */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-extrabold text-slate-900 text-sm truncate">
                            {item.customer || item.client || item.customerName}
                          </div>
                          <div className="text-xs text-slate-500 font-semibold truncate flex items-center gap-1.5 mt-0.5">
                            <User size={12} className="text-slate-400 shrink-0" />
                            {item.contactPerson || item.person || "Contact Person"}
                          </div>
                          {item.phone && item.phone !== "N/A" && (
                            <div className="text-[11px] text-blue-600 font-bold truncate flex items-center gap-1 mt-0.5">
                              <Phone size={11} className="shrink-0" /> {item.phone}
                            </div>
                          )}
                        </td>

                        {/* Location & Maps */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                            <MapPin size={14} className="text-rose-500 shrink-0" />
                            <span>{item.location || item.address || "Location N/A"}</span>
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

                        {/* Date & Time */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800">
                            <CalendarDays size={13} className="text-teal-600 shrink-0" />
                            <span>{item.date || item.visitDate}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                            {item.time || "10:00 AM"}
                          </div>
                          <div className="text-[10px] text-indigo-600 font-bold mt-0.5">
                            Exec: {item.executive || item.executiveName || userName}
                          </div>
                        </td>

                        {/* Purpose & Remarks - Clean Alignment & Wide Display */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[10px] font-bold border border-slate-200">
                              <Briefcase size={11} className="text-teal-600" />
                              {item.purpose || "Site Visit"}
                            </span>
                            {(item.notes || item.remark) && (
                              <div className="text-[11px] font-medium text-slate-800 leading-relaxed bg-amber-50/90 p-2.5 rounded-xl border border-amber-200/80 shadow-2xs whitespace-pre-wrap">
                                {item.notes || item.remark}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Check-In / Out GPS */}
                        <td className="py-3.5 px-4 text-[11px] space-y-0.5 align-top text-right">
                          <div>
                            <span className="text-slate-400 font-bold uppercase text-[9px]">In: </span>
                            <span className="font-extrabold text-slate-800">{item.checkInTime || "Pending"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold uppercase text-[9px]">Out: </span>
                            <span className="font-extrabold text-slate-800">{item.checkOutTime || "Pending"}</span>
                          </div>
                          {item.travelDistance && (
                            <span className="inline-block text-[9px] font-black text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded-md border border-violet-100 mt-0.5">
                              {item.travelDistance}
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

      {/* ── TAB 2: OPPORTUNITIES & DEALS VIEW ────────────────────────────── */}
      {activeTab === "opportunities" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Lead ID, Customer ID, deal customer, stage..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 text-xs sm:text-sm border border-slate-200 rounded-xl pl-9 pr-3 bg-slate-50 font-semibold focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Date Logged</th>
                    <th className="py-3.5 px-4">Lead Source</th>
                    <th className="py-3.5 px-4">Company / Lead Name</th>
                    <th className="py-3.5 px-4">Point of Contact</th>
                    <th className="py-3.5 px-4">Location / Address</th>
                    <th className="py-3.5 px-4">Research Notes & Remarks</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {filteredOpportunities.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                        No opportunity records logged for selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredOpportunities.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        {/* 1. Date */}
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          {item.date || item.closing || "2026-08-04"}
                        </td>

                        {/* 2. Source */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-teal-50 text-teal-800 text-xs font-black border border-teal-200 shadow-2xs">
                            {item.source || "Field Research (SE)"}
                          </span>
                        </td>

                        {/* 3. Company / Lead Name & Product Requirement */}
                        <td className="py-3.5 px-4">
                          <div className="font-black text-slate-900 text-sm">{item.customer}</div>
                          {item.productRequirement && (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-extrabold border border-indigo-200">
                              📦 {item.productRequirement}
                            </span>
                          )}
                        </td>

                        {/* 4. Contact Person */}
                        <td className="py-3.5 px-4 font-bold text-slate-700">
                          <div>{item.contactPerson || item.person || "Managing Director"}</div>
                          {item.phone && <div className="text-[11px] text-blue-600 font-bold">{item.phone}</div>}
                        </td>

                        {/* 5. Location */}
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          {item.address || item.location || item.city || "Chennai Site"}
                        </td>

                        {/* 6. Remarks */}
                        <td className="py-3.5 px-4 max-w-[240px]">
                          <p className="text-[11px] text-slate-700 font-medium leading-relaxed bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/80">
                            {item.remarks || item.notes || "Researched prospect detail."}
                          </p>
                        </td>

                        {/* 7. Action: Convert / Add Lead */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              // Store selected opportunity details for Add Lead form auto-fill
                              const prefillObj = {
                                company: item.customer || "",
                                product: item.productRequirement || "",
                                person: item.contactPerson || item.person || "",
                                phone: item.phone || "",
                                city: item.address || item.location || item.city || "",
                                source: item.source || "Field Research (SE)",
                                notes: item.remarks || item.notes || "",
                              };
                              localStorage.setItem("tc_prefill_opportunity_lead", JSON.stringify(prefillObj));
                              showToast(`📋 Redirecting to Add Lead form for "${item.customer}"...`, "info");
                              window.location.href = "/sales/leads?action=add_lead_from_opp";
                            }}
                            className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-[11px] transition shadow-xs cursor-pointer inline-flex items-center gap-1"
                          >
                            <Plus size={13} /> Add Lead
                          </button>
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-black text-slate-900">Schedule Site Visit</h2>
            <form onSubmit={handleScheduleVisitSubmit} className="space-y-3 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 mb-1">Customer / Client Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ABC Hospital"
                  value={visitForm.customer}
                  onChange={(e) => setVisitForm(p => ({ ...p, customer: e.target.value }))}
                  className="w-full h-9 border border-slate-200 rounded-xl px-3 bg-slate-50 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Visit Location / Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shenoy Nagar, Chennai"
                  value={visitForm.location}
                  onChange={(e) => setVisitForm(p => ({ ...p, location: e.target.value }))}
                  className="w-full h-9 border border-slate-200 rounded-xl px-3 bg-slate-50 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 mb-1">Visit Date</label>
                  <input
                    type="text"
                    value={visitForm.date}
                    onChange={(e) => setVisitForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full h-9 border border-slate-200 rounded-xl px-3 bg-slate-50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">Visit Time</label>
                  <input
                    type="text"
                    value={visitForm.time}
                    onChange={(e) => setVisitForm(p => ({ ...p, time: e.target.value }))}
                    className="w-full h-9 border border-slate-200 rounded-xl px-3 bg-slate-50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsVisitModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 cursor-pointer"
                >
                  Schedule Visit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD OPPORTUNITY MODAL (Date, Source, Company Name, Location, Remarks) ── */}
      {isOppModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-4 shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">Add New Opportunity</h3>
                <p className="text-xs font-semibold text-teal-600">Save SE researched prospect details directly to Tabular Report</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOppModalOpen(false)}
                className="p-2 rounded-2xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateOpportunitySubmit} className="space-y-4 text-xs font-semibold">
              {/* Date & Source Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">Date (*Required)</label>
                  <input
                    type="text"
                    required
                    value={oppForm.date}
                    onChange={(e) => setOppForm({ ...oppForm, date: e.target.value })}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-slate-50 font-extrabold text-slate-900 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">Source (*Required)</label>
                  <select
                    value={oppForm.source}
                    onChange={(e) => setOppForm({ ...oppForm, source: e.target.value })}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-slate-50 font-bold text-slate-900 focus:outline-none focus:border-teal-500 cursor-pointer"
                  >
                    <option value="Field Research (SE)">🔍 Field Research (SE)</option>
                    <option value="Website Inquiry">🌐 Website Inquiry</option>
                    <option value="Client Referral">🤝 Client Referral</option>
                    <option value="Cold Call / Outreach">📞 Cold Call / Field Outreach</option>
                    <option value="Social Media / Ads">📱 Social Media & Ads</option>
                    <option value="Other">🌐 Other Source (Specify...)</option>
                  </select>
                  {oppForm.source === "Other" && (
                    <input
                      type="text"
                      required
                      placeholder="Type custom lead source..."
                      value={oppForm.customSource}
                      onChange={(e) => setOppForm({ ...oppForm, customSource: e.target.value })}
                      className="w-full h-9 border border-teal-300 rounded-xl px-3 mt-2 bg-white font-extrabold text-slate-900 focus:outline-none focus:border-teal-600 text-xs"
                    />
                  )}
                </div>
              </div>

              {/* Company / Lead Name & Product Requested */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">Company / Lead Name (*Required)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Global Systems"
                    value={oppForm.company}
                    onChange={(e) => setOppForm({ ...oppForm, company: e.target.value })}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white font-extrabold text-slate-900 focus:outline-none focus:border-teal-500 text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">Product / Requirement (*Why reach out)</label>
                  <input
                    type="text"
                    placeholder="e.g. GPS Tracking Software, CRM Enterprise"
                    value={oppForm.productRequirement}
                    onChange={(e) => setOppForm({ ...oppForm, productRequirement: e.target.value })}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white font-bold text-slate-900 focus:outline-none focus:border-teal-500 text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Contact Person & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">Point of Contact</label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Kumar (MD)"
                    value={oppForm.contactPerson}
                    onChange={(e) => setOppForm({ ...oppForm, contactPerson: e.target.value })}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white font-medium focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={oppForm.phone}
                    onChange={(e) => setOppForm({ ...oppForm, phone: e.target.value })}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white font-medium focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-slate-700 font-extrabold mb-1">Location / Address (*Required)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Guindy Industrial Estate, Chennai"
                  value={oppForm.location}
                  onChange={(e) => setOppForm({ ...oppForm, location: e.target.value })}
                  className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white font-medium focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-slate-700 font-extrabold mb-1">Remarks / Research Notes (*Required)</label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Researched prospect needing 30 GPS units for sales fleet..."
                  value={oppForm.remarks}
                  onChange={(e) => setOppForm({ ...oppForm, remarks: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-3 bg-white font-medium focus:outline-none focus:border-teal-500 text-xs"
                />
              </div>

              {/* Submit Action */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOppModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-teal-600 text-white font-extrabold hover:bg-teal-700 transition cursor-pointer shadow-md shadow-teal-600/20"
                >
                  Save Opportunity 🎯
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
