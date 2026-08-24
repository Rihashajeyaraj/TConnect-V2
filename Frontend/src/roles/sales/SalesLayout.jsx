import React, { useState, useEffect, useRef, useCallback } from "react";
import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  CalendarDays,
  MapPinned,
  ClipboardList,
  Briefcase,
  BadgeDollarSign,
  Bell,
  UserCircle2,
  CheckSquare,
  LogOut,
  Menu,
  X,
  Navigation,
  Wifi,
  WifiOff,
  User,
  ShieldCheck,
  ChevronDown,
  UserCircle,
  Pencil,
  Save,
  Camera,
  Upload,
  Eye,
  FileUp,
  Mail,
  Phone,
  MapPin,
  Building2,
  CreditCard,
  HeartPulse,
  Code2,
  AlertCircle,
  GripVertical,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { notificationAPI, hrmsAPI, spatialAPI } from "../../services/api.js";
import useCurrentUser from "../../hooks/useCurrentUser.js";
import { clearUserCache } from "../../utils/userScope.js";
import TwiteConnectLogo from "../../common/TwiteConnectLogo.jsx";
import { useToast } from "../../common/ToastContext.jsx";

const PROFILE_DEFAULTS = {
  fullName: "",
  employeeId: "EMP000012",
  officialEmail: "",
  phone: "+91 98765 00012",
  role: "Sales Executive",
  team: "Sales & Business Development",
  designation: "Field Sales Executive",
  gender: "Female",
  employmentType: "Full-time",
  employmentStatus: "Active",
  joinDate: "2025-06-01",
  workMode: "On Field / In Office",
  workLocation: "Chennai, Tamil Nadu",
  reportingManager: "Jeeva Kumar (Sales Manager)",
  incentivePercentage: 5.0,
  // Personal
  dob: "2000-05-15",
  maritalStatus: "Single",
  bloodGroup: "B+",
  panId: "ABCDE1234F",
  personalEmail: "",
  alternateContact: "+91 98765 99999",
  currentAddress: "Plot No. 15, Adyar IT Corridor, Chennai - 600020",
  permanentAddress: "No. 42, Main Road, Madurai, Tamil Nadu - 625001",
  city: "Chennai",
  state: "Tamil Nadu",
  country: "India",
  postalCode: "600020",
  // Skills
  primarySkills: "Field Sales, Client Acquisition, CRM Operations",
  secondarySkills: "Negotiation, Product Demos, Deal Closing",
  tools: "TwiteConnect, WhatsApp Web, Google Maps",
  // Emergency
  emergencyName: "Father / Kin",
  emergencyRelationship: "Parent",
  emergencyContact: "+91 98765 88888",
  // Bank
  accountHolder: "",
  bankName: "State Bank of India",
  accountNumber: "38927189201",
  ifsc: "SBIN0001234",
  branch: "Adyar Branch, Chennai",
};

const DOCUMENT_DEFAULTS = [
  { id: "doc_se1", name: "Aadhar Card", status: "pending", fileUrl: null, fileName: "" },
  { id: "doc_se2", name: "Offer Letter", status: "pending", fileUrl: null, fileName: "" },
  { id: "doc_se3", name: "PAN Card", status: "pending", fileUrl: null, fileName: "" },
  { id: "doc_se4", name: "Driving License (Field Visit)", status: "pending", fileUrl: null, fileName: "" },
  { id: "doc_se5", name: "Bank Passbook / Cheque", status: "pending", fileUrl: null, fileName: "" },
];

// Helper mappings between Supabase snake_case and Frontend camelCase
const mapDbToFrontend = (emp) => {
  if (!emp) return {};
  return {
    fullName: emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || "",
    employeeId: emp.employee_code || emp.employee_id || "",
    officialEmail: emp.email || "",
    phone: emp.phone || emp.mobile || "",
    role: emp.role || "Sales Executive",
    team: emp.department || "Sales",
    designation: emp.designation || "Sales Executive",
    gender: emp.gender || "",
    employmentType: emp.employment_type || "",
    employmentStatus: emp.is_active ? "Active" : "Inactive",
    joinDate: emp.joining_date || "",
    workMode: emp.work_mode || "",
    workLocation: emp.work_location || "",
    reportingManager: emp.reporting_manager_name || emp.reporting_manager_email || "Not Assigned",
    dob: emp.date_of_birth || "",
    maritalStatus: emp.marital_status || "",
    bloodGroup: emp.blood_group || "",
    panId: emp.pan_id || "",
    personalEmail: emp.personal_email || "",
    alternateContact: emp.alternate_contact || "",
    currentAddress: emp.current_address || "",
    permanentAddress: emp.permanent_address || "",
    city: emp.city || "",
    state: emp.state || "",
    country: emp.country || "",
    postalCode: emp.postal_code || "",
    primarySkills: emp.primary_skills || "",
    secondarySkills: emp.secondary_skills || "",
    tools: emp.tools || "",
    emergencyName: emp.emergency_name || "",
    emergencyRelationship: emp.emergency_relationship || "",
    emergencyContact: emp.emergency_contact || "",
    accountHolder: emp.account_holder || "",
    bankName: emp.bank_name || "",
    accountNumber: emp.account_number || "",
    ifsc: emp.ifsc || "",
    branch: emp.branch || "",
    incentivePercentage: emp.incentive_percentage !== undefined && emp.incentive_percentage !== null ? Number(emp.incentive_percentage) : 5.0,
  };
};

const mapFrontendToDb = (prof) => {
  const [first_name, ...last_name_parts] = (prof.fullName || "").split(" ");
  const last_name = last_name_parts.join(" ") || ".";
  return {
    first_name: first_name || "Sales",
    last_name: last_name || "Executive",
    name: prof.fullName,
    phone: prof.phone,
    mobile: prof.phone,
    gender: prof.gender,
    employment_type: prof.employmentType,
    work_mode: prof.workMode,
    work_location: prof.workLocation,
    date_of_birth: prof.dob,
    marital_status: prof.maritalStatus,
    blood_group: prof.bloodGroup,
    pan_id: prof.panId,
    personal_email: prof.personalEmail,
    alternate_contact: prof.alternateContact,
    current_address: prof.currentAddress,
    permanent_address: prof.permanentAddress,
    city: prof.city,
    state: prof.state,
    country: prof.country,
    postal_code: prof.postalCode,
    primary_skills: prof.primarySkills,
    secondary_skills: prof.secondarySkills,
    tools: prof.tools,
    emergency_name: prof.emergencyName,
    emergency_relationship: prof.emergencyRelationship,
    emergency_contact: prof.emergencyContact,
    account_holder: prof.accountHolder,
    bank_name: prof.bankName,
    account_number: prof.accountNumber,
    ifsc: prof.ifsc,
    branch: prof.branch,
    incentive_percentage: prof.incentivePercentage !== undefined && prof.incentivePercentage !== null ? Number(prof.incentivePercentage) : 5.0,
  };
};

export default function SalesLayout() {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [notifCount, setNotifCount] = useState(0);
  const [gpsActive, setGpsActive] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [myProfileOpen, setMyProfileOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showProfileConfirm, setShowProfileConfirm] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const navigate = useNavigate();

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();

  const seName = user.name || user.full_name || "Sales Executive";
  const seEmail = user.email || "executive@tconnect.com";
  const empCode = user.employee_code || user.employee_id || "EMP000012";
  const seRole = user.role || "Sales Executive";
  const seInitials = (seName.split(" ").map((w) => w[0]).join("").slice(0, 2) || "SE").toUpperCase();

  // ── Supabase & Background Tracking Pipeline ──────────────────────────────
  const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPA_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const supabaseRef = useRef(null);
  const activeChannelRef = useRef(null);
  const gpsWatchRef = useRef(null);
  const activeSessionRef = useRef(null);
  const lastPushedPosRef = useRef(null);
  const gpsRetryQueue = useRef([]);

  useEffect(() => {
    if (SUPA_URL && SUPA_ANON && !supabaseRef.current) {
      supabaseRef.current = createClient(SUPA_URL, SUPA_ANON);
    }
  }, [SUPA_URL, SUPA_ANON]);

  const _pushGpsPoint = useCallback(async ({ lat, lng, accuracy = 10, speed = null, heading = null, sessionId }) => {
    const empId = user.employee_id || user.auth_user_id || user.id || empCode;
    
    // Client-side dedup: skip if < 10 m from last accepted point
    if (lastPushedPosRef.current) {
      const dlat = lat - lastPushedPosRef.current.lat;
      const dlng = lng - lastPushedPosRef.current.lng;
      const approxM = Math.sqrt(dlat * dlat + dlng * dlng) * 111000;
      if (approxM < 10) return;
    }

    const point = { 
      id: Math.random().toString(36).substring(7),
      employee_id: empId, 
      latitude: lat, 
      longitude: lng, 
      accuracy, 
      speed, 
      heading, 
      recorded_at: new Date().toISOString() 
    };

    // 1. Broadcast immediately for near-real-time live map updates
    if (activeChannelRef.current) {
      activeChannelRef.current.send({
        type: 'broadcast',
        event: 'location',
        payload: {
          ...point,
          broadcast_sent_at: Date.now()
        }
      });
    }

    // 2. Persist to DB asynchronously
    const dbPoint = { latitude: lat, longitude: lng, accuracy, speed, heading, session_id: sessionId };
    try {
      spatialAPI.pushLocation(dbPoint).catch(() => null);
      lastPushedPosRef.current = { lat, lng };
      spatialAPI.updateLocation({ latitude: lat, longitude: lng, accuracy }).catch(() => null);
    } catch {
      // Queue for retry (cap at 20 points)
      if (gpsRetryQueue.current.length < 20) {
        gpsRetryQueue.current.push(dbPoint);
      }
    }
  }, [user, empCode]);

  const _flushRetryQueue = useCallback(async () => {
    const queue = gpsRetryQueue.current.splice(0);
    for (const pt of queue) {
      try {
        await spatialAPI.pushLocation(pt);
      } catch {
        break;
      }
    }
  }, []);

  const _startGpsTracking = useCallback((initLat, initLng, clientData = {}, sessionId = null) => {
    if (!navigator.geolocation) {
      showToast("GPS not available on this device.", "warning");
      return;
    }

    const empId = user.employee_id || user.auth_user_id || user.id || empCode;
    const resolvedSessionId = sessionId || localStorage.getItem('tc_tracking_session');
    
    activeSessionRef.current = resolvedSessionId;
    setGpsActive(true);

    // Initialize Supabase Broadcast channel
    if (supabaseRef.current && resolvedSessionId) {
      if (activeChannelRef.current) {
        try { activeChannelRef.current.unsubscribe(); } catch {}
      }
      const chName = `tracking_${empId}_${resolvedSessionId}`;
      const channel = supabaseRef.current.channel(chName);
      channel.subscribe();
      activeChannelRef.current = channel;
    }

    // Push starting point if available
    if (initLat && initLng && resolvedSessionId) {
      _pushGpsPoint({ lat: initLat, lng: initLng, accuracy: 10, sessionId: resolvedSessionId });
    }

    // Start continuous watchPosition
    if (gpsWatchRef.current !== null) {
      navigator.geolocation.clearWatch(gpsWatchRef.current);
    }

    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, speed, heading } = pos.coords;
        if (accuracy > 100) return; // reject inaccurate fix
        const currentSessId = activeSessionRef.current;
        _pushGpsPoint({ lat: latitude, lng: longitude, accuracy, speed, heading, sessionId: currentSessId });
      },
      (err) => {
        if (err.code === 1) {
          showToast("GPS permission denied — tracking paused.", "warning");
          setGpsActive(false);
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );

    window.addEventListener('online', _flushRetryQueue);
  }, [user, empCode, _pushGpsPoint, _flushRetryQueue, showToast]);

  const _stopGpsTracking = useCallback(() => {
    if (gpsWatchRef.current !== null) {
      navigator.geolocation.clearWatch(gpsWatchRef.current);
      gpsWatchRef.current = null;
    }
    window.removeEventListener('online', _flushRetryQueue);
    
    if (activeChannelRef.current) {
      try { activeChannelRef.current.unsubscribe(); } catch {}
      activeChannelRef.current = null;
    }

    activeSessionRef.current = null;
    setGpsActive(false);
  }, [_flushRetryQueue]);

  const _resumeGpsTracking = useCallback(async (savedSessionId) => {
    const empId = user.employee_id || user.auth_user_id || user.id || empCode;
    try {
      const res = await spatialAPI.getLocationHistory("self");
      const data = res?.data || res;
      const session = data?.session;
      
      // Strict validation
      if (session && session.status === 'active' && String(session.employee_id) === String(empId) && String(session.id) === String(savedSessionId)) {
        console.log("Validated session for resume:", session.id);
        _startGpsTracking(null, null, {}, session.id);
      } else {
        console.warn("Session in localStorage is inactive or invalid. Clearing cache.");
        localStorage.removeItem('tc_tracking_session');
        _stopGpsTracking();
      }
    } catch (err) {
      console.warn("Tracking resume validation failed:", err);
      if (err?.status === 401) {
        localStorage.removeItem('tc_tracking_session');
        _stopGpsTracking();
      }
    }
  }, [user, empCode, _startGpsTracking, _stopGpsTracking]);

  useEffect(() => {
    const handleStart = (e) => {
      const { lat, lng, clientData, sessionId } = e.detail || {};
      _startGpsTracking(lat, lng, clientData, sessionId);
    };
    const handleStop = () => {
      _stopGpsTracking();
    };

    window.addEventListener("tc:start-tracking", handleStart);
    window.addEventListener("tc:stop-tracking", handleStop);

    // Auto-resume check
    const savedSession = localStorage.getItem("tc_tracking_session");
    if (savedSession && !gpsWatchRef.current) {
      _resumeGpsTracking(savedSession);
    }

    return () => {
      window.removeEventListener("tc:start-tracking", handleStart);
      window.removeEventListener("tc:stop-tracking", handleStop);
      if (gpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
      }
      if (activeChannelRef.current) {
        try { activeChannelRef.current.unsubscribe(); } catch {}
      }
    };
  }, [user, _startGpsTracking, _stopGpsTracking, _resumeGpsTracking]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setOpen(true);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);



  // ── Profile Photo State ───────────────────────────────────────────────────
  const [profilePhoto, setProfilePhoto] = useState(() => {
    try {
      return localStorage.getItem("tc_se_photo") || null;
    } catch {
      return null;
    }
  });

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Please upload an image file (JPG, PNG, etc.)", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setProfilePhoto(dataUrl);
      try {
        localStorage.setItem("tc_se_photo", dataUrl);
      } catch (err) { }
      showToast("Profile photo updated!", "success");
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setProfilePhoto(null);
    try {
      localStorage.removeItem("tc_se_photo");
    } catch (err) { }
    showToast("Profile photo removed.", "info");
  };

  // ── Profile Data State ────────────────────────────────────────────────────
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem("tc_se_profile");
      return {
        ...PROFILE_DEFAULTS,
        fullName: seName,
        officialEmail: seEmail,
        employeeId: empCode,
        accountHolder: seName,
        ...(saved ? JSON.parse(saved) : {}),
      };
    } catch {
      return { ...PROFILE_DEFAULTS, fullName: seName, officialEmail: seEmail, employeeId: empCode, accountHolder: seName };
    }
  });

  useEffect(() => {
    if (!myProfileOpen) return;

    // Load local cache immediately
    try {
      const saved = localStorage.getItem("tc_se_profile");
      if (saved) {
        setProfile(JSON.parse(saved));
      }
      const savedPhoto = localStorage.getItem("tc_se_photo");
      if (savedPhoto) {
        setProfilePhoto(savedPhoto);
      }
    } catch (e) { }

    // Fetch live data from Supabase using "self" — backend resolves to current user's real UUID
    hrmsAPI.getEmployeeById("self")
      .then((res) => {
        if (res && res.data) {
          const emp = res.data;
          const mapped = {
            ...PROFILE_DEFAULTS,
            ...mapDbToFrontend(emp),
          };
          setProfile(mapped);
          localStorage.setItem("tc_se_profile", JSON.stringify(mapped));
          if (emp.profile_photo) {
            setProfilePhoto(emp.profile_photo);
            localStorage.setItem("tc_se_photo", emp.profile_photo);
          }
          if (emp.documents) {
            try {
              const parsed = JSON.parse(emp.documents);
              if (Array.isArray(parsed) && parsed.length > 0) {
                const currentStr = JSON.stringify(documentsList);
                const parsedStr = JSON.stringify(parsed);
                if (currentStr !== parsedStr) {
                  setDocumentsList(parsed);
                  localStorage.setItem("tc_se_documents", parsedStr);
                  localStorage.setItem("tc_se_documents_synced", parsedStr);
                }
              }
            } catch (err) {}
          }
        }
      })
      .catch((err) => {
        console.warn("Could not retrieve online profile data:", err);
      });
  }, [myProfileOpen]);

  const saveProfile = async (keepEditing = false) => {
    try {
      const code = user.employee_id || user.auth_user_id || user.id || empCode;
      if (!code) {
        throw new Error("No employee identifier found.");
      }
      
      console.log("PROFILE BEFORE SAVE", profile);
      
      const dbPayload = mapFrontendToDb(profile);
      for (const key of Object.keys(dbPayload)) {
        if (dbPayload[key] === "" || dbPayload[key] === undefined) {
          dbPayload[key] = null;
        }
      }
      if (profilePhoto) {
        dbPayload.profile_photo = profilePhoto;
      }
      dbPayload.documents = JSON.stringify(documentsList);
      
      const res = await hrmsAPI.updateEmployee("self", dbPayload);
      console.log("SAVE RESPONSE", res);
      
      // Explicitly fetch the fresh record from the database to guarantee representation parity
      const freshRes = await hrmsAPI.getEmployeeById("self");
      const freshEmployee = freshRes && freshRes.data ? freshRes.data : {};
      console.log("FRESH PROFILE FROM DB", freshEmployee);
      
      const normalizedProfile = {
        ...PROFILE_DEFAULTS,
        ...mapDbToFrontend(freshEmployee),
      };
      console.log("NORMALIZED PROFILE", normalizedProfile);
      
      setProfile(normalizedProfile);
      localStorage.setItem("tc_se_profile", JSON.stringify(normalizedProfile));
      
      if (freshEmployee.profile_photo) {
        setProfilePhoto(freshEmployee.profile_photo);
        localStorage.setItem("tc_se_photo", freshEmployee.profile_photo);
      }
      if (freshEmployee.documents) {
        try {
          const parsed = JSON.parse(freshEmployee.documents);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setDocumentsList(parsed);
            localStorage.setItem("tc_se_documents", JSON.stringify(parsed));
          }
        } catch (err) {}
      }
      
      showToast("Profile synced online to Supabase!", "success");
      if (!keepEditing) {
        setEditMode(false);
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.detail
        ? (typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail))
        : (err.message || "Failed to save profile");
      showToast(`Error: ${errMsg}`, "error");
    }
  };

  const handleProfileKeyDown = (e) => {
    if (!editMode) return;
    if (e.key === "Enter") {
      // Keep textarea Enter behavior normal (new line)
      if (e.target && e.target.tagName === "TEXTAREA") {
        return;
      }
      // Only apply on desktop/laptop physical keyboards
      const isMobile = /Mobi|Android|iPhone|iPad|Windows Phone/i.test(navigator.userAgent);
      if (isMobile) {
        return;
      }
      e.preventDefault();
      // Open confirmation modal
      setShowProfileConfirm(true);
    }
  };


  const fp = (field, readOnly = false) =>
    editMode && !readOnly ? (
      <input
        value={profile[field] || ""}
        onChange={(e) => setProfile((p) => ({ ...p, [field]: e.target.value }))}
        className="text-sm font-semibold text-slate-900 border-b border-teal-500 focus:outline-none bg-transparent w-full"
      />
    ) : (
      <span className="text-sm font-semibold text-slate-900">{profile[field] || "—"}</span>
    );

  // ── Documents State ────────────────────────────────────────────────────────
  const [documentsList, setDocumentsList] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("tc_se_documents") || "[]");
      return saved.length > 0 ? saved : DOCUMENT_DEFAULTS;
    } catch {
      return DOCUMENT_DEFAULTS;
    }
  });

  useEffect(() => {
    try {
      const currentStr = JSON.stringify(documentsList);
      localStorage.setItem("tc_se_documents", currentStr);

      const savedStr = localStorage.getItem("tc_se_documents_synced");
      if (savedStr === currentStr) {
        return;
      }

      const code = user.employee_id || user.auth_user_id || user.id || empCode;
      if (code) {
        hrmsAPI.updateEmployee("self", { documents: currentStr })
          .then(() => {
            localStorage.setItem("tc_se_documents_synced", currentStr);
          })
          .catch((err) => console.warn("Auto-sync documents failed:", err));
      }
    } catch (err) { }
  }, [documentsList, empCode, user.employee_id, user.auth_user_id, user.id]);

  useEffect(() => {
    try {
      const notifsStr = localStorage.getItem("tc_app_notifications");
      if (notifsStr) {
        const notifs = JSON.parse(notifsStr);
        const myEmail = (user.email || "").toLowerCase();
        const unread = notifs.filter((n) => !n.read && (!n.recipientEmail || n.recipientEmail.toLowerCase() === myEmail)).length;
        setNotifCount(unread);
      }
    } catch (e) { }
  }, [user.email]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          if (gpsWatchRef.current) {
            setGpsActive(true);
          }
        },
        () => setGpsActive(false)
      );
    }
  }, []);

  const handleLogout = async () => {
    const sessionId = localStorage.getItem('tc_tracking_session');
    if (sessionId) {
      try {
        await spatialAPI.endSession({ session_id: sessionId }).catch(() => {});
      } catch (e) {}
    }
    clearUserCache();
    showToast("Logged out successfully", "info");
    window.location.href = "/";
  };

  const menus = [
    { title: "Dashboard", icon: LayoutDashboard, path: "/sales/dashboard" },
    { title: "Smart Map", icon: MapPin, path: "/sales/map" },
    { title: "Leads", icon: Users, path: "/sales/leads" },
    { title: "Customers", icon: UserCheck, path: "/sales/customers" },
    { title: "Client Log", icon: ClipboardList, path: "/sales/client-log" },
    { title: "Expenses", icon: BadgeDollarSign, path: "/sales/expenses" },
    { title: "HRMS", icon: ShieldCheck, path: "/sales/hrms" },
    { title: "Tasks", icon: CheckSquare, path: "/sales/todo" },
  ];

  const userEmail = (user?.email || "").toLowerCase().trim();
  const [sidebarItems, setSidebarItems] = useState(() => {
    const saved = localStorage.getItem(`tc_sidebar_order_sales_${userEmail}`);
    if (saved) {
      try {
        const titles = JSON.parse(saved);
        const ordered = [];
        titles.forEach(title => {
          const match = menus.find(m => m.title === title);
          if (match) ordered.push(match);
        });
        menus.forEach(m => {
          if (!ordered.some(o => o.title === m.title)) {
            ordered.push(m);
          }
        });
        return ordered;
      } catch (e) {
        return menus;
      }
    }
    return menus;
  });

  useEffect(() => {
    const saved = localStorage.getItem(`tc_sidebar_order_sales_${userEmail}`);
    if (saved) {
      try {
        const titles = JSON.parse(saved);
        const ordered = [];
        titles.forEach(title => {
          const match = menus.find(m => m.title === title);
          if (match) ordered.push(match);
        });
        menus.forEach(m => {
          if (!ordered.some(o => o.title === m.title)) {
            ordered.push(m);
          }
        });
        setSidebarItems(ordered);
      } catch (e) {
        setSidebarItems(menus);
      }
    } else {
      setSidebarItems(menus);
    }
  }, [userEmail]);

  const [isCustomizing, setIsCustomizing] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e, index) => {
    e.preventDefault();
  };
  const handleDrop = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const reordered = [...sidebarItems];
    const [draggedItem] = reordered.splice(draggedIndex, 1);
    reordered.splice(index, 0, draggedItem);
    setSidebarItems(reordered);
  };
  const handleDragEnd = () => {
    setDraggedIndex(null);
  };
  const saveCustomization = () => {
    const titles = sidebarItems.map(item => item.title);
    localStorage.setItem(`tc_sidebar_order_sales_${userEmail}`, JSON.stringify(titles));
    setIsCustomizing(false);
    showToast("Sidebar layout order saved successfully!", "success");
  };
  const resetCustomization = () => {
    localStorage.removeItem(`tc_sidebar_order_sales_${userEmail}`);
    setSidebarItems(menus);
    setIsCustomizing(false);
    showToast("Sidebar layout reset to default.", "info");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans relative overflow-x-hidden">
      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30 shadow-xs flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen(!open)}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer shrink-0"
            aria-label="Toggle Navigation Sidebar"
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <Link to="/sales/dashboard" className="flex items-center gap-2.5">
            <TwiteConnectLogo className="w-9 h-9" />
          </Link>
        </div>

        {/* Right Header Navigation */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* MY PROFILE BUTTON */}
          <button
            onClick={() => {
              setMyProfileOpen(true);
              setShowUserMenu(false);
              setEditMode(false);
            }}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold shadow-xs transition cursor-pointer"
          >
            <UserCircle size={15} /> My Profile
          </button>

          <button
            onClick={() => navigate("/sales/notifications")}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 relative transition cursor-pointer"
          >
            <Bell size={19} />
            {notifCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-black">
                {notifCount}
              </span>
            )}
          </button>

          {/* Profile Menu Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-teal-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-teal-500/20 shrink-0">
                {profilePhoto ? (
                  <img src={profilePhoto} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  seInitials
                )}
              </div>
              <div className="hidden sm:block text-left min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate max-w-[100px]">{seName}</p>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{seRole}</p>
              </div>
              <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
            </button>

            {/* Profile Menu Dropdown */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowUserMenu(false);
                  }}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 space-y-1">
                  <div className="p-2.5 bg-slate-50 rounded-xl space-y-0.5">
                    <p className="text-xs font-black text-slate-900 truncate">{seName}</p>
                    <p className="text-[11px] text-slate-500 truncate">{seEmail}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setShowUserMenu(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  >
                    <LogOut size={14} /> Log Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Layout Wrapper ───────────────────────────────────────────── */}
      <div className="flex flex-1 min-w-0 relative">
        {/* Backdrop for mobile drawer */}
        {open && (
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-30 lg:hidden transition-opacity"
          />
        )}

        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static pt-16 lg:pt-0 shrink-0 flex flex-col ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Note: Sidebar header logo row is completely removed to match Manager layout */}

          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {sidebarItems.map((m, index) => (
              <div
                key={m.path}
                draggable={isCustomizing}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`relative ${isCustomizing ? "cursor-move animate-pulse border border-dashed border-teal-200 rounded-xl" : ""}`}
              >
                <NavLink
                  to={isCustomizing ? "#" : m.path}
                  onClick={(e) => {
                    if (isCustomizing) {
                      e.preventDefault();
                      return;
                    }
                    if (isMobile) setOpen(false);
                  }}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-black transition ${!isCustomizing && isActive ? "bg-teal-600 text-white shadow-md shadow-teal-600/30" : "text-slate-600 hover:bg-teal-50 hover:text-teal-900"
                    } ${(!open && isMobile) ? "justify-center" : ""}`
                  }
                  title={(!open && isMobile) ? m.title : undefined}
                >
                  {isCustomizing && (open || !isMobile) && <GripVertical size={14} className="text-slate-400 shrink-0 mr-1" />}
                  <m.icon size={18} className="flex-shrink-0" />
                  {(open || !isMobile) && <span className="truncate">{m.title}</span>}
                </NavLink>
              </div>
            ))}
            {(open || !isMobile) && (
              <div className="pt-2">
                {isCustomizing ? (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5 px-1">
                    <button
                      type="button"
                      onClick={saveCustomization}
                      className="w-full py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-[11px] font-black transition cursor-pointer"
                    >
                      Save Order
                    </button>
                    <button
                      type="button"
                      onClick={resetCustomization}
                      className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[11px] font-black transition cursor-pointer"
                    >
                      Reset Default
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsCustomizing(true)}
                    className="w-full py-2 px-3 border border-dashed border-slate-200 hover:border-teal-400 text-slate-500 hover:text-teal-600 rounded-xl text-[10px] font-black tracking-wider uppercase transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>⚙️ Customize Sidebar</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-slate-100 flex-shrink-0">
            {(open || !isMobile) ? (
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200">
                {gpsActive ? <Wifi size={16} className="text-green-600 shrink-0" /> : <WifiOff size={16} className="text-slate-400 shrink-0" />}
                <div className="min-w-0">
                  <p className={`text-xs font-bold ${gpsActive ? "text-green-700" : "text-slate-500"}`}>GPS Location</p>
                  <p className={`text-[10px] truncate ${gpsActive ? "text-green-600" : "text-slate-400"}`}>
                    {gpsActive ? "Live GPS Active" : "GPS Ready"}
                  </p>
                </div>
                {gpsActive && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0 ml-auto" />}
              </div>
            ) : (
              <div className="flex justify-center">
                {gpsActive ? <Wifi size={18} className="text-green-600" /> : <WifiOff size={18} className="text-slate-400" />}
              </div>
            )}
          </div>
        </aside>

        {/* Page Content Container */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 overflow-y-auto min-w-0 pb-20 lg:pb-6">
          <Outlet />
        </main>

        {/* ── Mobile Bottom Navigation Dock ────────────────────────── */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 px-2 py-1.5 flex items-center justify-around shadow-lg">
          <NavLink to="/sales/dashboard" className={({ isActive }) => `flex flex-col items-center gap-0.5 p-1 rounded-xl font-black text-[10px] transition ${isActive ? 'text-teal-600' : 'text-slate-500'}`}>
            <LayoutDashboard size={18} />
            <span>Home</span>
          </NavLink>
          <NavLink to="/sales/map" className={({ isActive }) => `flex flex-col items-center gap-0.5 p-1 rounded-xl font-black text-[10px] transition ${isActive ? 'text-teal-600' : 'text-slate-500'}`}>
            <MapPin size={18} />
            <span>Map</span>
          </NavLink>
          <NavLink to="/sales/attendance" className={({ isActive }) => `flex flex-col items-center gap-0.5 p-1 rounded-xl font-black text-[10px] transition ${isActive ? 'text-teal-600' : 'text-slate-500'}`}>
            <MapPinned size={18} />
            <span>Attendance</span>
          </NavLink>
          <NavLink to="/sales/leads" className={({ isActive }) => `flex flex-col items-center gap-0.5 p-1 rounded-xl font-black text-[10px] transition ${isActive ? 'text-teal-600' : 'text-slate-500'}`}>
            <Users size={18} />
            <span>Leads</span>
          </NavLink>
          <NavLink to="/sales/hrms" className={({ isActive }) => `flex flex-col items-center gap-0.5 p-1 rounded-xl font-black text-[10px] transition ${isActive ? 'text-teal-600' : 'text-slate-500'}`}>
            <ShieldCheck size={18} />
            <span>HRMS</span>
          </NavLink>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          EXECUTIVE MY PROFILE SLIDE-OVER PANEL
      ══════════════════════════════════════════════════════════════════════ */}
      {myProfileOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => {
              setMyProfileOpen(false);
              setEditMode(false);
            }}
          />

          <div 
            onKeyDown={handleProfileKeyDown}
            className="w-full max-w-2xl bg-slate-50 h-full overflow-y-auto flex flex-col shadow-2xl border-l border-slate-200"
          >
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <UserCircle size={20} className="text-teal-600" />
                <h2 className="text-base font-black text-slate-900">Executive Profile</h2>
              </div>
              <div className="flex items-center gap-2">
                {editMode ? (
                  <>
                    <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg select-none">
                      <kbd className="font-mono bg-white border border-slate-200 text-slate-500 rounded px-1 py-0.5 text-[9px] shadow-xs">↵ Enter</kbd>
                      to save
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowProfileConfirm(true)}
                      className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-teal-600 text-white cursor-pointer hover:bg-teal-700 transition flex items-center gap-1"
                      title="Click or press Enter to choose save action"
                    >
                      <Save size={13} /> Done
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditMode(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-teal-600 text-white cursor-pointer hover:bg-teal-700 transition flex items-center gap-1"
                  >
                    <Pencil size={13} /> Edit Profile
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMyProfileOpen(false);
                    setEditMode(false);
                  }}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Profile Avatar Card */}
            <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-center gap-5">
              <div className="relative shrink-0 group">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white font-black text-3xl shadow-xl ring-4 ring-teal-400/20">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    seInitials
                  )}
                </div>

                <label
                  htmlFor="se_profile_photo"
                  className="absolute inset-0 rounded-full flex items-center justify-center bg-slate-900/50 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                  title="Upload profile photo"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <Camera size={20} className="text-white" />
                    <span className="text-[9px] font-extrabold text-white tracking-wider uppercase">Change</span>
                  </div>
                </label>
                <input
                  type="file"
                  id="se_profile_photo"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handlePhotoUpload}
                />

                {profilePhoto && (
                  <button
                    onClick={removePhoto}
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md cursor-pointer transition"
                    title="Remove photo"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-black text-slate-900">{profile.fullName || seName}</h2>
                <p className="text-sm text-slate-500 font-semibold">
                  {profile.employeeId} · {profile.team} · {profile.designation}
                </p>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-extrabold">
                  ✅ Active Executive
                </span>
                <div className="pt-0.5">
                  <label
                    htmlFor="se_profile_photo"
                    className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-300 px-2.5 py-1 rounded-lg cursor-pointer transition"
                  >
                    <Camera size={11} /> {profilePhoto ? "Change Photo" : "Upload Profile Photo"}
                  </label>
                </div>
              </div>
            </div>

            {/* Profile Sections */}
            <div className="p-5 space-y-4">
              {/* Work Details */}
              <Section icon={Briefcase} title="Work Details">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="Full Name" value={profile.fullName} editMode={editMode} onChange={(val) => setProfile((p) => ({ ...p, fullName: val }))} />
                  <Field label="Employee ID" value={profile.employeeId} editMode={editMode} readOnly={true} onChange={(val) => setProfile((p) => ({ ...p, employeeId: val }))} />
                  <Field label="Official Email" value={profile.officialEmail} editMode={editMode} readOnly={true} onChange={(val) => setProfile((p) => ({ ...p, officialEmail: val }))} />
                  <Field label="Phone Number" value={profile.phone} editMode={editMode} onChange={(val) => setProfile((p) => ({ ...p, phone: val }))} />
                  <Field label="Role" value={profile.role} editMode={editMode} readOnly={true} onChange={(val) => setProfile((p) => ({ ...p, role: val }))} />
                  <Field label="Team" value={profile.team} editMode={editMode} readOnly={true} onChange={(val) => setProfile((p) => ({ ...p, team: val }))} />
                  <Field label="Designation" value={profile.designation} editMode={editMode} readOnly={true} onChange={(val) => setProfile((p) => ({ ...p, designation: val }))} />
                  <Field label="Gender" value={profile.gender} editMode={editMode} onChange={(val) => setProfile((p) => ({ ...p, gender: val }))} />
                  <Field label="Employment Type" value={profile.employmentType} editMode={editMode} onChange={(val) => setProfile((p) => ({ ...p, employmentType: val }))} />
                  <Field label="Employment Status" value={profile.employmentStatus} editMode={editMode} readOnly={true} onChange={(val) => setProfile((p) => ({ ...p, employmentStatus: val }))} />
                  <Field label="Join Date" value={profile.joinDate} editMode={editMode} readOnly={true} onChange={(val) => setProfile((p) => ({ ...p, joinDate: val }))} />
                  <Field label="Work Mode" value={profile.workMode} editMode={editMode} onChange={(val) => setProfile((p) => ({ ...p, workMode: val }))} />
                  <Field label="Work Location" value={profile.workLocation} editMode={editMode} onChange={(val) => setProfile((p) => ({ ...p, workLocation: val }))} />
                  <Field label="Reporting Manager" value={profile.reportingManager} editMode={editMode} readOnly={true} onChange={(val) => setProfile((p) => ({ ...p, reportingManager: val }))} />
                </div>
              </Section>

              {/* Personal Details */}
              <Section icon={HeartPulse} title="Personal Details">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="Date of Birth" value={profile.dob} editMode={editMode} onChange={(val) => setProfile((p) => ({ ...p, dob: val }))} />
                  <Field label="Marital Status" value={profile.maritalStatus} editMode={editMode} onChange={(val) => setProfile((p) => ({ ...p, maritalStatus: val }))} />
                  <Field label="Blood Group" value={profile.bloodGroup} editMode={editMode} onChange={(val) => setProfile((p) => ({ ...p, bloodGroup: val }))} />
                  <Field label="PAN ID" value={profile.panId} editMode={editMode} onChange={(val) => setProfile((p) => ({ ...p, panId: val }))} />
                  <Field label="Personal Email" value={profile.personalEmail} editMode={editMode} onChange={(val) => setProfile((p) => ({ ...p, personalEmail: val }))} />
                  <Field label="Alternate Contact" value={profile.alternateContact} editMode={editMode} onChange={(val) => setProfile((p) => ({ ...p, alternateContact: val }))} />
                  <Field label="City" value={profile.city} editMode={editMode} onChange={(val) => setProfile((p) => ({ ...p, city: val }))} />
                  <Field label="State" value={profile.state} editMode={editMode} onChange={(val) => setProfile((p) => ({ ...p, state: val }))} />
                  <Field label="Country" value={profile.country} editMode={editMode} onChange={(val) => setProfile((p) => ({ ...p, country: val }))} />
                  <Field label="Postal Code" value={profile.postalCode} editMode={editMode} onChange={(val) => setProfile((p) => ({ ...p, postalCode: val }))} />
                </div>
                <div className="grid grid-cols-1 gap-4 mt-2">
                  <Field label="Current Address" value={profile.currentAddress} editMode={editMode} onChange={(val) => setProfile((p) => ({ ...p, currentAddress: val }))} />
                  <Field label="Permanent Address" value={profile.permanentAddress} editMode={editMode} onChange={(val) => setProfile((p) => ({ ...p, permanentAddress: val }))} />
                </div>
              </Section>

              {/* Skills & Technologies */}
              <Section icon={Code2} title="Skills & Technologies">
                <div className="grid grid-cols-1 gap-4">
                  <Field label="Primary Skills" value={profile.primarySkills} editMode={editMode} onChange={(val) => setProfile((p) => ({ ...p, primarySkills: val }))} />
                  <Field label="Secondary Skills" value={profile.secondarySkills} editMode={editMode} onChange={(val) => setProfile((p) => ({ ...p, secondarySkills: val }))} />
                  <Field label="Tools & Technologies" value={profile.tools} editMode={editMode} onChange={(val) => setProfile((p) => ({ ...p, tools: val }))} />
                </div>
              </Section>

              {/* Emergency Contact */}
              <Section icon={AlertCircle} title="Emergency Contact" color="rose">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="Name" value={profile.emergencyName} editMode={editMode} onChange={(val) => setProfile((p) => ({ ...p, emergencyName: val }))} />
                  <Field label="Relationship" value={profile.emergencyRelationship} editMode={editMode} onChange={(val) => setProfile((p) => ({ ...p, emergencyRelationship: val }))} />
                  <Field label="Contact Number" value={profile.emergencyContact} editMode={editMode} onChange={(val) => setProfile((p) => ({ ...p, emergencyContact: val }))} />
                </div>
              </Section>

              {/* Bank Details */}
              <Section icon={CreditCard} title="Bank Details" color="emerald">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="Account Holder" value={profile.accountHolder} editMode={editMode} onChange={(val) => setProfile((p) => ({ ...p, accountHolder: val }))} />
                  <Field label="Bank Name" value={profile.bankName} editMode={editMode} onChange={(val) => setProfile((p) => ({ ...p, bankName: val }))} />
                  <Field label="Account Number" value={profile.accountNumber} editMode={editMode} onChange={(val) => setProfile((p) => ({ ...p, accountNumber: val }))} />
                  <Field label="IFSC Code" value={profile.ifsc} editMode={editMode} onChange={(val) => setProfile((p) => ({ ...p, ifsc: val }))} />
                  <Field label="Branch" value={profile.branch} editMode={editMode} onChange={(val) => setProfile((p) => ({ ...p, branch: val }))} />
                </div>
              </Section>

              {/* ── MY DOCUMENTS ─────────────────────────────────────────── */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <FileUp size={16} className="text-teal-600" />
                  <h3 className="font-black text-slate-900 text-sm">My Documents</h3>
                </div>

                <div className="divide-y divide-slate-100">
                  {documentsList.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-extrabold text-slate-900">{doc.name}</p>
                        {(() => {
                          if (doc.status === 'approved') {
                            return (
                              <p className="text-[11px] font-semibold mt-0.5 text-emerald-600">
                                ✅ Approved — {doc.fileName}
                              </p>
                            )
                          } else if (doc.status === 'rejected') {
                            return (
                              <p className="text-[11px] font-semibold mt-0.5 text-rose-600">
                                ❌ Rejected (Please re-upload)
                              </p>
                            )
                          } else if (doc.status === 'uploaded') {
                            return (
                              <p className="text-[11px] font-semibold mt-0.5 text-amber-600 font-bold">
                                ⏳ Pending Approval — {doc.fileName}
                              </p>
                            )
                          } else {
                            return (
                              <p className="text-[11px] font-semibold mt-0.5 text-slate-400">
                                📄 Required — not uploaded yet
                              </p>
                            )
                          }
                        })()}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="file"
                          id={`se_doc_${doc.id}`}
                          className="hidden"
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setDocumentsList((prev) =>
                                prev.map((item) =>
                                  item.id === doc.id
                                    ? { ...item, status: "uploaded", fileName: file.name, fileUrl: ev.target.result }
                                    : item
                                )
                              );
                              showToast(`${file.name} uploaded!`, "success");
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                        {(doc.status === "uploaded" || doc.status === "approved") && (
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            className="text-xs font-extrabold px-2.5 py-1.5 rounded-xl bg-teal-50 text-teal-800 border border-teal-300 cursor-pointer flex items-center gap-1 hover:bg-teal-100 transition"
                          >
                            <Eye size={12} /> View
                          </button>
                        )}
                        {doc.status !== "approved" && (
                          <button
                            onClick={() => document.getElementById(`se_doc_${doc.id}`)?.click()}
                            className="text-xs font-extrabold px-2.5 py-1.5 rounded-xl bg-slate-900 text-white cursor-pointer flex items-center gap-1 hover:bg-slate-700 transition"
                          >
                            <Upload size={12} /> {doc.status === "uploaded" ? "Re-upload" : "Upload"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <input
                  type="file"
                  id="se_doc_custom"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      setDocumentsList((prev) => [
                        ...prev,
                        {
                          id: `doc_se_${Date.now()}`,
                          name: file.name.split(".")[0],
                          status: "uploaded",
                          fileName: file.name,
                          fileUrl: ev.target.result,
                        },
                      ]);
                      showToast(`${file.name} uploaded!`, "success");
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                <div
                  onClick={() => document.getElementById("se_doc_custom")?.click()}
                  className="border-2 border-dashed border-teal-300 hover:border-teal-500 bg-teal-50/30 hover:bg-teal-50/60 rounded-2xl p-6 text-center transition cursor-pointer group"
                >
                  <FileUp size={28} className="text-teal-600 group-hover:scale-110 transition mx-auto mb-2" />
                  <p className="text-sm font-black text-slate-900">Click to upload additional document</p>
                  <p className="text-[11px] font-bold text-slate-500 mt-1">PDF, JPG, PNG, Word, Excel supported</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900">{previewDoc.name}</h3>
                <p className="text-xs text-slate-400">{previewDoc.fileName}</p>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer">
                <X size={20} />
              </button>
            </div>
            {previewDoc.fileUrl?.startsWith("data:image") ? (
              <img src={previewDoc.fileUrl} alt={previewDoc.name} className="w-full max-h-96 object-contain rounded-xl border border-slate-200" />
            ) : previewDoc.fileUrl?.startsWith("data:application/pdf") ? (
              <iframe src={previewDoc.fileUrl} title={previewDoc.name} className="w-full h-96 rounded-xl border border-slate-200" />
            ) : (
              <div className="bg-slate-50 rounded-xl p-6 text-center text-slate-400 text-sm">Preview not available for this file type.</div>
            )}
          </div>
        </div>
      )}

      {/* Profile Changes Confirmation Modal */}
      {showProfileConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-black text-slate-900">Profile Changes</h3>
            <p className="text-sm text-slate-600 font-semibold">What would you like to do?</p>
            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={async () => {
                  await saveProfile(true);
                  setShowProfileConfirm(false);
                }}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-extrabold bg-teal-600 text-white hover:bg-teal-700 transition cursor-pointer shadow-sm"
              >
                Continue Editing
              </button>
              <button
                type="button"
                onClick={async () => {
                  await saveProfile(false);
                  setShowProfileConfirm(false);
                }}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-extrabold bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer shadow-sm"
              >
                Save & Exit
              </button>
              <button
                type="button"
                onClick={() => setShowProfileConfirm(false)}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-extrabold bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <p className="text-center text-[10px] text-slate-400 font-medium pt-1">
                Cancel keeps edit mode active — no changes are saved.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Root Level Sub-Components (fixes React focus loss bug) ──────────────────
const Section = ({ icon: Icon, title, color = "teal", children }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
      <Icon size={16} className={`text-${color}-600`} />
      <h3 className="font-black text-slate-900 text-sm">{title}</h3>
    </div>
    {children}
  </div>
);

const Field = ({ label, value, editMode, onChange, readOnly = false }) => {
  const isDate = label.toLowerCase().includes('date') || label.toLowerCase().includes('dob') || label.toLowerCase().includes('birth');
  return (
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      {editMode ? (
        <input
          type={isDate ? "date" : "text"}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          readOnly={readOnly}
          className={`text-sm font-semibold text-slate-900 border-b border-teal-500 focus:outline-none bg-transparent w-full ${readOnly ? "opacity-60 cursor-not-allowed border-dashed border-slate-300" : ""
            }`}
        />
      ) : (
        <span className="text-sm font-semibold text-slate-900">{value || "—"}</span>
      )}
    </div>
  );
};