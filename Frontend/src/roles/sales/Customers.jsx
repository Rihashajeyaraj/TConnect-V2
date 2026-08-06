import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Users,
  Phone,
  Mail,
  MapPin,
  Building2,
  Eye,
  CalendarDays,
  IndianRupee,
  UserCheck,
  X,
  MessageSquare,
  Sparkles,
  HelpCircle,
  FileText,
  Plus,
  Send,
  Calendar,
  Clock,
  Navigation,
  ArrowLeft,
  LayoutGrid,
  Table as TableIcon,
} from "lucide-react";
import { customerAPI } from "../../services/api.js";
import { useToast } from "../../common/ToastContext.jsx";
import useCurrentUser from "../../hooks/useCurrentUser.js";
import { filterUserItems, isItemOwnedByUser } from "../../utils/userScope.js";
import { formatDate } from "../../utils/dateUtils.js";

const DEFAULT_CUSTOMERS = [];

export default function Customers() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const currentUser = useCurrentUser();

  const userEmail = (currentUser.email || "").toLowerCase().trim();
  const userName = currentUser.name || currentUser.full_name || userEmail.split("@")[0] || "Sales Executive";
  const userEmpCode = currentUser.employee_code || currentUser.employee_id || "";
  const userId = currentUser.id || currentUser.user_id || "";

  const matchesUser = (item) => {
    if (!item) return false;
    const mgr = (item.accountManager || item.assignedTo || item.assigned_to || item.executive || "").toLowerCase().trim();
    const email = (item.assignedToEmail || item.assigned_to_email || item.email || "").toLowerCase().trim();
    const empCode = (item.employee_id || item.employee_code || "").toLowerCase().trim();
    const uid = (item.user_id || item.userId || "").toLowerCase().trim();

    if (userEmail && (email === userEmail || mgr === userEmail)) return true;
    if (userEmpCode && empCode === userEmpCode.toLowerCase()) return true;
    if (userId && uid === userId.toLowerCase()) return true;
    if (userName && (mgr.includes(userName.toLowerCase()) || userName.toLowerCase().includes(mgr))) return true;

    return false;
  };

  const [customerList, setCustomerList] = useState(() => {
    try {
      const saved = localStorage.getItem("tc_customer_accounts");
      const parsed = saved ? JSON.parse(saved) : filterUserItems(DEFAULT_CUSTOMERS, currentUser);
      return filterUserItems(parsed, currentUser);
    } catch {
      return filterUserItems(DEFAULT_CUSTOMERS, currentUser);
    }
  });

  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [dateFilterMode, setDateFilterMode] = useState("All"); // "All" | "Today" | "This Month" | "Custom"
  const [customFilterDate, setCustomFilterDate] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "grid" (Card View) | "table" (Table View)

  // Form states for Logging Remarks & Converting to Visit
  const [newRemarkText, setNewRemarkText] = useState("");
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [visitDate, setVisitDate] = useState("");
  const [visitTime, setVisitTime] = useState("10:30 AM");
  const [callDiscussion, setCallDiscussion] = useState("");

  // Persist local custom updates
  useEffect(() => {
    try {
      localStorage.setItem("tc_customer_accounts", JSON.stringify(customerList));
    } catch (e) {
      console.error(e);
    }
  }, [customerList]);

  // Load Converted Leads dynamically on mount and sync to Supabase
  useEffect(() => {
    try {
      const savedLeads = localStorage.getItem("tc_sm_leads");
      if (savedLeads) {
        const parsedLeads = JSON.parse(savedLeads);
        const converted = parsedLeads
          .filter((l) => l && (l.status === "Converted to Customer" || l.status === "Converted"))
          .map((l) => ({
            id: `conv_${l.id}`,
            lead_id: l.lead_id || l.id,
            name: l.company || l.name || "Converted Client",
            person: l.person || l.contactPerson || "Contact Person",
            phone: l.phone || "",
            email: l.email || "",
            city: l.city || "Chennai",
            revenue: l.value || "₹4,50,000",
            lastVisit: "Just Converted",
            status: "Active",
            reachOutReason: l.notes || "Reached out for CRM automation & field sales streamlining.",
            packageTier: "Standard Enterprise Suite",
            onboardingRemarks: "Newly converted client from Sales Manager lead allocation.",
            accountManager: l.assignedTo || userName,
            onboardDate: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
            remarksHistory: l.executiveRemarks || [
              { date: "Just now", note: "Account converted from SM Lead allocation." }
            ]
          }));

        // Dispatch createCustomer API for each converted lead to ensure Supabase persistence
        converted.forEach(async (c) => {
          try {
            await customerAPI.createCustomer({
              name: c.name,
              company_name: c.name,
              contact_person: c.person,
              email: c.email,
              phone: c.phone,
              city: c.city,
              lead_id: c.lead_id,
              notes: c.reachOutReason,
              assigned_to: userName,
              assigned_to_email: userEmail,
            });
          } catch (e) {}
        });

        setCustomerList((prev) => {
          let updated = [...prev];
          converted.forEach((c) => {
            const targetName = (c.name || "").toLowerCase();
            if (targetName && !updated.some((item) => (item?.name || item?.company || "").toLowerCase() === targetName)) {
              updated.unshift(c);
            }
          });
          return updated;
        });
      }
    } catch (e) {
      console.error(e);
    }

    customerAPI
      .getCustomers()
      .then((res) => {
        const raw = Array.isArray(res) ? res : (res?.data || []);
        if (!raw.length) return;

        const normalized = raw.map((c) => ({
          id: c.customer_id || c.id,
          customer_id: c.customer_id || c.id,
          leadId: c.lead_id,
          leadNumber: c.leadNumber || (c.lead_id ? String(c.lead_id).slice(0, 12).toUpperCase() : null),
          name: c.name || c.company || c.company_name || "Client Account",
          company: c.company || c.name || c.company_name || "Client Account",
          person: c.person || c.contactPerson || c.contact_person || "—",
          phone: c.phone || c.mobile || "—",
          email: c.email || "—",
          city: c.city || (c.billing_address || "").split(",")[0] || "—",
          status: c.status || "Active Customer",
          packageTier: c.packageTier || "Enterprise Plan",
          reachOutReason: c.notes || c.reachOutReason || "Converted from lead.",
          accountManager: c.accountManager || c.account_manager || userName,
          contractValue: c.contractValue || c.revenue || "₹4,50,000",
          remarksHistory: c.remarksHistory || [],
        }));

        setCustomerList((prev) => {
          const merged = [...prev];
          normalized.forEach((sc) => {
            const alreadyExists = merged.some(
              (lc) =>
                (lc.customer_id && lc.customer_id === sc.customer_id) ||
                (lc.id && lc.id === sc.id) ||
                (sc.name && (lc.name || lc.company || "").toLowerCase() === sc.name.toLowerCase())
            );
            if (!alreadyExists) merged.unshift(sc);
          });
          return merged;
        });
      })
      .catch((err) => console.warn("Could not fetch customers from API:", err));
  }, []);

  // Standard Remark Logging Handler
  const handleAddRemark = (e) => {
    e.preventDefault();
    if (!newRemarkText.trim() || !selectedCustomer) return;

    const newRemarkObj = {
      date: "Today, " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      note: newRemarkText,
    };

    const updatedList = customerList.map((c) => {
      if (c.id === selectedCustomer.id) {
        const history = c.remarksHistory || [];
        return { ...c, remarksHistory: [newRemarkObj, ...history] };
      }
      return c;
    });

    setCustomerList(updatedList);
    setSelectedCustomer((prev) => ({
      ...prev,
      remarksHistory: [newRemarkObj, ...(prev.remarksHistory || [])],
    }));

    setNewRemarkText("");
    showToast("Executive account remark saved!", "success");
  };

  // Convert Customer Call/Meeting into Scheduled Visit
  const handleConvertToVisit = (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const discussionNotes = callDiscussion.trim() || "Spoke with client director. Agreed on site visit & product demonstration.";
    const scheduledDateStr = visitDate || new Date().toISOString().slice(0, 10);
    const scheduledTimeStr = visitTime || "10:30 AM";

    // 1. Create New Visit Object
    const newVisitObj = {
      id: `vis_${Date.now()}`,
      customer: selectedCustomer.name,
      client: selectedCustomer.name,
      contactPerson: selectedCustomer.person || selectedCustomer.contactPerson,
      location: `${selectedCustomer.city || "Chennai"} Site`,
      address: `${selectedCustomer.city || "Chennai"} Site`,
      executive: userName,
      assignedToEmail: userEmail,
      date: scheduledDateStr,
      time: scheduledTimeStr,
      purpose: "Client Site Visit & Demo",
      status: "Scheduled",
      checkInTime: `${scheduledDateStr} at ${scheduledTimeStr}`,
      checkOutTime: "Pending",
      meetingDuration: "Planned Visit",
      travelDistance: "10.0 km est",
      notes: `Call Discussion: "${discussionNotes}". Scheduled Visit Date: ${scheduledDateStr} at ${scheduledTimeStr}`,
      mapsUrl: `https://maps.google.com/?q=${encodeURIComponent(selectedCustomer.name + " " + (selectedCustomer.city || "Chennai"))}`,
    };

    try {
      const savedVisits = JSON.parse(localStorage.getItem("tc_sales_visits") || "[]");
      localStorage.setItem("tc_sales_visits", JSON.stringify([newVisitObj, ...savedVisits]));
    } catch (err) {}

    try {
      const savedNotifs = JSON.parse(localStorage.getItem("tc_app_notifications") || "[]");
      const smNotif = {
        id: `notif_sm_vis_${Date.now()}`,
        recipientRole: "manager",
        title: `📅 Customer Visit Scheduled: ${selectedCustomer.name}`,
        message: `${userName} spoke with ${selectedCustomer.name} (${selectedCustomer.person || "Client"}) and scheduled site visit for ${scheduledDateStr} at ${scheduledTimeStr}. Discussion Summary: "${discussionNotes}"`,
        time: "Just now",
        read: false,
        type: "Visit",
      };
      localStorage.setItem("tc_app_notifications", JSON.stringify([smNotif, ...savedNotifs]));
    } catch (err) {}

    const newHistoryRemark = {
      date: "Just now",
      note: `📅 Scheduled site visit for ${scheduledDateStr} at ${scheduledTimeStr}. Call Discussion: "${discussionNotes}"`,
    };

    const updatedList = customerList.map((c) => {
      if (c.id === selectedCustomer.id) {
        const history = c.remarksHistory || [];
        return { ...c, remarksHistory: [newHistoryRemark, ...history] };
      }
      return c;
    });

    setCustomerList(updatedList);
    setSelectedCustomer(null);
    setShowVisitForm(false);
    setCallDiscussion("");
    setVisitDate("");

    showToast(`📅 Visit scheduled for ${selectedCustomer.name}! Sent notification to Sales Manager.`, "success");
    navigate("/sales/visits");
  };

  // Handler for Updating Deal Outcome (Won / In Progress) & Contract Deal Amount
  const handleUpdateDealStatus = (customer, dealStatus, dealAmountInput) => {
    const formattedAmount = dealAmountInput.startsWith("₹") ? dealAmountInput : `₹${dealAmountInput}`;
    const remarkNote = dealStatus === "Won"
      ? `🎉 Deal Won! Closed Contract Deal Amount: ${formattedAmount}.`
      : `Contract deal amount updated to ${formattedAmount}. Status: ${dealStatus}.`;

    const updatedList = customerList.map((c) => {
      if (c.id === customer.id) {
        const history = c.remarksHistory || [];
        return {
          ...c,
          dealStatus: dealStatus,
          revenue: formattedAmount,
          contractValue: formattedAmount,
          value: formattedAmount,
          status: dealStatus === "Won" ? "Active Customer (Deal Won 🎉)" : c.status,
          remarksHistory: [{ date: "Just now", note: remarkNote }, ...history]
        };
      }
      return c;
    });

    setCustomerList(updatedList);
    setSelectedCustomer((prev) => prev ? {
      ...prev,
      dealStatus: dealStatus,
      revenue: formattedAmount,
      contractValue: formattedAmount,
      value: formattedAmount,
      status: dealStatus === "Won" ? "Active Customer (Deal Won 🎉)" : prev.status,
      remarksHistory: [{ date: "Just now", note: remarkNote }, ...(prev.remarksHistory || [])]
    } : null);

    showToast(`🎉 Customer "${customer.name}" Deal Status updated to "${dealStatus}" with Deal Amount ${formattedAmount}!`, "success");
  };

  // Helper for date matching
  const matchesDateFilter = (dateStr) => {
    if (dateFilterMode === "All") return true;
    if (!dateStr) return false;

    const todayStr = formatDate(new Date());
    if (dateFilterMode === "Today") {
      return dateStr.includes(todayStr) || dateStr.includes(new Date().toISOString().slice(0, 10)) || dateStr.includes("Just");
    }

    if (dateFilterMode === "This Month") {
      const currentMonth = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });
      return dateStr.includes(currentMonth) || dateStr.includes(new Date().toISOString().slice(0, 7)) || dateStr.includes("Just");
    }

    if (dateFilterMode === "Custom" && customFilterDate) {
      const targetFormatted = formatDate(new Date(customFilterDate));
      return dateStr.includes(customFilterDate) || dateStr.includes(targetFormatted);
    }

    return true;
  };

  // Filtered List
  const filteredCustomers = customerList.filter((item) => {
    if (!matchesUser(item)) return false;
    const q = search.toLowerCase();
    const matchesSearch =
      (item.name || "").toLowerCase().includes(q) ||
      (item.person || "").toLowerCase().includes(q) ||
      (item.city || "").toLowerCase().includes(q) ||
      (item.phone || "").includes(q) ||
      (item.customer_id || item.id || "").toString().toLowerCase().includes(q) ||
      (item.leadNumber || item.leadId || "").toString().toLowerCase().includes(q);

    const matchesDate = matchesDateFilter(item.onboardDate || item.created_at || item.lastVisit || "");

    return matchesSearch && matchesDate;
  });

  return (
    <div className="space-y-4 font-sans text-slate-900">
      {/* Top Header Banner */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-xs">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-extrabold text-slate-900 leading-tight">Customer Accounts & Insights</h1>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-200">
                Shared SE & Sales Manager Directory
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              View client details, log call remarks, schedule site visit dates, and convert directly to Visits.
            </p>
          </div>
        </div>
      </div>

      {/* Search & Date Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Customer ID (CUST-...), Lead ID, company name, contact, city, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 text-xs sm:text-sm border border-slate-200 rounded-xl pl-9 pr-3 bg-slate-50 focus:outline-none focus:border-teal-500 focus:bg-white font-semibold text-slate-800"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs font-bold">
            {/* Date-wise Filter Dropdown */}
            <select
              value={dateFilterMode}
              onChange={(e) => setDateFilterMode(e.target.value)}
              className="h-10 border border-slate-200 rounded-xl px-3 bg-teal-50/80 font-extrabold text-teal-900 border-teal-200 focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              <option value="All">📅 All Dates</option>
              <option value="Today">🌟 Today</option>
              <option value="This Month">📅 This Month</option>
              <option value="Custom">📆 Custom Date</option>
            </select>

            {dateFilterMode === "Custom" && (
              <input
                type="date"
                value={customFilterDate}
                onChange={(e) => setCustomFilterDate(e.target.value)}
                className="h-10 border border-slate-200 rounded-xl px-2.5 bg-white font-bold text-slate-800 focus:outline-none focus:border-teal-500"
              />
            )}

            {/* View Mode Toggle: Grid Cards vs Compact Table List */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 ml-auto">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-white text-teal-700 shadow-2xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title="Grid Card View"
              >
                <LayoutGrid size={15} /> Card View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  viewMode === "table"
                    ? "bg-white text-teal-700 shadow-2xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title="Compact Table View"
              >
                <TableIcon size={15} /> Table View
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-1 pt-1 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-900">{filteredCustomers.length}</strong> of <strong className="text-slate-900">{customerList.length}</strong> customer accounts
          </span>
          {(search || dateFilterMode !== "All") && (
            <button
              onClick={() => {
                setSearch("");
                setDateFilterMode("All");
                setCustomFilterDate("");
              }}
              className="text-teal-600 hover:text-teal-800 font-bold cursor-pointer underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ── CARD VIEW (GRID) ────────────────────────────────────────────────── */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-teal-500/50 hover:shadow-md transition p-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 leading-tight">{customer.name}</h3>
                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{customer.person || customer.contactPerson}</p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="inline-flex items-center text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md tracking-wide">
                        🏢 CUST-{(customer.id || customer.customer_id || "").toString().slice(-10).toUpperCase()}
                      </span>
                      {(customer.leadId || customer.leadNumber) && (
                        <span className="inline-flex items-center text-[9px] font-black text-violet-700 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-md tracking-wide">
                          🪪 {customer.leadNumber || (customer.leadId || "").toString().slice(0, 12).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                    {customer.status}
                  </span>
                </div>

                {/* Reach Out Reason Snippet */}
                <div className="p-2.5 bg-teal-50/70 rounded-xl border border-teal-100 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-teal-800 uppercase tracking-wider">
                    <HelpCircle size={12} className="text-teal-600 shrink-0" />
                    <span>Why They Reached Out</span>
                  </div>
                  <p className="text-[11px] text-teal-950 font-semibold leading-snug line-clamp-2">
                    {customer.reachOutReason || "Contacted for CRM & field sales automation."}
                  </p>
                </div>

                <div className="space-y-1 text-xs font-semibold text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>{customer.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{customer.city}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 font-medium">Tier: {customer.packageTier?.split(" ")[0] || "Enterprise"}</span>
                <button
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setShowVisitForm(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-xs flex items-center gap-1 transition cursor-pointer"
                >
                  <Eye size={13} /> View Remarks & Details
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── COMPACT TABLE VIEW ──────────────────────────────────────────────── */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Customer Account</th>
                  <th className="py-3.5 px-4">Contact & Location</th>
                  <th className="py-3.5 px-4">Why They Reached Out</th>
                  <th className="py-3.5 px-4">Account Manager / Tier</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                      No customer accounts match selected search or date filters.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-slate-50/80 transition">
                      {/* Customer Account & IDs */}
                      <td className="py-3.5 px-4">
                        <div className="font-black text-slate-900 text-sm">{customer.name}</div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="inline-flex items-center text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                            🏢 CUST-{(customer.id || customer.customer_id || "").toString().slice(-8).toUpperCase()}
                          </span>
                        </div>
                      </td>

                      {/* Contact & Location */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{customer.person || customer.contactPerson}</div>
                        <div className="text-[11px] text-blue-600 font-bold">{customer.phone}</div>
                        <div className="text-[10px] text-slate-500">{customer.city}</div>
                      </td>

                      {/* Reach Out Reason */}
                      <td className="py-3.5 px-4 max-w-[280px]">
                        <p className="text-[11px] text-teal-950 font-semibold leading-relaxed bg-teal-50/80 p-2 rounded-xl border border-teal-100 line-clamp-2">
                          {customer.reachOutReason || "Contacted for CRM & field sales automation."}
                        </p>
                      </td>

                      {/* Account Manager / Tier */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-800">{customer.accountManager || userName}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{customer.packageTier || "Standard Enterprise"}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-emerald-200">
                          {customer.status}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setShowVisitForm(false);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-xs inline-flex items-center gap-1 transition cursor-pointer"
                        >
                          <Eye size={13} /> View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer Insights & Remarks Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900">{selectedCustomer.name}</h3>
                <p className="text-xs font-semibold text-teal-600">Active Customer Insights & Remarks</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="p-2 rounded-2xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm font-semibold text-slate-700">
              {/* DEAL OUTCOME & CONTRACT AMOUNT CARD */}
              <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border-2 border-emerald-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black text-emerald-950">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>DEAL STATUS & CONTRACT AMOUNT</span>
                  </div>
                  <span className="text-xs font-black text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                    {selectedCustomer.dealStatus || "Deal Won 🎉"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Won the Deal Button */}
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                      Update Deal Outcome
                    </label>
                    <button
                      type="button"
                      onClick={() => handleUpdateDealStatus(selectedCustomer, "Won", selectedCustomer.revenue || selectedCustomer.contractValue || "₹4,50,000")}
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                    >
                      <UserCheck size={16} /> Mark as "Won the Deal" 🎉
                    </button>
                  </div>

                  {/* Contract Deal Amount Input */}
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                      Enter Closed Deal Amount (INR)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="e.g. ₹4,50,000"
                        defaultValue={selectedCustomer.revenue || selectedCustomer.contractValue || "₹4,50,000"}
                        onBlur={(e) => handleUpdateDealStatus(selectedCustomer, selectedCustomer.dealStatus || "Won", e.target.value)}
                        className="w-full h-10 border border-emerald-300 rounded-xl px-3 bg-white text-slate-900 font-extrabold focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 1. Why They Reached Out Box */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-amber-900 uppercase tracking-wider">
                  <HelpCircle size={14} className="text-amber-600" />
                  <span>Why They Reached Out To Us</span>
                </div>
                <p className="text-xs sm:text-sm text-amber-950 font-bold leading-relaxed">
                  {selectedCustomer.reachOutReason || "Seeking complete field sales tracking, live GPS check-in, and automated visit reports."}
                </p>
              </div>

              {/* 2. Onboarding Remarks & Package */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Package Tier</span>
                  <p className="text-xs sm:text-sm font-extrabold text-slate-900">{selectedCustomer.packageTier || "Standard Enterprise"}</p>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Account Manager</span>
                  <p className="text-xs sm:text-sm font-extrabold text-slate-900">{selectedCustomer.accountManager || userName}</p>
                </div>
              </div>

              {/* 3. Onboarding Special Remarks */}
              <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl space-y-1">
                <span className="text-[10px] font-extrabold text-purple-800 uppercase tracking-wider">Special Account Remarks</span>
                <p className="text-xs sm:text-sm text-purple-950 font-medium">{selectedCustomer.onboardingRemarks || "Account active. No special custom flags attached."}</p>
              </div>

              {/* 4. Log General Interaction Remark Form */}
              <form onSubmit={handleAddRemark} className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="font-extrabold text-slate-900 text-xs sm:text-sm block">Log New Executive Remark / Interaction Note</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Spoke with client director; scheduled Q4 renewal call..."
                    value={newRemarkText}
                    onChange={(e) => setNewRemarkText(e.target.value)}
                    className="flex-1 h-10 text-xs sm:text-sm border border-slate-200 rounded-xl px-3 bg-slate-50 focus:outline-none focus:border-teal-500 font-medium text-slate-900"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs sm:text-sm shadow-xs flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Send size={14} /> Log
                  </button>
                </div>
              </form>

              {/* 5. DEDICATED CONVERT TO VISIT SECTION */}
              <div className="p-3.5 bg-teal-50/80 border border-teal-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black text-teal-900">
                    <CalendarDays size={16} className="text-teal-600" />
                    <span>Schedule Client Site Visit & Convert to Visit 📅</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowVisitForm(!showVisitForm)}
                    className="text-[11px] font-extrabold text-teal-700 hover:underline"
                  >
                    {showVisitForm ? "Cancel" : "+ Schedule New Visit"}
                  </button>
                </div>

                {showVisitForm && (
                  <form onSubmit={handleConvertToVisit} className="space-y-2.5 pt-1 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Call Summary / What Was Discussed
                      </label>
                      <textarea
                        rows="2"
                        required
                        placeholder="e.g. Spoke with client. Client agreed on site demo and requested pricing breakdown..."
                        value={callDiscussion}
                        onChange={(e) => setCallDiscussion(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-2.5 bg-white text-slate-900 font-medium focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Agreed Visit Date
                        </label>
                        <input
                          type="date"
                          required
                          value={visitDate}
                          onChange={(e) => setVisitDate(e.target.value)}
                          className="w-full h-8 border border-slate-200 rounded-xl px-2.5 bg-white text-slate-900 font-semibold focus:outline-none focus:border-teal-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Agreed Time
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 10:30 AM"
                          value={visitTime}
                          onChange={(e) => setVisitTime(e.target.value)}
                          className="w-full h-8 border border-slate-200 rounded-xl px-2.5 bg-white text-slate-900 font-semibold focus:outline-none focus:border-teal-500"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <CalendarDays size={14} /> Convert to Visit 📅 (Notify Sales Manager & Move to Visit Page)
                    </button>
                  </form>
                )}
              </div>

              {/* 6. Historical Remarks Timeline */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Remarks & Activity History</span>
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {(selectedCustomer.remarksHistory || []).map((r, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-0.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                        <span>Logged Note</span>
                        <span>{r.date}</span>
                      </div>
                      <p className="text-slate-800 font-semibold">{r.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}