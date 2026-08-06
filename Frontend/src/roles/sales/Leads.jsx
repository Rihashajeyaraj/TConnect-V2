import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  Phone,
  Mail,
  MapPin,
  Eye,
  User,
  UserCheck,
  CalendarDays,
  Filter,
  Users,
  TrendingUp,
  Clock3,
  CheckCircle2,
  X,
  Building2,
  ExternalLink,
  Flame,
  Zap,
  Snowflake,
  Bell,
  XCircle,
  MessageSquare,
  Send,
  Plus,
  HelpCircle,
  PhoneCall,
  Calendar,
  Clock,
  ArrowLeft,
  CalendarPlus,
  UserPlus,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { crmAPI, visitAPI, customerAPI } from "../../services/api.js";
import { useToast } from "../../common/ToastContext.jsx";
import useCurrentUser from "../../hooks/useCurrentUser.js";
import { filterUserItems, isItemOwnedByUser } from "../../utils/userScope.js";
import { formatDate } from "../../utils/dateUtils.js";

const INITIAL_LEADS = [];
const INITIAL_FOLLOWUPS = [];

export default function Leads() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const currentUser = useCurrentUser();

  // Active view tab: "leads" | "followups"
  const [activeTab, setActiveTab] = useState("leads");

  useEffect(() => {
    if (location.state?.openAddModal) {
      setIsAddModalOpen(true);
    }
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  const userEmail = (currentUser.email || "executive@tconnect.com").toLowerCase().trim();
  const userName = currentUser.name || currentUser.full_name || "Sales Executive";
  const firstName = userName.split(" ")[0];

  // Helper to remove duplicate lead records by phone number or company name
  const deduplicateLeadsList = (leadsArr) => {
    if (!Array.isArray(leadsArr)) return [];
    const map = new Map();
    leadsArr.forEach((l) => {
      if (!l) return;
      const rawPhone = (l.phone || "").replace(/\D/g, "");
      const rawCompany = (l.company || "").toLowerCase().trim();
      const key = rawPhone && rawPhone.length > 5 ? `phone_${rawPhone}` : rawCompany && rawCompany !== "client account" ? `comp_${rawCompany}` : `id_${l.id}`;

      const existing = map.get(key);
      if (!existing) {
        map.set(key, l);
      } else {
        if (
          l.category === "Cold" ||
          l.status?.includes("Lost") ||
          l.status?.includes("Converted") ||
          (l.notes && !existing.notes)
        ) {
          map.set(key, l);
        }
      }
    });
    return Array.from(map.values());
  };

  const [allLeads, setAllLeads] = useState(() => {
    try {
      const saved = localStorage.getItem("tc_sm_leads");
      const parsed = saved ? JSON.parse(saved) : filterUserItems(INITIAL_LEADS, currentUser);
      const userScoped = filterUserItems(parsed, currentUser);
      const deduped = deduplicateLeadsList(userScoped);

      // Backfill customerId for converted leads that were saved before this feature
      const savedCustomers = JSON.parse(localStorage.getItem("tc_customer_accounts") || "[]");
      return deduped.map((l) => {
        if ((l.status === "Converted to Customer" || l.status === "Converted") && !l.customerId) {
          const match = savedCustomers.find(
            (c) => c.name === l.company || c.company === l.company || c.leadId === l.id
          );
          if (match) return { ...l, customerId: match.id || match.customer_id };
        }
        return l;
      });
    } catch {
      return filterUserItems(INITIAL_LEADS, currentUser);
    }
  });

  const [followupsList, setFollowupsList] = useState(() => {
    try {
      const saved = localStorage.getItem("tc_sales_followups");
      const parsed = saved ? JSON.parse(saved) : filterUserItems(INITIAL_FOLLOWUPS, currentUser);
      return filterUserItems(parsed, currentUser);
    } catch {
      return filterUserItems(INITIAL_FOLLOWUPS, currentUser);
    }
  });

  const [visitList, setVisitList] = useState(() => {
    try {
      const saved = localStorage.getItem("tc_sales_visits");
      const parsed = saved ? JSON.parse(saved) : [];
      return filterUserItems(parsed, currentUser);
    } catch {
      return [];
    }
  });

  // Fetch real visits from Supabase via backend visitAPI
  useEffect(() => {
    visitAPI.getVisits()
      .then((res) => {
        if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
          const apiVisits = res.data.map((v) => ({
            id: v.visit_id || v.id,
            customer: v.title || v.customer_name || "Client Account",
            client: v.title || v.customer_name || "Client Account",
            person: v.contact_person || v.contactPerson || "Point of Contact",
            phone: v.phone || "",
            location: v.location || v.address || "Chennai",
            date: v.scheduled_time ? formatDate(v.scheduled_time) : formatDate(new Date()),
            time: "10:00 AM",
            status: v.status === "COMPLETED" ? "Completed" : "Scheduled",
            purpose: v.purpose || "Site Visit & Demo",
            notes: v.remarks || v.notes || ""
          }));

          setVisitList((prev) => [...apiVisits, ...prev.filter(p => !apiVisits.some(a => a.id === p.id))]);
        }
      })
      .catch(() => null);
  }, []);
  useEffect(() => {
    crmAPI.getLeads()
      .then((res) => {
        const raw = Array.isArray(res) ? res : (res?.data || []);
        if (!raw.length) return;

        const apiLeads = raw.map((l) => {
          // Map Supabase status values to frontend status strings
          const rawStatus = (l.status || "NEW").toUpperCase();
          const statusMap = {
            "NEW": "New",
            "FOLLOW_UP": "Moved to Follow-ups",
            "VISIT_SCHEDULED": "Visit Scheduled",
            "CONVERTED": "Converted to Customer",
            "LOST": "Not Converted / Lost",
          };
          return {
            id: l.lead_id || l.id,
            leadNumber: l.lead_number || `LD-${String(l.lead_id || l.id || "").slice(-8).toUpperCase()}`,
            company: l.company_name || l.company || "Prospect Lead",
            person: l.contact_person || l.contact_name || "Point of Contact",
            phone: l.mobile || l.contact_phone || "",
            email: l.email || l.contact_email || "",
            city: l.city || "Chennai",
            category: l.category || "Warm",
            priority: l.priority || "Medium",
            status: statusMap[rawStatus] || l.status || "New",
            value: l.expected_value ? `₹${Number(l.expected_value).toLocaleString("en-IN")}` : "₹4,50,000",
            assignedTo: l.assigned_to || userName,
            assignedToEmail: l.assigned_to_email || userEmail,
            notes: l.notes || l.remarks || "",
            customerId: l.customer_id || null,
            source: l.source || "Supabase",
            createdAt: l.created_at ? formatDate(l.created_at) : formatDate(new Date()),
          };
        });

        setAllLeads((prev) => {
          // Merge: Supabase leads take priority; avoid duplication by id or phone
          const localOnly = prev.filter(
            (lc) => !apiLeads.some(
              (ac) =>
                ac.id === lc.id ||
                (ac.phone && ac.phone.replace(/\D/g, "") === (lc.phone || "").replace(/\D/g, "") && ac.phone.replace(/\D/g, "").length > 5) ||
                (ac.company && ac.company.toLowerCase() === (lc.company || "").toLowerCase())
            )
          );
          return deduplicateLeadsList([...apiLeads, ...localOnly]);
        });
      })
      .catch((err) => {
        console.log("Using stored leads fallback:", err);
      });
  }, []);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewMode, setViewMode] = useState("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, statusFilter, activeTab]);

  const [selectedLead, setSelectedLead] = useState(null);
  const [showTimelineModal, setShowTimelineModal] = useState(null); // Lead object for lifecycle audit timeline
  const [seRemarkInput, setSeRemarkInput] = useState("");

  // Follow-up form state inside modal
  const [showFollowupForm, setShowFollowupForm] = useState(false);
  const [followupDate, setFollowupDate] = useState("");
  const [followupTime, setFollowupTime] = useState("02:30 PM");

  // Post-Visit Meeting Outcome Modal State
  const [selectedVisitForOutcome, setSelectedVisitForOutcome] = useState(null);
  const [visitOutcomeForm, setVisitOutcomeForm] = useState({
    personMet: "",
    discussionNotes: "",
    leadFeedback: "",
    outcomeStatus: "Won",
    agreedValue: "₹4,50,000",
  });

  // Add Lead Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    company: "",
    product: "",
    person: "",
    phone: "",
    email: "",
    city: "",
    category: "Hot",
    priority: "High",
    value: "₹4,50,000",
    source: "Field Research (SE)",
    targetList: "Leads", // "Leads" | "Opportunities"
    notes: "",
  });

  // Sync state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("tc_sm_leads", JSON.stringify(allLeads));
    } catch (e) { }
  }, [allLeads]);

  // Check if redirected from Client Log Opportunity Table ("Add Lead" Action)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("action") === "add_lead_from_opp") {
        const savedPrefill = localStorage.getItem("tc_prefill_opportunity_lead");
        if (savedPrefill) {
          const parsed = JSON.parse(savedPrefill);
          setAddForm((prev) => ({
            ...prev,
            company: parsed.company || "",
            product: parsed.product || "",
            person: parsed.person || "",
            phone: parsed.phone || "",
            city: parsed.city || "",
            source: parsed.source || "Field Research (SE)",
            notes: parsed.notes || "",
            targetList: "Leads",
          }));
          localStorage.removeItem("tc_prefill_opportunity_lead");
        }
        setIsAddModalOpen(true);
      }
    } catch (e) { }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("tc_sales_followups", JSON.stringify(followupsList));
    } catch (e) { }
  }, [followupsList]);

  useEffect(() => {
    try {
      localStorage.setItem("tc_sales_visits", JSON.stringify(visitList));
    } catch (e) { }
  }, [visitList]);

  const userEmpCode = currentUser.employee_code || currentUser.employee_id || "";
  const userId = currentUser.id || currentUser.user_id || "";

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

  // Filter leads strictly for the logged-in Sales Executive
  const myAssignedLeads = allLeads.filter(matchesUser);

  // Filter follow-ups strictly for the logged-in Sales Executive
  const myFollowups = followupsList.filter(matchesUser);

  // Filter visits strictly for the logged-in Sales Executive
  const myVisits = visitList.filter(matchesUser);

  // ── SE Dynamic Category Change Handler ──────────────────────────────────────
  const handleChangeCategory = (leadId, newCategory) => {
    setAllLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, category: newCategory } : l))
    );
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead((prev) => ({ ...prev, category: newCategory }));
    }
    showToast(`Lead classified as ${newCategory} Lead!`, "success");
  };

  // ── SE Add Lead / Opportunity Handler ──────────────────────────────────────
  const handleAddLeadSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.company.trim() || !addForm.person.trim() || !addForm.phone.trim()) {
      showToast("Please fill in Lead Name, Point of Contact, and Phone Number!", "error");
      return;
    }

    const payload = {
      company_name: addForm.company.trim(),
      company: addForm.company.trim(),
      contact_person: addForm.person.trim(),
      person: addForm.person.trim(),
      mobile: addForm.phone.trim(),
      phone: addForm.phone.trim(),
      email: addForm.email.trim() || `${addForm.company.toLowerCase().replace(/\s+/g, '')}@example.com`,
      city: addForm.city.trim() || "Chennai",
      category: addForm.category,
      priority: addForm.priority,
      value: addForm.value || "₹4,50,000",
      source: addForm.source || "Field Research (SE)",
      notes: addForm.notes.trim() || "New researched lead added by executive.",
      assigned_to: userName,
      assigned_to_email: userEmail,
      employee_code: userEmpCode,
    };

    let serverLeadId = `lead_${Date.now()}`;
    let serverLeadNum = `LD-${Date.now().toString().slice(-8)}`;

    try {
      const apiRes = await crmAPI.createLead(payload);
      if (apiRes && (apiRes.data || apiRes.lead_id || apiRes.id)) {
        const leadData = apiRes.data || apiRes;
        serverLeadId = leadData.lead_id || leadData.id || serverLeadId;
        serverLeadNum = leadData.lead_number || serverLeadNum;
      }
    } catch (apiErr) {
      console.warn("Backend API notice when creating lead:", apiErr);
    }

    const newLeadObj = {
      id: serverLeadId,
      lead_id: serverLeadId,
      leadNumber: serverLeadNum,
      company: addForm.company.trim(),
      person: addForm.person.trim(),
      phone: addForm.phone.trim(),
      email: payload.email,
      city: payload.city,
      assignedTo: userName,
      assignedToEmail: userEmail,
      category: addForm.category,
      priority: addForm.priority,
      value: addForm.value || "₹4,50,000",
      status: "New",
      source: addForm.source || "Field Research (SE)",
      notes: payload.notes,
      customerId: null,
      createdAt: formatDate(new Date()),
      executiveRemarks: [
        { note: `Lead created by ${userName} via ${addForm.source || 'Field Research'}.`, date: "Just now", author: userName }
      ],
    };

    // If "Opportunity List" is selected, save directly to Opportunities in Client Log!
    if (addForm.targetList === "Opportunities") {
      const newOppObj = {
        id: `opp_${Date.now()}`,
        leadId: serverLeadId,
        leadNumber: serverLeadNum,
        customerId: null,
        customer: addForm.company.trim(),
        contactPerson: addForm.person.trim(),
        phone: addForm.phone.trim(),
        address: addForm.city.trim() || "Chennai Site",
        source: addForm.source || "Field Research (SE)",
        value: addForm.value || "₹4,50,000",
        probability: addForm.category === "Hot" ? "85%" : addForm.category === "Warm" ? "60%" : "30%",
        stage: "SE Research / Prospecting",
        closing: formatDate(new Date(Date.now() + 15 * 86400000)),
        status: addForm.category,
        outcome: "In Negotiation",
        remarks: addForm.notes.trim() || "Researched client detail logged by Sales Executive.",
        date: formatDate(new Date()),
      };

      try {
        const savedOpps = JSON.parse(localStorage.getItem("tc_sales_opportunities") || "[]");
        localStorage.setItem("tc_sales_opportunities", JSON.stringify([newOppObj, ...savedOpps]));
      } catch (err) { }

      showToast(`🎯 Opportunity "${addForm.company}" saved to Supabase & Opportunity List!`, "success");
    } else {
      setAllLeads((prev) => [newLeadObj, ...prev]);
      showToast(`✨ New Lead "${addForm.company}" saved to Supabase & Lead Pipeline!`, "success");
    }

    // Reset Form & Close Modal
    setAddForm({
      company: "",
      person: "",
      phone: "",
      email: "",
      city: "",
      category: "Hot",
      priority: "High",
      value: "₹4,50,000",
      source: "Field Research (SE)",
      targetList: "Leads",
      notes: "",
    });
    setIsAddModalOpen(false);

    // Persist Lead directly into Supabase via Backend API
    crmAPI.createLead({
      id: newLeadObj.id,
      company_name: newLeadObj.company,
      contact_person: newLeadObj.person,
      mobile: newLeadObj.phone,
      email: newLeadObj.email,
      city: newLeadObj.city,
      category: newLeadObj.category,
      priority: newLeadObj.priority,
      value: newLeadObj.value,
      notes: newLeadObj.notes,
      assigned_to: userName,
      assigned_to_email: userEmail
    }).then((savedLead) => {
      // Backfill canonical Lead ID from Supabase
      if (savedLead && (savedLead.lead_number || savedLead.lead_id)) {
        setAllLeads((prev) => prev.map((l) =>
          l.id === tempId
            ? { ...l, leadNumber: savedLead.lead_number || localLeadNum, id: savedLead.lead_id || tempId }
            : l
        ));
      }
      console.log("✅ Lead saved in Supabase:", savedLead);
    }).catch((err) => {
      console.warn("API lead creation warning:", err);
    });

    // Send notification to Sales Manager
    try {
      const existingNotifs = JSON.parse(localStorage.getItem("tc_app_notifications") || "[]");
      const smNotif = {
        id: `notif_${Date.now()}`,
        recipientRole: "manager",
        title: `🆕 New Lead Sourced by ${userName}`,
        message: `${userName} added lead "${newLeadObj.company}" (${newLeadObj.category} Lead).`,
        time: "Just now",
        read: false,
        type: "Lead",
      };
      localStorage.setItem("tc_app_notifications", JSON.stringify([smNotif, ...existingNotifs]));
    } catch (e) { }

    setIsAddModalOpen(false);
    setAddForm({
      company: "",
      person: "",
      phone: "",
      email: "",
      city: "",
      category: "Hot",
      priority: "High",
      value: "₹4,50,000",
      notes: "",
    });
    showToast(`🎉 New Lead "${newLeadObj.company}" added successfully!`, "success");
  };

  // ── Move to Follow-ups Action ─────────────────────────────────────────────
  const handleScheduleFollowup = (lead) => {
    if (!followupDate) {
      showToast("Please select a Follow-up Date!", "error");
      return;
    }

    const remarkText = seRemarkInput.trim() || "Follow-up scheduled after executive call.";

    const newFollowup = {
      id: `flw_${Date.now()}`,
      leadId: lead.id,
      leadNumber: lead.leadNumber || lead.id?.toString().slice(0, 12).toUpperCase(),
      company: lead.company,
      person: lead.person,
      phone: lead.phone,
      email: lead.email,
      city: lead.city,
      category: lead.category,
      scheduledDate: followupDate,
      scheduledTime: followupTime,
      remark: remarkText,
      assignedTo: userName,
      assignedToEmail: userEmail,
      status: "Scheduled",
    };

    setFollowupsList((prev) => [newFollowup, ...prev]);

    // Update lead status in allLeads
    setAllLeads((prev) =>
      prev.map((l) =>
        l.id === lead.id
          ? {
            ...l,
            status: "Moved to Follow-ups",
            notes: `[Follow-up scheduled on ${followupDate} ${followupTime}]: ${remarkText}`,
          }
          : l
      )
    );

    // Alert SM
    try {
      const existingNotifs = JSON.parse(localStorage.getItem("tc_app_notifications") || "[]");
      const smNotif = {
        id: `notif_${Date.now()}`,
        recipientRole: "manager",
        title: `📞 Follow-up Scheduled by ${userName}`,
        message: `${userName} scheduled follow-up for "${lead.company}" on ${followupDate} ${followupTime}. Remark: ${remarkText}`,
        time: "Just now",
        read: false,
        type: "Followup",
      };
      localStorage.setItem("tc_app_notifications", JSON.stringify([smNotif, ...existingNotifs]));
    } catch (e) { }

    setSelectedLead(null);
    setShowFollowupForm(false);
    setSeRemarkInput("");
    setFollowupDate("");
    showToast(`📞 Lead "${lead.company}" moved to Scheduled Follow-ups!`, "success");
  };

  // ── FOLLOW-UP TAB OUTCOME ACTION 1: Move to Visit Page ──────────────────────
  const handleMoveFollowupToVisit = (item) => {
    const vstId = `vst_${Date.now()}`;
    const genLeadId = item.leadId || item.id || `LD-${Date.now().toString().slice(-8)}`;
    const newVisit = {
      id: vstId,
      visit_id: vstId,
      lead_id: genLeadId,
      leadId: genLeadId,
      leadNumber: item.leadNumber || genLeadId,
      customer_name: item.company || "Client Account",
      company: item.company || "Client Account",
      customerName: item.company || "Client Account",
      clientName: item.company || "Client Account",
      poc_name: item.person || "Point of Contact",
      contactPerson: item.person || "Point of Contact",
      person: item.person || "Point of Contact",
      poc_mobile: item.phone || "+91 98765 43210",
      phone: item.phone || "+91 98765 43210",
      location: item.city || "Chennai",
      address: item.city || "Chennai",
      visit_date: formatDate(new Date()),
      visitDate: formatDate(new Date()),
      visit_time: "10:00 AM",
      visitTime: "10:00 AM",
      status: "Scheduled",
      visit_status: "Scheduled",
      purpose: "Site Visit / Product Demo (Converted from Follow-up Call)",
      discussion_summary: item.remark || "Follow-up completed successfully. Site visit requested.",
      remark: item.remark || "Follow-up completed successfully. Site visit requested.",
      remarks: item.remark || "Follow-up completed successfully. Site visit requested.",
      assigned_to: userName,
      assignedTo: userName,
      executive: userName,
      executiveName: userName,
      assigned_to_email: userEmail,
      assignedToEmail: userEmail,
      employee_code: userEmpCode || "EMP-101",
      lead_status: "Follow Up Required",
      lead_priority: "Hot",
      estimated_order_value: "₹4,50,000",
    };

    try {
      const visits = JSON.parse(localStorage.getItem("tc_sales_visits") || "[]");
      localStorage.setItem("tc_sales_visits", JSON.stringify([newVisit, ...visits]));

      const smVisits = JSON.parse(localStorage.getItem("tc_sm_visits") || "[]");
      localStorage.setItem("tc_sm_visits", JSON.stringify([newVisit, ...smVisits]));

      // Persist visit in Supabase via backend API
      visitAPI.createVisit({
        visit_id: newVisit.id,
        lead_id: genLeadId,
        customer_name: newVisit.customer_name,
        company: newVisit.company,
        poc_name: newVisit.poc_name,
        poc_mobile: newVisit.poc_mobile,
        location: newVisit.location,
        visit_date: newVisit.visit_date,
        visit_time: newVisit.visit_time,
        purpose: newVisit.purpose,
        assigned_to: userName,
        assigned_to_email: userEmail,
        employee_code: userEmpCode || "EMP-101",
        status: "SCHEDULED",
        visit_status: "SCHEDULED",
      }).catch(() => null);

      // Alert SM
      const existingNotifs = JSON.parse(localStorage.getItem("tc_app_notifications") || "[]");
      const smNotif = {
        id: `notif_${Date.now()}`,
        recipientRole: "manager",
        title: `📅 Visit Scheduled from Follow-up by ${userName}`,
        message: `${userName} converted follow-up "${item.company}" into a Site Visit scheduled date.`,
        time: "Just now",
        read: false,
        type: "Visit",
      };
      localStorage.setItem("tc_app_notifications", JSON.stringify([smNotif, ...existingNotifs]));
    } catch (e) { }

    // Update lead status & remove from followups
    setFollowupsList((prev) => prev.filter((f) => f.id !== item.id));
    setAllLeads((prev) =>
      prev.map((l) => (l.id === item.leadId || l.company === item.company ? { ...l, status: "Follow-up / Visit Scheduled" } : l))
    );

    showToast(`📅 Follow-up "${item.company}" converted to Visit! Moving to Visit Page...`, "success");
    setTimeout(() => navigate("/sales/visits"), 600);
  };

  // ── FOLLOW-UP TAB OUTCOME ACTION 2: Move to Customer Page ───────────────────
  const handleMoveFollowupToCustomer = (item) => {
    const newCustomer = {
      id: `cust_${Date.now()}`,
      leadId: item.leadId,
      leadNumber: item.leadNumber,
      name: item.company,
      company: item.company,
      contactPerson: item.person,
      phone: item.phone,
      email: item.email || `${item.company.toLowerCase().replace(/\s+/g, '')}@example.com`,
      city: item.city || "Chennai",
      status: "Active Customer",
      packageTier: "Enterprise Plan",
      reachOutReason: item.remark || "Converted after follow-up call.",
      accountManager: userName,
      onboardingRemarks: `Converted directly from Follow-up call by ${userName}.`,
      contractValue: "₹4,50,000",
    };

    try {
      const customers = JSON.parse(localStorage.getItem("tc_customer_accounts") || "[]");
      localStorage.setItem("tc_customer_accounts", JSON.stringify([newCustomer, ...customers]));

      // Persist customer account in Supabase via backend API
      customerAPI.createCustomer({
        id: newCustomer.id,
        name: newCustomer.name,
        company: newCustomer.company,
        person: newCustomer.contactPerson,
        phone: newCustomer.phone,
        email: newCustomer.email,
        city: newCustomer.city,
        notes: newCustomer.reachOutReason
      }).then((savedCust) => {
        const realCustomerId = savedCust?.customer_id || newCustomer.id;
        // Backfill customer ID onto the original lead in allLeads state
        setAllLeads((prev) => prev.map((l) =>
          (l.id === item.leadId || l.company === item.company)
            ? { ...l, status: "Converted to Customer", customerId: realCustomerId }
            : l
        ));
        console.log("✅ Customer persisted in Supabase:", savedCust);
      }).catch((err) => {
        console.warn("Customer API error:", err);
      });

      // Alert SM
      const existingNotifs = JSON.parse(localStorage.getItem("tc_app_notifications") || "[]");
      const smNotif = {
        id: `notif_${Date.now()}`,
        recipientRole: "manager",
        title: `🎉 Customer Converted from Follow-up by ${userName}`,
        message: `${userName} converted follow-up "${item.company}" into an active Customer Account!`,
        time: "Just now",
        read: false,
        type: "Customer",
      };
      localStorage.setItem("tc_app_notifications", JSON.stringify([smNotif, ...existingNotifs]));
    } catch (e) { }

    // Update lead status & remove from followups
    setFollowupsList((prev) => prev.filter((f) => f.id !== item.id));
    setAllLeads((prev) =>
      prev.map((l) => (l.id === item.leadId || l.company === item.company
        ? { ...l, status: "Converted to Customer", customerId: l.customerId || newCustomer.id }
        : l
      ))
    );

    showToast(`🎉 Follow-up "${item.company}" converted to Customer Account! Moving to Customer Page...`, "success");
    setTimeout(() => navigate("/sales/customers"), 600);
  };

  // ── FOLLOW-UP TAB OUTCOME ACTION 3: Classify to Hot / Warm / Cold ───────────
  const handleClassifyFollowupToCategory = (item, newCategory) => {
    setFollowupsList((prev) => prev.filter((f) => f.id !== item.id));

    setAllLeads((prev) =>
      prev.map((l) => {
        if (l.id === item.leadId || l.company === item.company) {
          return {
            ...l,
            category: newCategory,
            status: `${newCategory} Lead`,
            notes: item.remark ? `${l.notes || ''} [Follow-up Note]: ${item.remark}` : l.notes
          };
        }
        return l;
      })
    );

    const emoji = newCategory === "Hot" ? "🔥" : newCategory === "Warm" ? "⚡" : "❄️";
    showToast(`${emoji} "${item.company}" classified as ${newCategory} Lead & moved to Leads tab!`, "success");
    setActiveTab("leads");
  };

  // ── POST-VISIT MEETING OUTCOME SUBMIT HANDLER ─────────────────────────────
  const handleVisitOutcomeSubmit = (e) => {
    e.preventDefault();
    if (!selectedVisitForOutcome) return;

    const v = selectedVisitForOutcome;
    const { personMet, discussionNotes, leadFeedback, outcomeStatus, agreedValue } = visitOutcomeForm;

    const meetingSummary = `[Visited ${v.date || 'Today'}]: Spoke with ${personMet || v.person || 'Client Head'}. Discussion: ${discussionNotes || 'N/A'}. Lead said: ${leadFeedback || 'N/A'}`;

    if (outcomeStatus === "Won") {
      const newCustomer = {
        id: `cust_${Date.now()}`,
        name: v.customer || v.client || v.company || "Client Account",
        company: v.customer || v.client || v.company || "Client Account",
        person: personMet || v.person || v.contactPerson || "Contact Person",
        phone: v.phone || "",
        email: v.email || "",
        city: v.location || v.city || "Chennai",
        status: "Active",
        packageTier: "Enterprise Suite",
        reachOutReason: meetingSummary,
        accountManager: userName,
        onboardingRemarks: `Converted after site visit meeting by ${userName}.`,
        revenue: agreedValue || "₹4,50,000",
        lastVisit: formatDate(new Date()),
        onboardDate: formatDate(new Date()),
        remarksHistory: [{ date: "Just now", note: meetingSummary }]
      };

      try {
        const customers = JSON.parse(localStorage.getItem("tc_customer_accounts") || "[]");
        localStorage.setItem("tc_customer_accounts", JSON.stringify([newCustomer, ...customers]));

        const existingNotifs = JSON.parse(localStorage.getItem("tc_app_notifications") || "[]");
        const smNotif = {
          id: `notif_${Date.now()}`,
          recipientRole: "manager",
          title: `🎉 Deal Won & Converted by ${userName}`,
          message: `${userName} completed visit with "${newCustomer.name}" and converted deal to active Customer Account (${agreedValue})!`,
          time: "Just now",
          read: false,
          type: "Customer",
        };
        localStorage.setItem("tc_app_notifications", JSON.stringify([smNotif, ...existingNotifs]));
      } catch (err) { }

      const custId = newCustomer.id;

      // Persist customer in Supabase
      customerAPI.createCustomer({
        id: custId,
        name: newCustomer.name,
        person: newCustomer.person,
        phone: newCustomer.phone,
        email: newCustomer.email,
        city: newCustomer.city,
        notes: meetingSummary,
        leadId: v.leadId,
        leadNumber: v.leadNumber
      }).then((savedCust) => {
        const realId = savedCust?.customer_id || custId;
        setAllLeads((prev) =>
          prev.map((l) => (l.company === newCustomer.name || l.id === v.leadId
            ? { ...l, status: "Converted to Customer", customerId: realId, notes: meetingSummary }
            : l
          ))
        );
      }).catch(() => {
        setAllLeads((prev) =>
          prev.map((l) => (l.company === newCustomer.name || l.id === v.leadId
            ? { ...l, status: "Converted to Customer", customerId: custId, notes: meetingSummary }
            : l
          ))
        );
      });

      // Remove from visits list
      setVisitList((prev) => prev.filter((item) => item.id !== v.id));

      showToast(`🎉 Meeting Outcome Logged: Deal Won! ${newCustomer.name} converted to Customer Account!`, "success");
      setActiveTab("converted");
    } else if (outcomeStatus === "Lost") {
      const targetCompany = v.customer || v.client || v.company || "Client Account";

      setAllLeads((prev) => {
        const exists = prev.some((l) => l.company === targetCompany || l.id === v.leadId);
        if (exists) {
          return prev.map((l) =>
            l.company === targetCompany || l.id === v.leadId
              ? { ...l, category: "Cold", priority: "Low", status: "Cold Lead / Lost", notes: meetingSummary }
              : l
          );
        } else {
          const newColdLead = {
            id: v.leadId || `lead_${Date.now()}`,
            company: targetCompany,
            person: personMet || v.person || v.contactPerson || "Contact Person",
            phone: v.phone || "",
            email: v.email || "",
            city: v.location || v.city || "Chennai",
            category: "Cold",
            priority: "Low",
            status: "Cold Lead / Lost",
            assignedTo: userName,
            assignedToEmail: userEmail,
            notes: meetingSummary,
            createdAt: formatDate(new Date())
          };
          return [newColdLead, ...prev];
        }
      });

      try {
        const stored = JSON.parse(localStorage.getItem("tc_sm_leads") || "[]");
        const exists = stored.some((l) => l.company === targetCompany || l.id === v.leadId);
        let updated;
        if (exists) {
          updated = stored.map((l) =>
            l.company === targetCompany || l.id === v.leadId
              ? { ...l, category: "Cold", priority: "Low", status: "Cold Lead / Lost", notes: meetingSummary }
              : l
          );
        } else {
          const newColdLead = {
            id: v.leadId || `lead_${Date.now()}`,
            company: targetCompany,
            person: personMet || v.person || v.contactPerson || "Contact Person",
            phone: v.phone || "",
            email: v.email || "",
            city: v.location || v.city || "Chennai",
            category: "Cold",
            priority: "Low",
            status: "Cold Lead / Lost",
            assignedTo: userName,
            assignedToEmail: userEmail,
            notes: meetingSummary,
            createdAt: formatDate(new Date())
          };
          updated = [newColdLead, ...stored];
        }
        localStorage.setItem("tc_sm_leads", JSON.stringify(updated));
      } catch (e) { }

      setVisitList((prev) => prev.filter((item) => item.id !== v.id));
      try {
        const storedVisits = JSON.parse(localStorage.getItem("tc_sales_visits") || "[]");
        localStorage.setItem("tc_sales_visits", JSON.stringify(storedVisits.filter((item) => item.id !== v.id)));
      } catch (e) { }

      showToast(`❄️ Client "${targetCompany}" marked as Not Interested & moved to Leads tab under Cold category!`, "info");
      setActiveTab("leads");
    } else if (outcomeStatus === "Follow-up") {
      const newFollowup = {
        id: `flw_${Date.now()}`,
        leadId: v.leadId || `lead_${Date.now()}`,
        company: v.customer || v.client || "Client Account",
        person: personMet || v.person || "Contact Person",
        phone: v.phone || "",
        email: v.email || "",
        city: v.location || "Chennai",
        category: "Warm",
        scheduledDate: formatDate(new Date(Date.now() + 86400000)),
        scheduledTime: "11:00 AM",
        remark: meetingSummary,
        assignedTo: userName,
        assignedToEmail: userEmail,
        status: "Scheduled",
      };

      setFollowupsList((prev) => [newFollowup, ...prev]);
      setVisitList((prev) => prev.filter((item) => item.id !== v.id));
      showToast(`📞 Meeting Outcome Logged: Lead moved to Follow-ups tab for next discussion call!`, "success");
      setActiveTab("followups");
    } else {
      // Negotiation / Pending: Mark status as Completed and attach full meeting log
      setVisitList((prev) =>
        prev.map((item) =>
          item.id === v.id
            ? {
              ...item,
              status: "Completed",
              personMet,
              discussionNotes,
              leadFeedback,
              notes: meetingSummary
            }
            : item
        )
      );
      showToast(`✅ Visit Completed! Meeting outcome & negotiation remarks saved for ${v.customer || v.client}!`, "success");
    }

    setSelectedVisitForOutcome(null);
  };

  // ── Lead Filtering ────────────────────────────────────────────────────────
  // Deduplicate assigned leads by phone or company name so duplicate cards never appear
  const deduplicatedAssignedLeads = deduplicateLeadsList(myAssignedLeads);
  const openLeadsOnly = deduplicatedAssignedLeads.filter((l) => l.status !== "Converted to Customer" && l.status !== "Converted");
  const convertedLeadsOnly = deduplicatedAssignedLeads.filter((l) => l.status === "Converted to Customer" || l.status === "Converted");

  const filteredLeads = openLeadsOnly.filter((lead) => {
    const q = (search || "").toLowerCase();
    const matchesSearch =
      (lead.company || "").toLowerCase().includes(q) ||
      (lead.person || "").toLowerCase().includes(q) ||
      (lead.phone || "").includes(q) ||
      (lead.city || "").toLowerCase().includes(q) ||
      (lead.leadNumber || "").toLowerCase().includes(q) ||
      (lead.id || "").toString().toLowerCase().includes(q);

    const matchesCategory = categoryFilter === "All" || lead.category === categoryFilter;
    const matchesStatus = statusFilter === "All" || lead.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage) || 1;
  const paginatedLeads = filteredLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const filteredConvertedLeads = convertedLeadsOnly.filter((lead) => {
    const q = (search || "").toLowerCase();
    return (
      (lead.company || "").toLowerCase().includes(q) ||
      (lead.person || "").toLowerCase().includes(q) ||
      (lead.phone || "").includes(q) ||
      (lead.city || "").toLowerCase().includes(q) ||
      (lead.leadNumber || "").toLowerCase().includes(q) ||
      (lead.id || "").toString().toLowerCase().includes(q)
    );
  });

  const totalAssigned = myAssignedLeads.length;
  const hotCount = openLeadsOnly.filter((l) => l.category === "Hot").length;
  const warmCount = openLeadsOnly.filter((l) => l.category === "Warm").length;
  const coldCount = openLeadsOnly.filter((l) => l.category === "Cold").length;
  const convertedCount = convertedLeadsOnly.length;

  return (
    <div className="space-y-6 font-sans text-slate-900 min-w-0 w-full">

      {/* Top Header Row */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          Leads & Follow-Up Workspace
        </h1>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-teal-600/30 flex items-center gap-2 cursor-pointer transition transform hover:-translate-y-0.5"
        >
          <Plus size={18} /> Add New Lead
        </button>
      </div>

      {/* Sleek & Interactive Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total My Leads Card -> Shows ALL HOT, WARM, COLD leads in Tabular View */}
        <div
          onClick={() => {
            setActiveTab("leads");
            setCategoryFilter("All");
            setStatusFilter("All");
            showToast("Showing ALL (Hot, Warm, Cold) leads in tabular column view!", "info");
          }}
          className="bg-white rounded-2xl p-3 sm:p-3.5 shadow-xs border-2 border-blue-200 hover:border-blue-500 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-900 text-[10px] font-extrabold uppercase tracking-wider">Total My Leads</p>
              <h2 className="text-xl sm:text-2xl font-black text-blue-950 mt-0.5">{totalAssigned}</h2>
            </div>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <Users size={16} />
            </div>
          </div>
        </div>

        {/* Hot Leads Card */}
        <div
          onClick={() => {
            setActiveTab("leads");
            setCategoryFilter("Hot");
            showToast("Filtered by 🔥 Hot Leads!", "info");
          }}
          className="bg-rose-50/60 rounded-2xl p-3 sm:p-3.5 shadow-xs border-2 border-rose-200 hover:border-rose-500 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-rose-700 text-[10px] font-extrabold uppercase tracking-wider">🔥 My Hot Leads</p>
              <h2 className="text-xl sm:text-2xl font-black text-rose-700 mt-0.5">{hotCount}</h2>
            </div>
            <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <Flame size={16} />
            </div>
          </div>
        </div>

        {/* Warm Leads Card */}
        <div
          onClick={() => {
            setActiveTab("leads");
            setCategoryFilter("Warm");
            showToast("Filtered by ⚡ Warm Leads!", "info");
          }}
          className="bg-amber-50/60 rounded-2xl p-3 sm:p-3.5 shadow-xs border-2 border-amber-200 hover:border-amber-500 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-700 text-[10px] font-extrabold uppercase tracking-wider">⚡ My Warm Leads</p>
              <h2 className="text-xl sm:text-2xl font-black text-amber-700 mt-0.5">{warmCount}</h2>
            </div>
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <Zap size={16} />
            </div>
          </div>
        </div>

        {/* Cold Leads Card */}
        <div
          onClick={() => {
            setActiveTab("leads");
            setCategoryFilter("Cold");
            showToast("Filtered by ❄️ Cold Leads!", "info");
          }}
          className="bg-sky-50/60 rounded-2xl p-3 sm:p-3.5 shadow-xs border-2 border-sky-200 hover:border-sky-500 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sky-700 text-[10px] font-extrabold uppercase tracking-wider">❄️ My Cold Leads</p>
              <h2 className="text-xl sm:text-2xl font-black text-sky-700 mt-0.5">{coldCount}</h2>
            </div>
            <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <Zap size={16} />
            </div>
          </div>
        </div>

        {/* Converted Customers Card */}
        <div
          onClick={() => {
            setActiveTab("converted");
            showToast("Showing Converted Customer Accounts!", "info");
          }}
          className="bg-emerald-50/60 rounded-2xl p-3 sm:p-3.5 shadow-xs border-2 border-emerald-200 hover:border-emerald-500 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-700 text-[10px] font-extrabold uppercase tracking-wider">My Converted Customers</p>
              <h2 className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5">{convertedCount}</h2>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <UserCheck size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* ── TOGGLE TAB BAR INSIDE LEADS PAGE (Leads | Followups | Visits | Converted) ── */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-xs flex items-center overflow-x-auto">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab("leads")}
            className={`px-4 py-2 rounded-lg font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shrink-0 ${activeTab === "leads"
                ? "bg-teal-600 text-white shadow-md shadow-teal-600/30"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
          >
            <Building2 size={16} />
            <span>Leads</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("followups")}
            className={`px-4 py-2 rounded-lg font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shrink-0 ${activeTab === "followups"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
          >
            <Clock3 size={16} />
            <span>Followups ({myFollowups.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("visits")}
            className={`px-4 py-2 rounded-lg font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shrink-0 ${activeTab === "visits"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
          >
            <MapPin size={16} />
            <span>Visits ({myVisits.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("converted")}
            className={`px-4 py-2 rounded-lg font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shrink-0 ${activeTab === "converted"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
          >
            <UserCheck size={16} />
            <span>Converted ({convertedCount})</span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: MY ASSIGNED LEADS VIEW ──────────────────────────────────────── */}
      {activeTab === "leads" && (
        <div className="space-y-4">
          {/* Search, Filter & View Switcher Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Lead ID (LD-...), company, contact, city, phone..."
                className="w-full h-10 border border-slate-200 rounded-xl pl-9 pr-4 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-teal-500 bg-slate-50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2.5 flex-wrap text-xs sm:text-sm w-full sm:w-auto">
              <div className="flex-1 sm:flex-initial flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 font-bold">
                <Filter size={14} className="text-teal-600 shrink-0" />
                <span className="text-slate-400">Category:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer text-xs sm:text-sm"
                >
                  <option value="All">All Categories</option>
                  <option value="Hot">🔥 Hot Leads</option>
                  <option value="Warm">⚡ Warm Leads</option>
                  <option value="Cold">❄️ Cold Leads</option>
                  <option value="Other">🌐 Other Category</option>
                </select>
              </div>

              <div className="flex-1 sm:flex-initial flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 font-bold">
                <span className="text-slate-400">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer text-xs sm:text-sm"
                >
                  <option value="All">All Statuses</option>
                  <option value="New">New</option>
                  <option value="Moved to Follow-ups">In Follow-ups</option>
                  <option value="Follow-up / Visit Scheduled">In Visit / Follow-up</option>
                  <option value="Converted to Customer">Converted</option>
                  <option value="Not Converted / Lost">Not Converted</option>
                  <option value="Other">🌐 Other Status</option>
                </select>
              </div>

              {/* View Mode Toggle: Grid Cards vs Compact Table List */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 ml-auto">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${viewMode === "grid"
                      ? "bg-white text-teal-700 shadow-xs border border-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                    }`}
                  title="Grid Cards View"
                >
                  <LayoutGrid size={14} /> Cards
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${viewMode === "list"
                      ? "bg-white text-teal-700 shadow-xs border border-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                    }`}
                  title="Spacious Table List View"
                >
                  <List size={14} /> Table
                </button>
              </div>
            </div>
          </div>

          {/* Lead Content: Cards or Table List */}
          {filteredLeads.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-slate-400 font-semibold text-xs sm:text-sm border border-slate-200">
              No leads assigned or created match your search or filter.
            </div>
          ) : viewMode === "list" ? (
            /* ── VIEW MODE 2: SPACIOUS CLEAN TABLE VIEW ──────────────────── */
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden overflow-x-auto">
              <table className="w-full text-left font-semibold text-xs sm:text-sm text-slate-800">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Company & Contact</th>
                    <th className="py-3.5 px-4">Phone & Location</th>
                    <th className="py-3.5 px-4">Category & Priority</th>
                    <th className="py-3.5 px-4">Current Status</th>
                    <th className="py-3.5 px-4">Deal Value</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-black text-slate-900 text-sm truncate max-w-[200px]">{lead.company}</div>
                        <div className="text-xs text-slate-500 font-semibold truncate">{lead.person}</div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[10px] font-black text-violet-700 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-md tracking-wide">
                            🪪 {lead.leadNumber || lead.id?.toString().slice(0, 12).toUpperCase()}
                          </span>
                          {lead.customerId && (
                            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md tracking-wide">
                              🏢 {lead.customerId.toString().slice(0, 12).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 space-y-0.5 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                          <Phone size={13} className="text-blue-600 shrink-0" /> {lead.phone}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <MapPin size={13} className="text-red-500 shrink-0" /> {lead.city}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border ${lead.category === "Hot"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : lead.category === "Warm"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-sky-50 text-sky-700 border-sky-200"
                            }`}
                        >
                          {lead.category === "Hot" ? "🔥 Hot Lead" : lead.category === "Warm" ? "⚡ Warm Lead" : "❄️ Cold Lead"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs font-extrabold text-slate-700">● {lead.status}</span>
                      </td>
                      <td className="py-3.5 px-4 font-black text-emerald-600 text-sm">
                        {lead.value || "₹4,50,000"}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2 text-xs font-extrabold">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLead(lead);
                              setSeRemarkInput("");
                              setShowFollowupForm(false);
                            }}
                            className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 transition cursor-pointer"
                          >
                            <Eye size={14} /> Talk & Notes
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLead(lead);
                              setSeRemarkInput("");
                              setShowFollowupForm(false);
                            }}
                            className="py-1.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1 transition cursor-pointer shadow-xs"
                          >
                            <UserCheck size={14} /> Outcome
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* ── VIEW MODE 1: GRID CARDS VIEW ────────────────────────────── */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {paginatedLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:border-teal-500/50 hover:shadow-md transition p-5 sm:p-6 flex flex-col justify-between space-y-4 min-w-0"
                >
                  <div>
                    {/* Category & Priority Badge Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black border ${lead.status === "Converted to Customer"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : lead.category === "Hot"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : lead.category === "Warm"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-sky-50 text-sky-700 border-sky-200"
                            }`}
                        >
                          {lead.status === "Converted to Customer"
                            ? "🎉 Converted Customer"
                            : lead.category === "Hot"
                              ? "🔥 Hot Lead"
                              : lead.category === "Warm"
                                ? "⚡ Warm Lead"
                                : "❄️ Cold Lead"}
                        </span>

                        {lead.status === "Converted to Customer" ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold px-2.5 py-0.5 rounded-full">
                            Active Account
                          </span>
                        ) : (
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${lead.category === "Hot"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : lead.category === "Warm"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-sky-50 text-sky-700 border-sky-200"
                            }`}>
                            {lead.category === "Hot" ? "High Priority" : lead.category === "Warm" ? "Medium Priority" : "Low Priority"}
                          </span>
                        )}
                      </div>

                      <span className="text-xs sm:text-sm font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 shrink-0">
                        {lead.value || "₹4,50,000"}
                      </span>
                    </div>

                    <div className="mt-3.5">
                      <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">{lead.company}</h2>
                      <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5 truncate">{lead.person}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-lg tracking-wide">
                          🪪 Lead ID: {lead.leadNumber || lead.id?.toString().slice(0, 12).toUpperCase()}
                        </span>
                        {lead.customerId && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg tracking-wide">
                            🏢 Cust ID: {lead.customerId.toString().slice(0, 12).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 mt-3.5 text-xs sm:text-sm font-semibold text-slate-600">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>{lead.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="truncate">{lead.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                        <span>{lead.city}</span>
                      </div>
                    </div>

                    {/* Remarks / Notes */}
                    {lead.notes && (
                      <div className="mt-3.5 p-3 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs font-semibold text-amber-950 leading-relaxed">
                        <span className="text-[10px] sm:text-xs font-extrabold text-amber-800 block uppercase tracking-wider mb-0.5">
                          Remarks / Notes:
                        </span>
                        {lead.notes}
                      </div>
                    )}
                  </div>

                  {/* Bottom Actions */}
                  <div className="pt-3.5 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${lead.status === 'Converted to Customer'
                          ? 'bg-emerald-100 text-emerald-800'
                          : lead.status === 'Not Converted / Lost'
                            ? 'bg-rose-100 text-rose-800'
                            : lead.status === 'Moved to Follow-ups'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}>
                        ● {lead.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm font-bold">
                      <button
                        onClick={() => {
                          setSelectedLead(lead);
                          setSeRemarkInput("");
                          setShowFollowupForm(false);
                        }}
                        className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Eye size={15} /> Talk & Log Notes
                      </button>

                      {lead.status !== "Converted to Customer" ? (
                        <button
                          onClick={() => {
                            setSelectedLead(lead);
                            setSeRemarkInput("");
                            setShowFollowupForm(false);
                          }}
                          className="py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                        >
                          <UserCheck size={15} /> Outcome Actions
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate("/sales/customers")}
                          className="py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <UserCheck size={15} /> View Customer Page
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── PAGINATION CONTROLS BAR (MAX 10 PER PAGE) ────────────────────── */}
          {filteredLeads.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs font-extrabold text-slate-600">
              <div>
                Showing <span className="text-slate-900 font-black">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                <span className="text-slate-900 font-black">{Math.min(currentPage * itemsPerPage, filteredLeads.length)}</span> of{" "}
                <span className="text-teal-700 font-black">{filteredLeads.length}</span> total leads
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-black text-xs flex items-center gap-1 transition cursor-pointer"
                >
                  <ChevronLeft size={16} /> Prev
                </button>

                <span className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-black text-xs">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-black text-xs flex items-center gap-1 transition cursor-pointer"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: SCHEDULED FOLLOW-UPS TOGGLE VIEW ─────────────────────────────── */}
      {activeTab === "followups" && (
        <div className="space-y-5">
          <div className="bg-purple-50/80 border border-purple-200 rounded-3xl p-5 sm:p-6 space-y-2">
            <h2 className="text-base sm:text-lg font-black text-purple-950 flex items-center gap-2">
              <Clock3 className="w-5 h-5 text-purple-600" /> Scheduled Follow-Up Calls
            </h2>
            <p className="text-xs sm:text-sm font-medium text-purple-900">
              Review your scheduled call appointments. After talking with the client on the follow-up call, move them directly to the <strong>Visit Page</strong> or <strong>Customer Page</strong> below.
            </p>
          </div>

          {myFollowups.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center text-slate-400 font-semibold text-xs sm:text-sm border border-slate-200">
              No follow-ups currently scheduled. Move a lead to follow-ups from the Assigned Leads tab above.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {myFollowups.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl border border-purple-200 shadow-sm hover:shadow-md transition p-5 sm:p-6 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-800 border border-purple-200">
                          📞 Follow-up Call
                        </span>
                        <h2 className="text-lg font-black text-slate-900 mt-2">{item.company}</h2>
                        <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">{item.person}</p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-xl block">
                          📅 {item.scheduledDate}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500 mt-1 block">
                          ⏰ {item.scheduledTime || "02:30 PM"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs sm:text-sm font-semibold text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>{item.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                        <span>{item.city}</span>
                      </div>
                    </div>

                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-medium text-amber-950">
                      <span className="text-[10px] font-extrabold text-amber-900 uppercase block mb-0.5">
                        Follow-Up Call Notes / Remarks:
                      </span>
                      {item.remark || "Client requested follow-up discussion regarding pricing and package terms."}
                    </div>
                  </div>

                  {/* FIVE POST FOLLOW-UP CALL OUTCOME ACTIONS */}
                  <div className="pt-3.5 border-t border-purple-100 space-y-2.5">
                    <span className="text-[11px] font-black text-purple-900 uppercase tracking-wider block">
                      Post Follow-Up Call Outcome Actions (Classify or Move):
                    </span>

                    {/* Row 1: Classify Interest Level */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleClassifyFollowupToCategory(item, "Hot")}
                        className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Flame size={14} /> Move to Hot Lead
                      </button>

                      <button
                        type="button"
                        onClick={() => handleClassifyFollowupToCategory(item, "Warm")}
                        className="py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Zap size={14} /> Move to Warm Lead
                      </button>

                      <button
                        type="button"
                        onClick={() => handleClassifyFollowupToCategory(item, "Cold")}
                        className="py-2.5 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Snowflake size={14} /> Move to Cold Lead
                      </button>
                    </div>

                    {/* Row 2: Move to Visit or Convert to Customer */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-extrabold">
                      <button
                        type="button"
                        onClick={() => {
                          handleMoveFollowupToVisit(item);
                          setActiveTab("visits");
                        }}
                        className="py-2.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                      >
                        <CalendarPlus size={15} /> Move to Visit Tab 📅
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleMoveFollowupToCustomer(item);
                          setActiveTab("converted");
                        }}
                        className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                      >
                        <UserPlus size={15} /> Move to Customer 🎉
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: SITE VISITS TOGGLE VIEW ─────────────────────────────── */}
      {activeTab === "visits" && (
        <div className="space-y-5">
          <div className="bg-blue-50/80 border border-blue-200 rounded-3xl p-5 sm:p-6 space-y-2">
            <h2 className="text-base sm:text-lg font-black text-blue-950 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" /> Scheduled Site Visits
            </h2>
            <p className="text-xs sm:text-sm font-medium text-blue-900">
              Track client meetings & site demos scheduled from lead outcome actions or follow-up calls.
            </p>
          </div>

          {myVisits.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center text-slate-400 font-semibold text-xs sm:text-sm border border-slate-200">
              No site visits currently scheduled. Click "Move to Visit Page" on any lead or follow-up call to see it here!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {myVisits.map((v) => (
                <div
                  key={v.id}
                  className="bg-white rounded-3xl border border-blue-200 shadow-xs hover:border-blue-500/50 hover:shadow-md transition p-5 sm:p-6 flex flex-col justify-between space-y-4 min-w-0"
                >
                  <div className="space-y-3.5">
                    {/* Header Row: Status Badge & Visit Requested Timing */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${v.status === "Completed"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : v.status === "Checked In"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                      >
                        {v.status === "Completed" ? "✅ Visit Completed" : v.status === "Checked In" ? "📍 Checked In Live" : "📅 Scheduled Visit"}
                      </span>

                      <span className="text-xs font-black text-blue-800 bg-blue-50 border border-blue-200 px-3 py-1 rounded-xl flex items-center gap-1.5">
                        <Clock size={13} className="text-blue-600 shrink-0" />
                        <span>Visit Timing: {v.date || v.scheduledDate || "Today"} @ {v.time || v.scheduledTime || "10:00 AM"}</span>
                      </span>
                    </div>

                    {/* Client & Point of Contact */}
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">
                        🏢 {v.customer || v.client || v.company || "Client Account"}
                      </h2>
                      {(v.person || v.contactPerson || v.contact) && (
                        <p className="text-xs sm:text-sm font-bold text-slate-600 mt-1 flex items-center gap-1.5">
                          <User size={14} className="text-teal-600 shrink-0" />
                          <span>Contact Person: {v.person || v.contactPerson || v.contact}</span>
                        </p>
                      )}
                    </div>

                    {/* Location, Purpose, Phone & Email Grid */}
                    <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80 space-y-2 text-xs sm:text-sm font-semibold text-slate-700">
                      <div className="flex items-start gap-2">
                        <MapPin size={15} className="text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-slate-400 font-extrabold text-[11px] uppercase tracking-wider block">Visit Location Address:</span>
                          <span className="font-bold text-slate-900">{v.location || v.address || v.city || "Client Site / Chennai Office"}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 pt-1 border-t border-slate-200/60">
                        <Clock3 size={15} className="text-teal-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-slate-400 font-extrabold text-[11px] uppercase tracking-wider block">Purpose of Visit:</span>
                          <span className="font-bold text-slate-800">{v.purpose || "Product Demo & Pricing Negotiation"}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 pt-1 border-t border-slate-200/60 text-xs">
                        {v.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone size={13} className="text-teal-600 shrink-0" />
                            <span className="font-bold text-slate-800">{v.phone}</span>
                          </div>
                        )}
                        {v.email && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Mail size={13} className="text-teal-600 shrink-0" />
                            <span className="font-bold text-slate-800 truncate">{v.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Remarks / Notes Section */}
                    {(v.notes || v.remark) && (
                      <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs">
                        <p className="font-extrabold text-amber-900 uppercase tracking-wider text-[10px]">REMARKS / VISIT NOTES:</p>
                        <p className="text-slate-800 font-semibold mt-1 leading-relaxed">{v.notes || v.remark}</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedVisitForOutcome(v);
                        setVisitOutcomeForm({
                          personMet: v.personMet || v.person || v.contactPerson || v.contact || "",
                          discussionNotes: v.discussionNotes || "",
                          leadFeedback: v.leadFeedback || "",
                          outcomeStatus: "Won",
                          agreedValue: v.value || "₹4,50,000",
                        });
                      }}
                      className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs ${v.status === "Completed"
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                    >
                      <CheckCircle2 size={15} /> {v.status === "Completed" ? "✅ Visit Completed (View Log)" : "Log Meeting Outcome & Remarks 📝"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMoveFollowupToCustomer(v)}
                      className="py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <UserPlus size={15} /> Convert to Customer 🎉
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: CONVERTED CLIENTS TOGGLE VIEW ─────────────────────────────── */}
      {activeTab === "converted" && (
        <div className="space-y-5">
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-3xl p-5 sm:p-6 space-y-2">
            <h2 className="text-base sm:text-lg font-black text-emerald-950 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" /> Converted Customer Accounts
            </h2>
            <p className="text-xs sm:text-sm font-medium text-emerald-900">
              Clients successfully converted into active accounts by you or transferred from follow-up outcomes.
            </p>
          </div>

          {filteredConvertedLeads.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center text-slate-400 font-semibold text-xs sm:text-sm border border-slate-200">
              No converted customer accounts yet. Convert open leads or follow-up calls to see them here!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredConvertedLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="bg-white rounded-3xl border border-emerald-200 shadow-xs hover:border-emerald-500/50 hover:shadow-md transition p-5 sm:p-6 flex flex-col justify-between space-y-4 min-w-0"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        🎉 Converted Customer
                      </span>
                      <span className="text-xs sm:text-sm font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 shrink-0">
                        {lead.value || "₹4,50,000"}
                      </span>
                    </div>

                    <div className="mt-3.5">
                      <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">{lead.company}</h2>
                      <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5 truncate">{lead.person}</p>
                    </div>

                    <div className="space-y-2 mt-3.5 text-xs sm:text-sm font-semibold text-slate-600">
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-teal-600 shrink-0" />
                        <span className="truncate">{lead.phone || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-teal-600 shrink-0" />
                        <span className="truncate">{lead.email || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-teal-600 shrink-0" />
                        <span className="truncate">{lead.city || "Chennai"}</span>
                      </div>
                    </div>

                    {lead.notes && (
                      <div className="mt-4 p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs">
                        <p className="font-extrabold text-amber-900 uppercase tracking-wider text-[10px]">Remarks / Notes:</p>
                        <p className="text-slate-800 font-semibold mt-1 line-clamp-2">{lead.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => navigate("/sales/customers")}
                      className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                    >
                      <UserCheck size={16} /> View Full Customer Profile
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── POST-VISIT MEETING OUTCOME & REMARKS LOG MODAL ────────────────── */}
      {selectedVisitForOutcome && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5.5 h-5.5 text-blue-600" /> Log Post-Visit Meeting Outcome
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-blue-600 mt-0.5">
                  Client: {selectedVisitForOutcome.customer || selectedVisitForOutcome.client || "Client Account"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedVisitForOutcome(null)}
                className="p-2 rounded-2xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleVisitOutcomeSubmit} className="space-y-4 text-xs sm:text-sm font-semibold">
              <div>
                <label className="text-slate-800 font-extrabold block mb-1.5">
                  👤 Who did you meet / speak with? (*Required)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. John David (Managing Director / IT Head)"
                  value={visitOutcomeForm.personMet}
                  onChange={(e) => setVisitOutcomeForm({ ...visitOutcomeForm, personMet: e.target.value })}
                  className="w-full border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-slate-900 focus:outline-none focus:border-blue-500 font-semibold text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="text-slate-800 font-extrabold block mb-1.5">
                  💬 Meeting Discussion / What was discussed? (*Required)
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Discussed software demo, GPS tracking requirements for 50 field staff, commercial pricing & contract terms."
                  value={visitOutcomeForm.discussionNotes}
                  onChange={(e) => setVisitOutcomeForm({ ...visitOutcomeForm, discussionNotes: e.target.value })}
                  className="w-full border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-slate-900 focus:outline-none focus:border-blue-500 font-semibold text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="text-slate-800 font-extrabold block mb-1.5">
                  🗣️ Lead / Client Feedback - What did they say? (*Required)
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Client satisfied with demo, agreed to sign contract on Monday, requested monthly CSV report feature."
                  value={visitOutcomeForm.leadFeedback}
                  onChange={(e) => setVisitOutcomeForm({ ...visitOutcomeForm, leadFeedback: e.target.value })}
                  className="w-full border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-slate-900 focus:outline-none focus:border-blue-500 font-semibold text-xs sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-800 font-extrabold block mb-1.5">
                    🎯 Final Visit Outcome Decision
                  </label>
                  <select
                    value={visitOutcomeForm.outcomeStatus}
                    onChange={(e) => setVisitOutcomeForm({ ...visitOutcomeForm, outcomeStatus: e.target.value })}
                    className="w-full border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-slate-900 focus:outline-none focus:border-blue-500 font-extrabold text-xs sm:text-sm cursor-pointer"
                  >
                    <option value="Won">🎉 Deal Won - Move to Active Customer</option>
                    <option value="Negotiation">🤝 Negotiation / Proposal Under Review</option>
                    <option value="Follow-up">📞 Needs Another Follow-up Call</option>
                    <option value="Lost">❌ Deal Lost / Not Interested</option>
                  </select>
                </div>

                {visitOutcomeForm.outcomeStatus === "Won" && (
                  <div>
                    <label className="text-slate-800 font-extrabold block mb-1.5">
                      💰 Deal Value / Contract Amount
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ₹4,50,000"
                      value={visitOutcomeForm.agreedValue}
                      onChange={(e) => setVisitOutcomeForm({ ...visitOutcomeForm, agreedValue: e.target.value })}
                      className="w-full border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-slate-900 focus:outline-none focus:border-blue-500 font-extrabold text-xs sm:text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-600/30 transition cursor-pointer"
                >
                  Submit Visit Meeting Log & Process Outcome 🚀
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SPACIOUS ADD NEW LEAD MODAL (SE Sourced Lead Entry) ────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-teal-600" /> Create / Add New Prospect Lead
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-teal-600 mt-0.5">Sourced by {userName}</p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-2xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddLeadSubmit} className="space-y-5 text-xs sm:text-sm font-semibold">
              {/* Optional: Pick Researched Opportunity to Auto-fill */}
              <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 space-y-2">
                <label className="text-indigo-950 font-black text-xs uppercase tracking-wider flex items-center justify-between">
                  <span>🎯 Select Researched Opportunity Prospect (Auto-Fill Details)</span>
                  <span className="text-[10px] font-bold text-indigo-700">Optional</span>
                </label>
                <select
                  onChange={(e) => {
                    const oppId = e.target.value;
                    if (!oppId) return;
                    try {
                      const opps = JSON.parse(localStorage.getItem("tc_sales_opportunities") || "[]");
                      const found = opps.find((o) => o.id === oppId || o.leadId === oppId);
                      if (found) {
                        setAddForm((prev) => ({
                          ...prev,
                          company: found.customer || found.company || prev.company,
                          product: found.productRequirement || prev.product,
                          person: found.contactPerson || found.person || prev.person,
                          phone: found.phone || prev.phone,
                          city: found.address || found.location || found.city || prev.city,
                          source: found.source || prev.source,
                          notes: found.remarks || found.notes || prev.notes,
                        }));
                        showToast(`✨ Auto-filled details from "${found.customer}"!`, "success");
                      }
                    } catch (err) { }
                  }}
                  className="w-full h-10 border border-indigo-300 rounded-xl px-3 bg-white text-slate-900 font-extrabold text-xs focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="">-- Choose Opportunity Prospect from Research List --</option>
                  {(() => {
                    try {
                      const opps = JSON.parse(localStorage.getItem("tc_sales_opportunities") || "[]");
                      return opps.map((o) => (
                        <option key={o.id} value={o.id}>
                          🏢 {o.customer} ({o.location || o.address || 'Site'}) - Sourced: {o.source || 'SE Research'}
                        </option>
                      ));
                    } catch (e) {
                      return null;
                    }
                  })()}
                </select>
              </div>

              {/* Company Name & Product Requirement Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-800 font-extrabold block mb-1.5">Company / Lead Name (*Required)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Feathers Software Solution"
                    value={addForm.company}
                    onChange={(e) => setAddForm({ ...addForm, company: e.target.value })}
                    className="w-full border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white font-semibold text-sm transition"
                  />
                </div>

                <div>
                  <label className="text-slate-800 font-extrabold block mb-1.5">Product / Service Needed (*Why reached out)</label>
                  <input
                    type="text"
                    placeholder="e.g. Field GPS Tracking App, Sales CRM"
                    value={addForm.product}
                    onChange={(e) => setAddForm({ ...addForm, product: e.target.value })}
                    className="w-full border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white font-semibold text-sm transition"
                  />
                </div>
              </div>

              {/* Point of Contact & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-800 font-extrabold block mb-1.5">Point of Contact Person (*Required)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh Kumar (Managing Director)"
                    value={addForm.person}
                    onChange={(e) => setAddForm({ ...addForm, person: e.target.value })}
                    className="w-full border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white font-semibold text-sm transition"
                  />
                </div>

                <div>
                  <label className="text-slate-800 font-extrabold block mb-1.5">Phone Number (*Required)</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 9876543210"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    className="w-full border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white font-semibold text-sm transition"
                  />
                </div>
              </div>

              {/* Email & City Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-800 font-extrabold block mb-1.5">Email Address</label>
                  <input
                    type="email"
                    placeholder="contact@company.com"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white font-semibold text-sm transition"
                  />
                </div>

                <div>
                  <label className="text-slate-800 font-extrabold block mb-1.5">Address / City Details</label>
                  <input
                    type="text"
                    placeholder="e.g. Guindy Industrial Estate, Chennai"
                    value={addForm.city}
                    onChange={(e) => setAddForm({ ...addForm, city: e.target.value })}
                    className="w-full border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white font-semibold text-sm transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-800 font-extrabold block mb-1.5">Remarks / SE Research Notes</label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Client needs multi-device GPS tracking software for 30 field executives & automated visit reports..."
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  className="w-full border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white font-medium text-sm transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="text-slate-800 font-extrabold block mb-1.5">Lead Category</label>
                  <select
                    value={addForm.category}
                    onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                    className="w-full border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white font-extrabold text-sm cursor-pointer transition"
                  >
                    <option value="Hot">🔥 HOT Lead</option>
                    <option value="Warm">⚡ WARM Lead</option>
                    <option value="Cold">❄️ COLD Lead</option>
                    <option value="Other">🌐 Other Category</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-800 font-extrabold block mb-1.5">Deal Value (INR)</label>
                  <input
                    type="text"
                    placeholder="₹4,50,000"
                    value={addForm.value}
                    onChange={(e) => setAddForm({ ...addForm, value: e.target.value })}
                    className="w-full border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white font-extrabold text-sm transition"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-extrabold text-xs sm:text-sm shadow-md shadow-teal-600/30 transition cursor-pointer"
                >
                  Create & Save Lead 🎉
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TALK, CLASSIFY CATEGORY & OUTCOME ACTIONS MODAL ────────────────── */}
      {selectedLead && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-5 shadow-2xl my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900">{selectedLead.company}</h3>
                <p className="text-xs sm:text-sm font-semibold text-teal-700 mt-0.5">Assigned / Created by {selectedLead.assignedTo}</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedLead(null);
                  setShowFollowupForm(false);
                }}
                className="p-2 rounded-2xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm font-medium text-slate-700">
              {/* Dynamic Lead Interest Category Classifier (HOT, WARM, COLD) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
                  UPDATE LEAD CLASSIFICATION (Based on Call Interest)
                </span>
                <div className="grid grid-cols-3 gap-2 text-xs font-extrabold">
                  <button
                    type="button"
                    onClick={() => handleChangeCategory(selectedLead.id, "Hot")}
                    className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1 transition ${selectedLead.category === "Hot"
                        ? "bg-rose-500 text-white border-rose-600 shadow-xs"
                        : "bg-white text-rose-700 border-rose-200 hover:bg-rose-50"
                      }`}
                  >
                    🔥 HOT Lead
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeCategory(selectedLead.id, "Warm")}
                    className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1 transition ${selectedLead.category === "Warm"
                        ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                        : "bg-white text-amber-700 border-amber-200 hover:bg-amber-50"
                      }`}
                  >
                    ⚡ WARM Lead
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeCategory(selectedLead.id, "Cold")}
                    className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1 transition ${selectedLead.category === "Cold"
                        ? "bg-sky-500 text-white border-sky-600 shadow-xs"
                        : "bg-white text-sky-700 border-sky-200 hover:bg-sky-50"
                      }`}
                  >
                    ❄️ COLD Lead
                  </button>
                </div>
              </div>

              {/* Remarks / Discussion Notes Box */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
                <span className="text-xs font-extrabold text-amber-900 uppercase tracking-wider block">
                  REMARKS / HANDOVER NOTES
                </span>
                <p className="text-xs sm:text-sm text-amber-950 font-bold leading-relaxed">
                  {selectedLead.notes || "No prior discussion remarks logged."}
                </p>
              </div>

              {/* Lead Details */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs sm:text-sm font-semibold text-slate-700">
                <p><strong className="text-slate-900">Lead Code:</strong> <span className="text-violet-700 font-extrabold bg-violet-50 px-2 py-0.5 rounded border border-violet-200">{selectedLead.leadNumber || `LD-${String(selectedLead.id || '').slice(0, 8).toUpperCase()}`}</span></p>
                <p><strong className="text-slate-900">Contact Person:</strong> {selectedLead.person}</p>
                <p><strong className="text-slate-900">Phone:</strong> {selectedLead.phone}</p>
                <p><strong className="text-slate-900">Email:</strong> {selectedLead.email}</p>
                <p><strong className="text-slate-900">City / Location:</strong> {selectedLead.city}</p>
                <p><strong className="text-slate-900">Estimated Deal Value:</strong> <span className="text-emerald-600 font-extrabold">{selectedLead.value || "₹4,50,000"}</span></p>
              </div>

              {/* Lifecycle Timeline History Viewer Button */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-indigo-900 block">📜 Full Activity Lifecycle Audit Trail</span>
                  <span className="text-[11px] text-indigo-700 font-semibold">View call dates, stage changes, visit outcomes & deal history.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTimelineModal(selectedLead)}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-xs transition cursor-pointer"
                >
                  View Lifecycle 🕒
                </button>
              </div>

              {/* Call Remark Input */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-1">
                  <MessageSquare size={15} className="text-teal-600" /> Log Executive Call Remark / Interaction Note
                </label>
                <textarea
                  rows="3"
                  placeholder="e.g. Client requested callback tomorrow afternoon / agreed on pricing terms..."
                  value={seRemarkInput}
                  onChange={(e) => setSeRemarkInput(e.target.value)}
                  className="w-full border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white font-medium text-xs sm:text-sm transition"
                />
              </div>

              {/* Followup scheduling form expansion */}
              {showFollowupForm && (
                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-3 animate-fadeIn">
                  <span className="text-xs font-black text-purple-900 uppercase tracking-wider block">
                    📅 Select Schedule Date & Time for Follow-up Call:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold">
                    <div>
                      <label className="text-purple-900 font-bold block mb-1">Follow-up Date</label>
                      <input
                        type="date"
                        required
                        value={followupDate}
                        onChange={(e) => setFollowupDate(e.target.value)}
                        className="w-full border border-purple-200 rounded-xl p-2.5 bg-white text-slate-900 font-extrabold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-purple-900 font-bold block mb-1">Preferred Call Time</label>
                      <select
                        value={followupTime}
                        onChange={(e) => setFollowupTime(e.target.value)}
                        className="w-full border border-purple-200 rounded-xl p-2.5 bg-white text-slate-900 font-extrabold focus:outline-none"
                      >
                        <option value="10:00 AM">10:00 AM (Morning)</option>
                        <option value="11:30 AM">11:30 AM (Late Morning)</option>
                        <option value="02:30 PM">02:30 PM (Afternoon)</option>
                        <option value="04:30 PM">04:30 PM (Evening)</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleScheduleFollowup(selectedLead)}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    Confirm & Schedule Follow-up Call 📞
                  </button>
                </div>
              )}

              {/* 4 LEAD OUTCOME ACTIONS */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                  LEAD OUTCOME ACTIONS (4 OPTIONS):
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm font-extrabold">
                  {/* Action 1: Convert Customer */}
                  <button
                    type="button"
                    onClick={() => {
                      const custId = `cust_${Date.now()}`;
                      const newCustomer = {
                        id: custId,
                        leadId: selectedLead.id,
                        leadNumber: selectedLead.leadNumber || selectedLead.id?.toString().slice(0, 12).toUpperCase(),
                        name: selectedLead.company,
                        company: selectedLead.company,
                        contactPerson: selectedLead.person,
                        phone: selectedLead.phone,
                        email: selectedLead.email,
                        city: selectedLead.city,
                        status: "Active Customer",
                        packageTier: "Enterprise Plan",
                        reachOutReason: selectedLead.notes || "Converted lead account.",
                        accountManager: userName,
                        onboardingRemarks: seRemarkInput.trim() || `Converted by ${userName}`,
                        contractValue: selectedLead.value || "₹4,50,000",
                      };

                      try {
                        const customers = JSON.parse(localStorage.getItem("tc_customer_accounts") || "[]");
                        localStorage.setItem("tc_customer_accounts", JSON.stringify([newCustomer, ...customers]));

                        const notifs = JSON.parse(localStorage.getItem("tc_app_notifications") || "[]");
                        const smNotif = {
                          id: `notif_${Date.now()}`,
                          recipientRole: "manager",
                          title: `🎉 Lead Converted by ${userName}`,
                          message: `${userName} converted lead "${selectedLead.company}" into an active Customer Account!`,
                          time: "Just now",
                          read: false,
                          type: "Customer",
                        };
                        localStorage.setItem("tc_app_notifications", JSON.stringify([smNotif, ...notifs]));
                      } catch (e) { }

                      // Persist in Supabase
                      customerAPI.createCustomer({
                        id: custId,
                        name: selectedLead.company,
                        person: selectedLead.person,
                        phone: selectedLead.phone,
                        email: selectedLead.email,
                        city: selectedLead.city,
                        notes: selectedLead.notes
                      }).then((savedCust) => {
                        const realId = savedCust?.customer_id || custId;
                        setAllLeads((prev) =>
                          prev.map((l) => l.id === selectedLead.id
                            ? { ...l, status: "Converted to Customer", customerId: realId }
                            : l
                          )
                        );
                      }).catch(() => {
                        setAllLeads((prev) =>
                          prev.map((l) => l.id === selectedLead.id
                            ? { ...l, status: "Converted to Customer", customerId: custId }
                            : l
                          )
                        );
                      });

                      setSelectedLead(null);
                      showToast(`🎉 "${selectedLead.company}" converted to Customer Account!`, "success");
                      setTimeout(() => navigate("/sales/customers"), 600);
                    }}
                    className="py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                  >
                    <UserCheck size={18} /> Convert Customer 🎉
                  </button>

                  {/* Action 2: Move to Follow-ups */}
                  <button
                    type="button"
                    onClick={() => setShowFollowupForm(!showFollowupForm)}
                    className="py-3.5 px-4 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <PhoneCall size={18} /> Move to Follow-ups 📞
                  </button>

                  {/* Action 3: Schedule Visit */}
                  <button
                    type="button"
                    onClick={() => {
                      const newVisit = {
                        id: `vst_${Date.now()}`,
                        customerName: selectedLead.company,
                        clientName: selectedLead.company,
                        contactPerson: selectedLead.person,
                        phone: selectedLead.phone,
                        location: selectedLead.city,
                        visitDate: formatDate(new Date()),
                        status: "Scheduled",
                        purpose: "Site Visit / Product Demo",
                        remark: seRemarkInput.trim() || "Visit scheduled from Lead outcome.",
                        executiveName: userName,
                        assignedToEmail: userEmail,
                      };

                      try {
                        const visits = JSON.parse(localStorage.getItem("tc_sales_visits") || "[]");
                        localStorage.setItem("tc_sales_visits", JSON.stringify([newVisit, ...visits]));
                      } catch (e) { }

                      setAllLeads((prev) =>
                        prev.map((l) => (l.id === selectedLead.id ? { ...l, status: "Follow-up / Visit Scheduled" } : l))
                      );

                      setSelectedLead(null);
                      showToast(`📅 Site Visit scheduled for "${selectedLead.company}"!`, "success");
                      setTimeout(() => navigate("/sales/visits"), 600);
                    }}
                    className="py-3.5 px-4 rounded-2xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-300 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Calendar size={18} /> Schedule Visit 📅
                  </button>

                  {/* Action 4: Mark Lost */}
                  <button
                    type="button"
                    onClick={() => {
                      setAllLeads((prev) =>
                        prev.map((l) => (l.id === selectedLead.id ? { ...l, status: "Not Converted / Lost" } : l))
                      );
                      setSelectedLead(null);
                      showToast(`Lead marked as Not Converted / Lost.`, "info");
                    }}
                    className="py-3.5 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <XCircle size={18} /> Mark Lost ❌
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── FULL LEAD LIFECYCLE AUDIT TRAIL TIMELINE MODAL ────────────────── */}
      {showTimelineModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-auto max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900">{showTimelineModal.company}</h3>
                  <span className="text-[10px] font-black text-violet-700 bg-violet-100 px-2 py-0.5 rounded border border-violet-200">
                    {showTimelineModal.leadNumber || `LD-${String(showTimelineModal.id || '').slice(0, 8).toUpperCase()}`}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-500 mt-0.5">
                  Contact: {showTimelineModal.person} · {showTimelineModal.phone} · {showTimelineModal.city}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowTimelineModal(null)}
                className="p-2 rounded-2xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Lifecycle Summary Banner */}
            <div className="bg-gradient-to-r from-teal-500 via-indigo-600 to-purple-600 rounded-2xl p-4 text-white shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-black tracking-wider opacity-80 block">Current Status</span>
                <span className="text-base font-black flex items-center gap-1.5 mt-0.5">
                  {showTimelineModal.status === "Converted to Customer" ? "🎉 Active Customer Account" : showTimelineModal.status}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-black tracking-wider opacity-80 block">Estimated Value</span>
                <span className="text-base font-black">{showTimelineModal.value || "₹4,50,000"}</span>
              </div>
            </div>

            {/* Complete Timeline Steps List */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                📜 Complete Activity Timeline & Audit Log History
              </h4>

              <div className="relative border-l-2 border-indigo-200 ml-4 pl-6 space-y-6">
                {/* Step 1: Lead Creation */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center text-[10px] font-black shadow-xs">
                    1
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-xs font-black text-slate-900">
                      <span>🆕 Prospect Lead Created & Sourced</span>
                      <span className="text-[11px] text-slate-500">{showTimelineModal.createdAt || "Initial Date"}</span>
                    </div>
                    <p className="text-xs text-slate-600 font-semibold">
                      Sourced & assigned to <strong className="text-slate-800">{showTimelineModal.assignedTo || userName}</strong>. Source: {showTimelineModal.source || "Direct Sourcing"}.
                    </p>
                    {showTimelineModal.notes && (
                      <p className="text-xs text-amber-900 bg-amber-50 p-2 rounded-xl border border-amber-200 font-medium mt-1">
                        Remarks: {showTimelineModal.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Step 2: Follow-up Call Activity */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-[10px] font-black shadow-xs">
                    2
                  </div>
                  <div className="bg-purple-50/70 rounded-2xl p-3.5 border border-purple-200 space-y-1">
                    <div className="flex items-center justify-between text-xs font-black text-purple-950">
                      <span>📞 Follow-up Interaction Call Logged</span>
                      <span className="text-[11px] text-purple-700">Scheduled & Completed</span>
                    </div>
                    <p className="text-xs text-purple-900 font-semibold">
                      Executive call completed. Client category updated to <strong className="text-purple-950">{showTimelineModal.category || "Warm"} Lead</strong>.
                    </p>
                  </div>
                </div>

                {/* Step 3: Site Visit Activity */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-black shadow-xs">
                    3
                  </div>
                  <div className="bg-blue-50/70 rounded-2xl p-3.5 border border-blue-200 space-y-1">
                    <div className="flex items-center justify-between text-xs font-black text-blue-950">
                      <span>📍 Client Site Visit & Product Demo</span>
                      <span className="text-[11px] text-blue-700">Site Visit Conducted</span>
                    </div>
                    <p className="text-xs text-blue-900 font-semibold">
                      Conducted site visit at <strong className="text-blue-950">{showTimelineModal.city}</strong>. Meeting outcome logged with contact person <strong className="text-blue-950">{showTimelineModal.person}</strong>.
                    </p>
                  </div>
                </div>

                {/* Step 4: Final Deal Outcome */}
                <div className="relative">
                  <div className={`absolute -left-[31px] top-0 w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] font-black shadow-xs ${showTimelineModal.status === "Converted to Customer" ? "bg-emerald-500" : showTimelineModal.status === "Not Converted / Lost" ? "bg-rose-500" : "bg-indigo-500"
                    }`}>
                    4
                  </div>
                  <div className={`rounded-2xl p-3.5 border space-y-1 ${showTimelineModal.status === "Converted to Customer" ? "bg-emerald-50 border-emerald-200 text-emerald-950" : showTimelineModal.status === "Not Converted / Lost" ? "bg-rose-50 border-rose-200 text-rose-950" : "bg-indigo-50 border-indigo-200 text-indigo-950"
                    }`}>
                    <div className="flex items-center justify-between text-xs font-black">
                      <span>
                        {showTimelineModal.status === "Converted to Customer" ? "🎉 Deal Won & Converted to Customer" : showTimelineModal.status === "Not Converted / Lost" ? "❌ Deal Closed (Not Converted)" : "💼 Active Negotiation & Proposal Phase"}
                      </span>
                      <span className="text-[11px]">Current Outcome</span>
                    </div>
                    <p className="text-xs font-semibold">
                      {showTimelineModal.status === "Converted to Customer"
                        ? `Successfully converted into active Customer Account! Customer ID assigned: ${showTimelineModal.customerId || 'CUST-ACTIVE'}. Contract value: ${showTimelineModal.value || '₹4,50,000'}.`
                        : `Lead remains active in pipeline stage: ${showTimelineModal.status}.`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowTimelineModal(null)}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition cursor-pointer"
              >
                Close Audit Timeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}