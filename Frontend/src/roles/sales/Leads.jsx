import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  Phone,
  Mail,
  MapPin,
  Navigation,
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
  Briefcase,
  ClipboardList,
} from "lucide-react";
import { crmAPI, visitAPI, customerAPI, pipelineAPI } from "../../services/api.js";
import { useToast } from "../../common/ToastContext.jsx";
import useCurrentUser from "../../hooks/useCurrentUser.js";
import { filterUserItems, isItemOwnedByUser } from "../../utils/userScope.js";
import { formatDate } from "../../utils/dateUtils.js";

const INITIAL_LEADS = []; // Active list of leads
const INITIAL_FOLLOWUPS = [];

export default function Leads() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const currentUser = useCurrentUser();

  // Active view tab: "leads" | "followups" | "visits" | "opportunities"
  const [activeTab, setActiveTab] = useState("leads");

  // Opportunities Pipeline state
  const [opportunities, setOpportunities] = useState(() => {
    try {
      const saved = localStorage.getItem("tc_sales_opportunities");
      const parsed = saved ? JSON.parse(saved) : [];
      const cleanOpps = parsed.filter((p) => p && !["NexGen Automations", "Apex Retail Chains"].includes(p.customer || p.company));
      return filterUserItems(cleanOpps, currentUser);
    } catch {
      return [];
    }
  });

  const [isOppModalOpen, setIsOppModalOpen] = useState(false);
  const [oppForm, setOppForm] = useState({
    companyName: "",
    source: "Field Research (SE)",
    productRequirement: "",
    contactPerson: "",
    phone: "",
    location: "",
    value: "450000",
    remarks: "",
  });

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
  const userEmpCode = currentUser.employee_code || currentUser.employee_id || "EMP000012";
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

  // Fetch real visits and followups from Supabase via backend APIs
  useEffect(() => {
    crmAPI.getFollowups()
      .then((res) => {
        if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
          setFollowupsList((prev) => [...res.data, ...prev.filter(p => !res.data.some(a => a.id === p.id))]);
        }
      })
      .catch(() => null);

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

    pipelineAPI.getOpportunities()
      .then((res) => {
        const raw = Array.isArray(res) ? res : (res?.data || []);
        if (raw.length > 0) {
          const apiOpps = raw
            .filter(o => o && !["NexGen Automations", "Apex Retail Chains"].includes(o.company || o.customer || o.customer_name))
            .map((o) => ({
              id: o.id || o.opportunity_id,
              date: o.closing || o.expected_closing_date || formatDate(new Date()),
              customer: o.company || o.customer || o.customer_name || "Prospect Account",
              productRequirement: o.productRequirement || o.title || "CRM Software",
              source: o.source || "Field Research (SE)",
              contactPerson: o.contact_person || o.contactPerson || "Contact Person",
              phone: o.phone || "N/A",
              address: o.address || o.location || "Chennai",
              remarks: o.remarks || o.notes || "",
              stage: o.stage || "Qualification",
              value: o.value ? (typeof o.value === "number" ? `₹${o.value.toLocaleString("en-IN")}` : o.value) : "₹4,50,000",
            }));
          setOpportunities((prev) => {
            const cleanPrev = prev.filter(p => p && !["NexGen Automations", "Apex Retail Chains"].includes(p.customer || p.company));
            const merged = [...apiOpps];
            cleanPrev.forEach((cp) => {
              if (!merged.some(m => m.id === cp.id || m.customer === cp.customer)) {
                merged.push(cp);
              }
            });
            return merged;
          });
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
            product: l.product_name || l.product || "TwiteConnect CRM",
            product_name: l.product_name || l.product || "TwiteConnect CRM",
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
  const [viewMode, setViewMode] = useState("list"); // Default View Mode: Table List View
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

  // Visit scheduling form state inside modal
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [visitDate, setVisitDate] = useState("");
  const [visitTimeCustom, setVisitTimeCustom] = useState("10:00");
  const [visitTimePeriod, setVisitTimePeriod] = useState("AM");
  const [visitLocation, setVisitLocation] = useState("");
  const [visitPurpose, setVisitPurpose] = useState("Site Visit / Product Demo");
  const [visitRemarks, setVisitRemarks] = useState("");

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
    latitude: 13.0067,
    longitude: 80.2570,
    landmark: "",
    full_address: "",
  });

  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) {
      showToast("Geolocation is not supported by your browser.", "error");
      return;
    }
    showToast("📍 Fetching live GPS position...", "info");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let addr = addForm.city || "Adyar IT Corridor, Chennai";
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (data && data.display_name) {
            addr = data.display_name;
          }
        } catch { }

        setAddForm((prev) => ({
          ...prev,
          latitude: Number(latitude.toFixed(6)),
          longitude: Number(longitude.toFixed(6)),
          full_address: addr,
          city: addr.split(",")[0] || prev.city,
        }));
        showToast("✅ GPS Coordinates & Address captured successfully!", "success");
      },
      (err) => {
        showToast(`Unable to fetch GPS: ${err.message}`, "error");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

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

  // Helper check to determine if a lead or followup has been converted into an active customer account
  const isConvertedToCustomer = (item) => {
    if (!item) return false;
    const statusStr = String(item.status || item.outcome || "").toLowerCase().trim();
    if (
      statusStr.includes("converted") ||
      statusStr.includes("customer") ||
      statusStr.includes("closed won") ||
      item.is_converted ||
      item.converted_to_customer_id ||
      item.customerId
    ) {
      return true;
    }
    const itemComp = String(item.company || item.company_name || "").toLowerCase().trim();
    const itemPhone = String(item.phone || item.mobile || "").replace(/\D/g, "");
    const itemId = String(item.id || item.lead_id || item.leadId || "");

    try {
      const savedCustomers = JSON.parse(localStorage.getItem("tc_customer_accounts") || "[]");
      return savedCustomers.some((c) => {
        const cComp = String(c.company || c.name || "").toLowerCase().trim();
        const cPhone = String(c.phone || c.mobile || "").replace(/\D/g, "");
        const cLeadId = String(c.leadId || c.lead_id || "");

        return (
          (itemId && cLeadId && itemId === cLeadId) ||
          (itemComp && cComp && itemComp !== "client account" && itemComp === cComp) ||
          (itemPhone && cPhone && itemPhone.length >= 7 && itemPhone === cPhone)
        );
      });
    } catch {
      return false;
    }
  };

  // Filter leads strictly for the logged-in Sales Executive, EXCLUDING converted customer leads
  const myAssignedLeads = allLeads.filter((l) => matchesUser(l) && !isConvertedToCustomer(l));

  // Filter follow-ups strictly for the logged-in Sales Executive, EXCLUDING converted follow-ups/leads
  const myFollowups = followupsList.filter((f) => matchesUser(f) && !isConvertedToCustomer(f));

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

    const selectedProd = addForm.product?.trim() || "TwiteConnect CRM";

    const payload = {
      company_name: addForm.company.trim(),
      company: addForm.company.trim(),
      contact_person: addForm.person.trim(),
      person: addForm.person.trim(),
      mobile: addForm.phone.trim(),
      phone: addForm.phone.trim(),
      email: addForm.email.trim() || `${addForm.company.toLowerCase().replace(/\s+/g, '')}@example.com`,
      city: addForm.city.trim() || "Chennai",
      product_name: selectedProd,
      product: selectedProd,
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
      product: selectedProd,
      product_name: selectedProd,
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
        { note: `Lead created by ${userName} via ${addForm.source || 'Field Research'}. Requirement: ${selectedProd}`, date: "Just now", author: userName }
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

      // Persist directly to Supabase crm.opportunities
      pipelineAPI.createOpportunity({
        id: newOppObj.id,
        opportunity_id: newOppObj.id,
        title: `Opportunity - ${addForm.company.trim()}`,
        company: addForm.company.trim(),
        customer_name: addForm.company.trim(),
        contact_person: addForm.person.trim(),
        phone: addForm.phone.trim(),
        value: parseFloat(String(addForm.value || "450000").replace(/[^0-9.]/g, "")) || 450000,
        expected_revenue: parseFloat(String(addForm.value || "450000").replace(/[^0-9.]/g, "")) || 450000,
        stage: "Lead",
        probability: addForm.category === "Hot" ? 85 : addForm.category === "Warm" ? 60 : 30,
        rep: userName,
        assigned_to: userName,
        notes: addForm.notes.trim() || "Researched client detail logged by Sales Executive.",
      }).catch((err) => {
        console.warn("Opportunity Supabase persistence notice:", err);
      });

      showToast(`🎯 Opportunity "${addForm.company}" saved to Supabase & Opportunity List!`, "success");
    } else {

      setAllLeads((prev) => {
        const updated = [newLeadObj, ...prev];
        try {
          localStorage.setItem("tc_sm_leads", JSON.stringify(updated));
        } catch (err) { }
        return updated;
      });
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

    // Notification to Sales Manager disabled by policy rules (only Converted Customer & Visits allowed)
    setIsAddModalOpen(false);

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

  // ── Add Opportunity Action ───────────────────────────────────────────────
  const handleAddOpportunity = (e) => {
    e.preventDefault();
    if (!oppForm.companyName || !oppForm.location) {
      showToast("Company name and location are required.", "error");
      return;
    }

    const newOpp = {
      id: `opp_${Date.now()}`,
      date: formatDate(new Date()),
      customer: oppForm.companyName.trim(),
      company: oppForm.companyName.trim(),
      source: oppForm.source,
      productRequirement: oppForm.productRequirement,
      contactPerson: oppForm.contactPerson.trim(),
      phone: oppForm.phone.trim(),
      address: oppForm.location.trim(),
      location: oppForm.location.trim(),
      remarks: oppForm.remarks.trim(),
      value: oppForm.value ? (oppForm.value.startsWith('₹') ? oppForm.value : `₹${Number(oppForm.value).toLocaleString('en-IN')}`) : "₹4,50,000",
      stage: "Qualification",
      assignedTo: userName,
      assignedToEmail: userEmail,
      status: "Open"
    };

    setOpportunities((prev) => [newOpp, ...prev]);

    try {
      const savedOpps = JSON.parse(localStorage.getItem("tc_sales_opportunities") || "[]");
      localStorage.setItem("tc_sales_opportunities", JSON.stringify([newOpp, ...savedOpps]));
    } catch (err) { }

    try {
      pipelineAPI.createOpportunity({
        id: newOpp.id,
        opportunity_id: newOpp.id,
        title: `Opportunity - ${newOpp.company}`,
        company: newOpp.company,
        customer_name: newOpp.company,
        contact_person: newOpp.contactPerson,
        phone: newOpp.phone,
        value: parseFloat(String(oppForm.value || "450000").replace(/[^0-9.]/g, "")) || 450000,
        expected_revenue: parseFloat(String(oppForm.value || "450000").replace(/[^0-9.]/g, "")) || 450000,
        stage: "Qualification",
        probability: 60,
        location: newOpp.location,
        lead_source: newOpp.source,
        requirement: newOpp.productRequirement,
        notes: newOpp.remarks,
        rep: userName,
        assigned_to: userName,
        assigned_to_email: userEmail
      }).catch(() => null);
    } catch (err) { }

    setIsOppModalOpen(false);
    setOppForm({
      companyName: "",
      source: "Field Research (SE)",
      productRequirement: "",
      contactPerson: "",
      phone: "",
      location: "",
      value: "450000",
      remarks: "",
    });
    showToast(`🎯 Opportunity for "${newOpp.customer}" added successfully!`, "success");
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

    // Save to Supabase crm.follow_ups table
    crmAPI.createFollowup(newFollowup).catch(() => null);

    // Update lead status in allLeads and backend
    crmAPI.updateLead(lead.id, {
      status: "Moved to Follow-ups",
      notes: `[Follow-up scheduled on ${followupDate} ${followupTime}]: ${remarkText}`
    }).catch(() => null);

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

    // Notification to Sales Manager disabled by policy rules (only Converted Customer & Visits allowed)

    setSelectedLead(null);
    setShowFollowupForm(false);
    setSeRemarkInput("");
    setFollowupDate("");
    showToast(`📞 Lead "${lead.company}" moved to Scheduled Follow-ups!`, "success");
  };

  const handleConfirmScheduleVisit = async (lead) => {
    if (!visitDate) {
      showToast("Please select a Visit Date first!", "error");
      return;
    }

    const formattedTime = `${visitTimeCustom.trim() || "10:00"} ${visitTimePeriod || "AM"}`;
    const newVisitId = `vst_${Date.now()}`;
    const formattedDate = formatDate(visitDate);
    const genLeadNumber = lead.leadNumber || lead.id?.toString().slice(0, 12).toUpperCase();

    const newVisit = {
      id: newVisitId,
      visit_id: newVisitId,
      leadId: lead.id,
      leadNumber: genLeadNumber,
      customerName: lead.company,
      clientName: lead.company,
      customer: lead.company,
      company: lead.company,
      contactPerson: lead.person,
      phone: lead.phone,
      location: visitLocation || lead.city || "Chennai",
      address: visitLocation || lead.city || "Chennai",
      visitDate: formattedDate,
      date: formattedDate,
      time: formattedTime,
      scheduledTime: formattedTime,
      status: "Scheduled",
      purpose: visitPurpose || lead.product || "Site Visit / Product Demo",
      product: lead.product || "TwiteConnect CRM",
      remark: visitRemarks || "Visit scheduled from Lead outcome.",
      remarks: visitRemarks || "Visit scheduled from Lead outcome.",
      notes: visitRemarks || "Visit scheduled from Lead outcome.",
      executiveName: userName,
      assignedTo: userName,
      assignedToEmail: userEmail,
      assigned_to: userName,
      assigned_to_email: userEmail,
      mapsUrl: `https://maps.google.com/?q=${encodeURIComponent(lead.company + " " + (visitLocation || lead.city || "Chennai"))}`,
    };

    const payload = {
      visit_id: newVisitId,
      lead_id: lead.id,
      lead_number: genLeadNumber,
      client_name: lead.company,
      customer_name: lead.company,
      company_name: lead.company,
      purpose: visitPurpose || lead.product || "Site Visit / Product Demo",
      product: lead.product || "TwiteConnect CRM",
      product_name: lead.product || "TwiteConnect CRM",
      visit_date: formattedDate,
      date: formattedDate,
      visit_time: formattedTime,
      time: formattedTime,
      location: visitLocation || lead.city || "Chennai",
      address: visitLocation || lead.city || "Chennai",
      contact_person: lead.person,
      phone: lead.phone,
      employee_name: userName,
      employee_id: currentUser?.employee_id || currentUser?.id || null,
      assigned_to: userName,
      assigned_to_email: userEmail,
      status: "SCHEDULED",
      visit_status: "SCHEDULED",
      notes: visitRemarks || "Visit scheduled from Lead outcome.",
      remarks: visitRemarks || "Visit scheduled from Lead outcome."
    };

    try {
      await visitAPI.createVisit(payload);

      try {
        const visits = JSON.parse(localStorage.getItem("tc_sales_visits") || "[]");
        localStorage.setItem("tc_sales_visits", JSON.stringify([newVisit, ...visits.filter(v => v.id !== newVisitId)]));

        const smVisits = JSON.parse(localStorage.getItem("tc_sm_visits") || "[]");
        localStorage.setItem("tc_sm_visits", JSON.stringify([newVisit, ...smVisits.filter(v => v.id !== newVisitId)]));
      } catch (e) { }

      // Update lead status in Supabase & frontend
      try {
        await crmAPI.updateLead(lead.id, { status: "VISIT_SCHEDULED", notes: visitRemarks });
      } catch (err) { }

      setAllLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, status: "Visit Scheduled" } : l))
      );

      setVisitList((prev) => [newVisit, ...prev.filter(v => v.id !== newVisitId)]);

      if (lead.isFromFollowup && lead.followupId) {
        setFollowupsList((prev) => prev.filter((f) => f.id !== lead.followupId));
      }

      // Alert SM notification
      try {
        const existingNotifs = JSON.parse(localStorage.getItem("tc_app_notifications") || "[]");
        const smNotif = {
          id: `notif_${Date.now()}`,
          recipientRole: "manager",
          title: `📅 Visit Scheduled by ${userName}`,
          message: `${userName} scheduled site visit for "${lead.company}" on ${formattedDate} at ${formattedTime}.`,
          time: "Just now",
          read: false,
          type: "Visit",
        };
        localStorage.setItem("tc_app_notifications", JSON.stringify([smNotif, ...existingNotifs]));
      } catch (err) { }

      setSelectedLead(null);
      setShowVisitForm(false);
      setVisitDate("");
      setVisitRemarks("");
      showToast(`📅 Site Visit for "${lead.company}" on ${formattedDate} (${formattedTime}) saved to Supabase!`, "success");
      setActiveTab("visits");
    } catch (apiErr) {
      console.warn("API save notice:", apiErr);
      setAllLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, status: "Visit Scheduled" } : l))
      );
      setVisitList((prev) => [newVisit, ...prev.filter(v => v.id !== newVisitId)]);
      setSelectedLead(null);
      setShowVisitForm(false);
      showToast(`📅 Site Visit for "${lead.company}" scheduled!`, "success");
      setActiveTab("visits");
    }
  };

  // ── FOLLOW-UP TAB OUTCOME ACTION 1: Move to Visit Page ──────────────────────
  const handleMoveFollowupToVisit = (item) => {
    setSelectedLead({
      ...item,
      id: item.leadId || item.id,
      isFromFollowup: true,
      followupId: item.id
    });
    setVisitLocation(item.city || "");
    setVisitRemarks(item.remark || "");
    setShowVisitForm(true);
    setShowFollowupForm(false);
  };


  // ── FOLLOW-UP TAB OUTCOME ACTION 2: Move to Customer Page ───────────────────
  const handleMoveFollowupToCustomer = async (item) => {
    const custId = `cust_${Date.now()}`;
    const genLeadNum = item.leadNumber || item.leadId?.toString().slice(0, 12).toUpperCase();
    const newCustomer = {
      id: custId,
      customer_id: custId,
      leadId: item.leadId,
      leadNumber: genLeadNum,
      name: item.company,
      company: item.company,
      contactPerson: item.person,
      person: item.person,
      phone: item.phone,
      email: item.email || `${item.company.toLowerCase().replace(/\s+/g, '')}@example.com`,
      city: item.city || "Chennai",
      status: "Active Customer",
      packageTier: "Enterprise Plan",
      reachOutReason: item.remark || "Converted after follow-up call.",
      accountManager: userName,
      assigned_to: userName,
      assigned_to_email: userEmail,
      onboardingRemarks: `Converted directly from Follow-up call by ${userName}.`,
      contractValue: "₹4,50,000",
    };

    // 1. Convert via Centralized Customer Conversion API
    try {
      const res = await crmAPI.convertFollowupToCustomer(item.id, {
        company_name: item.company,
        contact_person: item.person,
        phone: item.phone,
        email: item.email,
        city: item.city,
        notes: item.remark || "Converted after follow-up call.",
        lead_id: item.leadId,
        assigned_to: userName,
        assigned_to_email: userEmail
      });
      if (res && res.data && res.data.customer) {
        newCustomer.id = res.data.customer.id || res.data.customer.customer_id;
        newCustomer.customer_id = newCustomer.id;
      }
    } catch (err) {
      console.warn("Customer Supabase conversion notice:", err);
    }

    try {
      const customers = JSON.parse(localStorage.getItem("tc_customer_accounts") || "[]");
      localStorage.setItem("tc_customer_accounts", JSON.stringify([newCustomer, ...customers.filter(c => c.name !== item.company)]));

      const existingNotifs = JSON.parse(localStorage.getItem("tc_app_notifications") || "[]");
      const smNotif = {
        id: `notif_${Date.now()}`,
        recipientRole: "manager",
        title: `🎉 Customer Converted from Follow-up by ${userName}`,
        message: `${userName} converted follow-up "${item.company}" into active Customer Account!`,
        time: "Just now",
        read: false,
        type: "Customer",
      };
      localStorage.setItem("tc_app_notifications", JSON.stringify([smNotif, ...existingNotifs]));
    } catch (e) { }

    // 3. Remove from followups and active leads
    setFollowupsList((prev) => prev.filter((f) => f.id !== item.id));
    setAllLeads((prev) => prev.filter((l) => l.id !== item.leadId && l.company !== item.company));

    showToast(`🎉 "${item.company}" converted to Customer & saved in Supabase! Moving to Customer page...`, "success");
    setTimeout(() => navigate("/sales/customers"), 500);
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
  const handleVisitOutcomeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVisitForOutcome) return;

    const v = selectedVisitForOutcome;
    const { personMet, discussionNotes, leadFeedback, outcomeStatus, agreedValue } = visitOutcomeForm;

    const meetingSummary = `[Visited ${v.date || 'Today'}]: Spoke with ${personMet || v.person || 'Client Head'}. Discussion: ${discussionNotes || 'N/A'}. Lead said: ${leadFeedback || 'N/A'}`;

    if (outcomeStatus === "Won") {
      const custId = `cust_${Date.now()}`;
      const genLeadNum = v.leadNumber || v.leadId?.toString().slice(0, 12).toUpperCase();
      const newCustomer = {
        id: custId,
        customer_id: custId,
        leadId: v.leadId,
        leadNumber: genLeadNum,
        name: v.customer || v.client || v.company || "Client Account",
        company: v.customer || v.client || v.company || "Client Account",
        person: personMet || v.person || v.contactPerson || "Contact Person",
        phone: v.phone || "",
        email: v.email || "",
        city: v.location || v.city || "Chennai",
        status: "Active Customer",
        packageTier: "Enterprise Suite",
        reachOutReason: meetingSummary,
        accountManager: userName,
        assigned_to: userName,
        assigned_to_email: userEmail,
        onboardingRemarks: `Converted after site visit meeting by ${userName}.`,
        revenue: agreedValue || "₹4,50,000",
        contractValue: agreedValue || "₹4,50,000",
        lastVisit: formatDate(new Date()),
        onboardDate: formatDate(new Date()),
      };

      try {
        const customers = JSON.parse(localStorage.getItem("tc_customer_accounts") || "[]");
        localStorage.setItem("tc_customer_accounts", JSON.stringify([newCustomer, ...customers.filter(c => c.name !== newCustomer.name)]));

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

      // 1. Convert Visit via Centralized Customer Conversion API
      try {
        const res = await crmAPI.convertVisitToCustomer(v.id, {
          company_name: newCustomer.company,
          contact_person: newCustomer.person,
          phone: newCustomer.phone,
          email: newCustomer.email,
          city: newCustomer.city,
          notes: meetingSummary,
          lead_id: v.leadId,
          assigned_to: userName,
          assigned_to_email: userEmail
        });
        if (res && res.data && res.data.customer) {
          newCustomer.id = res.data.customer.id || res.data.customer.customer_id;
          newCustomer.customer_id = newCustomer.id;
        }
      } catch (err) {
        console.warn("Customer Visit Supabase conversion notice:", err);
      }

      // 2. Remove from visits and active leads
      setVisitList((prev) => prev.filter((item) => item.id !== v.id));
      setAllLeads((prev) => prev.filter((l) => l.company !== newCustomer.name && l.id !== v.leadId));

      setSelectedVisitForOutcome(null);
      showToast(`🎉 Deal Won! "${newCustomer.name}" converted to Customer & saved in Supabase! Moving to Customer page...`, "success");
      setTimeout(() => navigate("/sales/customers"), 500);
      return;
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
      crmAPI.createFollowup(newFollowup).catch(() => null);
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
  const openLeadsOnly = deduplicatedAssignedLeads.filter((l) => !isConvertedToCustomer(l));
  const convertedLeadsOnly = [];

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

  const paginatedLeads = filteredLeads;

  const filteredConvertedLeads = [];

  const totalAssigned = openLeadsOnly.length;
  const hotCount = openLeadsOnly.filter((l) => l.category === "Hot").length;
  const warmCount = openLeadsOnly.filter((l) => l.category === "Warm").length;
  const coldCount = openLeadsOnly.filter((l) => l.category === "Cold").length;
  const convertedCount = 0;

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
      </div>

      {/* ── TOGGLE TAB BAR INSIDE LEADS PAGE (Leads | Followups | Visits | Opportunities) ── */}
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
            onClick={() => setActiveTab("opportunities")}
            className={`px-4 py-2 rounded-lg font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shrink-0 ${activeTab === "opportunities"
              ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
          >
            <Briefcase size={16} />
            <span>Opportunities ({opportunities.length})</span>
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
                      <td className="py-3.5 px-4 space-y-0.5 text-xs max-w-[220px]">
                        <div className="flex items-center gap-1.5 text-slate-800 font-bold truncate">
                          <Phone size={13} className="text-blue-600 shrink-0" /> <span className="truncate">{lead.phone}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 truncate">
                          <MapPin size={13} className="text-red-500 shrink-0" />
                          {String(lead.city || lead.address || "").startsWith("http") ? (
                            <a
                              href={lead.city || lead.address}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-blue-600 hover:text-blue-800 underline truncate max-w-full inline-flex items-center gap-1"
                            >
                              <span className="truncate">📍 View Google Maps</span>
                              <ExternalLink size={11} className="shrink-0" />
                            </a>
                          ) : (
                            <span className="truncate text-xs font-semibold text-slate-700">{lead.city || lead.address || 'Location Not Specified'}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border ${lead.category === "Hot"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : lead.category === "Warm"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                        >
                          {lead.category === "Hot" ? "🟢 Hot Lead" : lead.category === "Warm" ? "⚡ Warm Lead" : "🔴 Cold Lead"}
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
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : lead.category === "Warm"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                        >
                          {lead.status === "Converted to Customer"
                            ? "🎉 Converted Customer"
                            : lead.category === "Hot"
                              ? "🟢 Hot Lead"
                              : lead.category === "Warm"
                                ? "⚡ Warm Lead"
                                : "🔴 Cold Lead"}
                        </span>

                        {lead.status === "Converted to Customer" ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold px-2.5 py-0.5 rounded-full">
                            Active Account
                          </span>
                        ) : (
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${lead.category === "Hot"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : lead.category === "Warm"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
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

                    <div className="space-y-2 mt-3.5 text-xs sm:text-sm font-semibold text-slate-600 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <Phone className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="truncate">{lead.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="truncate">{lead.email}</span>
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                        {String(lead.city || lead.address || "").startsWith("http") ? (
                          <a
                            href={lead.city || lead.address}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 underline truncate max-w-full inline-flex items-center gap-1"
                          >
                            <span className="truncate">📍 View Google Maps Location</span>
                            <ExternalLink size={12} className="shrink-0" />
                          </a>
                        ) : (
                          <span className="truncate text-xs font-semibold text-slate-700">{lead.city || lead.address || 'Location Not Specified'}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-slate-800 font-bold bg-amber-50/80 border border-amber-300 px-3 py-1.5 rounded-xl text-xs min-w-0">
                        <Zap className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="truncate">Product Requirement: <strong className="text-amber-950 font-black">{lead.product || lead.product_name || 'TwiteConnect CRM'}</strong></span>
                      </div>
                    </div>

                    {/* Remarks / Notes */}
                    {lead.notes && (
                      <div className="mt-3.5 p-3 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs font-semibold text-amber-950 leading-relaxed break-words min-w-0">
                        <span className="text-[10px] sm:text-xs font-extrabold text-amber-800 block uppercase tracking-wider mb-0.5">
                          Remarks / Notes:
                        </span>
                        <p className="break-words font-semibold text-slate-800">{lead.notes}</p>
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

                    <div className="grid grid-cols-1 gap-2 text-xs sm:text-sm font-bold">
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
                        className="py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
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
                        className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
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

      {/* ── TAB: OPPORTUNITIES & DEALS TOGGLE VIEW ────────────────────── */}
      {activeTab === "opportunities" && (
        <div className="space-y-5">
          <div className="bg-amber-50/80 border border-amber-200 rounded-3xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-black text-amber-950 flex items-center gap-2">
                <Briefcase className="w-5.5 h-5.5 text-amber-600" /> Pipeline Deals & Opportunities
              </h2>
              <p className="text-xs sm:text-sm font-medium text-amber-900">
                Track and manage prospect opportunities, product requirements, and deal stages.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsOppModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs sm:text-sm shadow-md shadow-amber-600/30 flex items-center gap-2 cursor-pointer transition"
            >
              <Plus size={18} /> Add Opportunity
            </button>
          </div>

          {opportunities.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center text-slate-400 font-semibold text-xs sm:text-sm border border-slate-200">
              No active sales opportunities found. Click "Add Opportunity" above to create one!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {opportunities.map((opp) => (
                <div
                  key={opp.id || opp.opportunity_id}
                  className="bg-white rounded-3xl border border-amber-200/80 shadow-xs hover:border-amber-500/50 hover:shadow-md transition p-5 sm:p-6 flex flex-col justify-between space-y-4 min-w-0"
                >
                  <div className="space-y-3.5">
                    {/* Header: Stage Badge & Deal Value */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-200">
                        💼 Stage: {opp.stage || "Qualification"}
                      </span>
                      <span className="text-xs sm:text-sm font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                        {opp.value || "₹4,50,000"}
                      </span>
                    </div>

                    {/* Company Name & Product Requirement */}
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">
                        🏢 {opp.customer || opp.company || opp.customer_name || "Enterprise Account"}
                      </h2>
                      {opp.productRequirement && (
                        <p className="text-xs font-bold text-amber-800 bg-amber-50/80 border border-amber-200/60 rounded-lg px-2.5 py-1 mt-1.5 inline-block">
                          📦 Requirement: {opp.productRequirement}
                        </p>
                      )}
                    </div>

                    {/* Contact & Location Details */}
                    <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80 space-y-2 text-xs sm:text-sm font-semibold text-slate-700">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-amber-600 shrink-0" />
                        <span>Contact Person: <strong className="text-slate-900">{opp.contactPerson || opp.person || "Point of Contact"}</strong></span>
                      </div>

                      {opp.phone && (
                        <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                          <Phone size={14} className="text-teal-600 shrink-0" />
                          <span className="text-slate-800 font-bold">{opp.phone}</span>
                        </div>
                      )}

                      <div className="flex items-start gap-2 pt-1 border-t border-slate-200/60">
                        <MapPin size={14} className="text-blue-600 shrink-0 mt-0.5" />
                        <span>Location: <strong className="text-slate-800">{opp.address || opp.location || opp.city || "Chennai"}</strong></span>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 text-xs">
                        <span className="text-slate-400 font-bold">Source:</span>
                        <span className="font-extrabold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">{opp.source || "Field Research (SE)"}</span>
                      </div>
                    </div>

                    {/* Remarks */}
                    {(opp.remarks || opp.notes) && (
                      <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs">
                        <p className="font-extrabold text-amber-900 uppercase tracking-wider text-[10px]">RESEARCH NOTES / REMARKS:</p>
                        <p className="text-slate-800 font-semibold mt-1 leading-relaxed">{opp.remarks || opp.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAddForm({
                          company: opp.customer || opp.company || "",
                          person: opp.contactPerson || opp.person || "",
                          phone: opp.phone || "",
                          email: opp.email || "",
                          city: opp.address || opp.location || "Chennai",
                          category: "Hot",
                          priority: "High",
                          value: opp.value || "₹4,50,000",
                          source: opp.source || "Field Research (SE)",
                          notes: opp.remarks || opp.notes || "",
                        });
                        setIsAddModalOpen(true);
                      }}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                    >
                      <Plus size={14} /> Add as Active Lead 🚀
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

              {/* ── 📍 GPS LOCATION CAPTURE WIDGET ── */}
              <div className="bg-blue-50/80 border-2 border-blue-200 rounded-3xl p-4.5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <label className="text-xs font-black text-blue-950 uppercase tracking-wider block">
                      Exact Client GPS Coordinates (*Required for Radar Map)
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={handleUseCurrentGps}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                  >
                    <Navigation size={13} /> Use Current GPS Location
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-600 font-bold block mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={addForm.latitude || 13.0067}
                      onChange={(e) => setAddForm({ ...addForm, latitude: Number(e.target.value) })}
                      className="w-full border border-blue-200 rounded-xl px-3 py-2 text-xs font-mono font-bold bg-white text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 font-bold block mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={addForm.longitude || 80.2570}
                      onChange={(e) => setAddForm({ ...addForm, longitude: Number(e.target.value) })}
                      className="w-full border border-blue-200 rounded-xl px-3 py-2 text-xs font-mono font-bold bg-white text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-600 font-bold block mb-1">Landmark (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Near Tidel Park Gate 2"
                      value={addForm.landmark || ''}
                      onChange={(e) => setAddForm({ ...addForm, landmark: e.target.value })}
                      className="w-full border border-blue-200 rounded-xl px-3 py-2 text-xs font-semibold bg-white text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 font-bold block mb-1">Full GPS Address</label>
                    <input
                      type="text"
                      placeholder="Captured full street address"
                      value={addForm.full_address || addForm.city || ''}
                      onChange={(e) => setAddForm({ ...addForm, full_address: e.target.value })}
                      className="w-full border border-blue-200 rounded-xl px-3 py-2 text-xs font-semibold bg-white text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
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
                      ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                      : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                      }`}
                  >
                    🟢 HOT Lead
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
                      ? "bg-rose-500 text-white border-rose-600 shadow-xs"
                      : "bg-white text-rose-700 border-rose-200 hover:bg-rose-50"
                      }`}
                  >
                    🔴 COLD Lead
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

              {/* Visit scheduling form expansion */}
              {showVisitForm && (
                <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 space-y-3 animate-fadeIn">
                  <span className="text-xs font-black text-teal-900 uppercase tracking-wider block">
                    📍 Fill Details to Schedule Site Visit:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold">
                    <div>
                      <label className="text-teal-900 font-bold block mb-1">Visit Date</label>
                      <input
                        type="date"
                        required
                        value={visitDate}
                        onChange={(e) => setVisitDate(e.target.value)}
                        className="w-full border border-teal-200 rounded-xl p-2.5 bg-white text-slate-900 font-extrabold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-teal-900 font-bold block mb-1">Preferred Time</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          placeholder="10:00"
                          value={visitTimeCustom}
                          onChange={(e) => setVisitTimeCustom(e.target.value)}
                          className="w-full border border-teal-200 rounded-xl p-2.5 bg-white text-slate-900 font-extrabold focus:outline-none text-xs"
                        />
                        <div className="flex bg-teal-200/70 p-0.5 rounded-xl border border-teal-300 shrink-0">
                          <button
                            type="button"
                            onClick={() => setVisitTimePeriod("AM")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${visitTimePeriod === "AM" ? "bg-teal-700 text-white shadow-xs" : "text-teal-900 hover:bg-teal-200"
                              }`}
                          >
                            AM
                          </button>
                          <button
                            type="button"
                            onClick={() => setVisitTimePeriod("PM")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${visitTimePeriod === "PM" ? "bg-teal-700 text-white shadow-xs" : "text-teal-900 hover:bg-teal-200"
                              }`}
                          >
                            PM
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold">
                    <div>
                      <label className="text-teal-900 font-bold block mb-1">Location / Address</label>
                      <input
                        type="text"
                        value={visitLocation}
                        onChange={(e) => setVisitLocation(e.target.value)}
                        className="w-full border border-teal-200 rounded-xl p-2.5 bg-white text-slate-900 font-extrabold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-teal-900 font-bold block mb-1">Visit Purpose</label>
                      <input
                        type="text"
                        value={visitPurpose}
                        onChange={(e) => setVisitPurpose(e.target.value)}
                        className="w-full border border-teal-200 rounded-xl p-2.5 bg-white text-slate-900 font-extrabold focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-teal-900 font-bold block mb-1">Additional Remarks</label>
                    <textarea
                      rows="2"
                      value={visitRemarks}
                      onChange={(e) => setVisitRemarks(e.target.value)}
                      placeholder="Agreed to show product demo at client site..."
                      className="w-full border border-teal-200 rounded-xl p-2.5 bg-white text-slate-900 font-semibold focus:outline-none text-xs"
                    />
                  </div>
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
                    onClick={async () => {
                      try {
                        // Store in localStorage immediately for instant UI feedback
                        const custLocalId = `cust_${Date.now()}`;
                        const genLeadNum = selectedLead.leadNumber || selectedLead.id?.toString().slice(0, 12).toUpperCase();
                        const newCustomer = {
                          id: custLocalId,
                          customer_id: custLocalId,
                          leadId: selectedLead.id,
                          leadNumber: genLeadNum,
                          name: selectedLead.company,
                          company: selectedLead.company,
                          person: selectedLead.person,
                          contact_person: selectedLead.person,
                          phone: selectedLead.phone,
                          email: selectedLead.email || `${(selectedLead.company || '').toLowerCase().replace(/\s+/g, '')}@example.com`,
                          city: selectedLead.city || "Chennai",
                          status: "Active Customer",
                          packageTier: "Enterprise Suite",
                          reachOutReason: seRemarkInput.trim() || "Converted Customer Account",
                          accountManager: userName,
                          assigned_to: userName,
                          assigned_to_email: userEmail,
                          onboardingRemarks: `Converted directly from Leads list by ${userName}.`,
                          contractValue: selectedLead.value || "₹4,50,000",
                        };

                        // Save to localStorage for offline view
                        const customers = JSON.parse(localStorage.getItem("tc_customer_accounts") || "[]");
                        localStorage.setItem("tc_customer_accounts", JSON.stringify([newCustomer, ...customers.filter(c => c.name !== selectedLead.company)]));

                        // Manager notification
                        const existingNotifs = JSON.parse(localStorage.getItem("tc_app_notifications") || "[]");
                        localStorage.setItem("tc_app_notifications", JSON.stringify([{
                          id: `notif_${Date.now()}`,
                          recipientRole: "manager",
                          title: `🎉 Deal Won & Converted by ${userName}`,
                          message: `${userName} converted "${newCustomer.name}" into active Customer Account (${selectedLead.value || '₹4,50,000'})!`,
                          time: "Just now", read: false, type: "Customer",
                        }, ...existingNotifs]));

                        // Persist to Supabase via backend — use convertLeadToCustomer so
                        // the backend receives a proper lead_id and resolves the UUID correctly
                        await crmAPI.convertLeadToCustomer(selectedLead.id, {
                          name: newCustomer.name,
                          company_name: newCustomer.company,
                          contact_person: newCustomer.person,
                          phone: newCustomer.phone,
                          email: newCustomer.email,
                          city: newCustomer.city,
                          address: newCustomer.city,
                          notes: newCustomer.reachOutReason,
                          assigned_to: userName,
                          assigned_to_email: userEmail,
                        });

                        // Remove lead from local active list
                        setAllLeads((prev) => prev.filter((l) => l.id !== selectedLead.id));
                        setSelectedLead(null);
                        showToast(`🎉 "${selectedLead.company}" converted to Customer and saved in Supabase! Moving to Customer page...`, "success");
                        setTimeout(() => navigate("/sales/customers"), 500);
                      } catch (err) {
                        console.warn("Customer conversion error:", err);
                        // Still mark lead converted in local state and navigate
                        setAllLeads((prev) => prev.filter((l) => l.id !== selectedLead.id));
                        setSelectedLead(null);
                        showToast(`"${selectedLead.company}" converted locally. Check your connection.`, "info");
                        setTimeout(() => navigate("/sales/customers"), 500);
                      }
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
                      if (!showVisitForm) {
                        setVisitLocation(selectedLead.city || "");
                        setVisitRemarks(seRemarkInput || "");
                        setShowVisitForm(true);
                        setShowFollowupForm(false);
                      } else {
                        handleConfirmScheduleVisit(selectedLead);
                      }
                    }}
                    className={`py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer font-black ${showVisitForm
                        ? "bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/30"
                        : "bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-300"
                      }`}
                  >
                    <CalendarPlus size={18} /> Schedule Visit 📅
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

      {/* ── ADD OPPORTUNITY MODAL (SE Field Prospecting / Pipeline Discovery) ── */}
      {isOppModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Briefcase size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 leading-tight">Log New Sales Opportunity</h2>
                  <p className="text-xs text-slate-500 font-semibold">Capture field prospect requirement & intelligence.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOppModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddOpportunity} className="space-y-3.5 text-xs sm:text-sm">
              {/* Company Name & Source */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">Company / Client Name (*Required)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Tech Solutions"
                    value={oppForm.companyName}
                    onChange={(e) => setOppForm({ ...oppForm, companyName: e.target.value })}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white font-bold text-slate-900 focus:outline-none focus:border-amber-500 text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">Lead / Opp Source</label>
                  <select
                    value={oppForm.source}
                    onChange={(e) => setOppForm({ ...oppForm, source: e.target.value })}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white font-bold text-slate-900 focus:outline-none focus:border-amber-500 text-xs sm:text-sm cursor-pointer"
                  >
                    <option value="Field Research (SE)">Field Research (SE)</option>
                    <option value="Cold Visit">Cold Visit</option>
                    <option value="Inbound Enquiry">Inbound Enquiry</option>
                    <option value="Client Referral">Client Referral</option>
                    <option value="LinkedIn Outreach">LinkedIn Outreach</option>
                  </select>
                </div>
              </div>

              {/* Product Requirement & Deal Value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">Product / Requirement (*Why reach out)</label>
                  <input
                    type="text"
                    placeholder="e.g. GPS Tracking Software, CRM Enterprise"
                    value={oppForm.productRequirement}
                    onChange={(e) => setOppForm({ ...oppForm, productRequirement: e.target.value })}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white font-bold text-slate-900 focus:outline-none focus:border-amber-500 text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">Estimated Deal Value (₹)</label>
                  <input
                    type="text"
                    placeholder="450000"
                    value={oppForm.value}
                    onChange={(e) => setOppForm({ ...oppForm, value: e.target.value })}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white font-bold text-slate-900 focus:outline-none focus:border-amber-500 text-xs sm:text-sm"
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
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white font-medium focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={oppForm.phone}
                    onChange={(e) => setOppForm({ ...oppForm, phone: e.target.value })}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white font-medium focus:outline-none focus:border-amber-500"
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
                  className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white font-medium focus:outline-none focus:border-amber-500"
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
                  className="w-full border border-slate-200 rounded-xl p-3 bg-white font-medium focus:outline-none focus:border-amber-500 text-xs"
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
                  className="px-6 py-2.5 rounded-xl bg-amber-600 text-white font-extrabold hover:bg-amber-700 transition cursor-pointer shadow-md shadow-amber-600/20"
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