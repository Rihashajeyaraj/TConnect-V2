import React, { useState, useEffect, useRef, useCallback } from "react";
import ImageCropperModal from "../../common/ImageCropperModal.jsx";
import NotificationPermissionBanner from "../../common/NotificationPermissionBanner.jsx";
import useNotificationCount from "../../hooks/useNotificationCount.js";
import { NavLink, Outlet, useNavigate, Link, useLocation } from "react-router-dom";
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
  employeeId: "",
  officialEmail: "",
  phone: "",
  role: "Sales Executive",
  team: "Sales & Business Development",
  designation: "Field Sales Executive",
  gender: "",
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
  const { unreadCount: notifCount } = useNotificationCount();
  const [gpsActive, setGpsActive] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [myProfileOpen, setMyProfileOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showProfileConfirm, setShowProfileConfirm] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isMapPage = location.pathname === "/sales/map";

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();

  const seName = user.name || user.full_name || "Sales Executive";
  const seEmail = user.email || "";
  const empCode = user.employee_code || user.employee_id || "";
  const seRole = user.role || "Sales Executive";
  const seInitials = (seName.split(" ").map((w) => w[0]).join("").slice(0, 2) || "SE").toUpperCase();


  // ── Supabase & Background Tracking Pipeline ──────────────────────────────
  const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPA_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const supabaseRef = useRef(window.__supabase_client || null);
  const activeChannelsRef = useRef([]);
  const gpsWatchRef = useRef(null);
  const activeSessionRef = useRef(null);
  const lastPushedPosRef = useRef(null);
  const lastPushedTimeRef = useRef(0);
  const lastBroadcastPosRef = useRef(null);
  const lastBroadcastTimeRef = useRef(0);
  const gpsRetryQueue = useRef([]);
  const wakeLockRef = useRef(null);

  // ── Phase 2A Dual Benchmarking: FastAPI Parallel Direct WebSocket Transport ──
  const fastApiWsRef = useRef(null);
  const fastApiReconnectTimerRef = useRef(null);
  const fastApiBackoffMsRef = useRef(1000);

  const _initFastApiWebSocket = useCallback(() => {
    try {
      if (fastApiWsRef.current && (fastApiWsRef.current.readyState === WebSocket.OPEN || fastApiWsRef.current.readyState === WebSocket.CONNECTING)) {
        return;
      }
      const token = localStorage.getItem('token') || localStorage.getItem('access_token') || '';
      const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001/api/v1";
      const wsProto = apiBase.startsWith('https') ? 'wss' : 'ws';
      const wsHost = apiBase.replace(/^https?:\/\//, '').replace(/\/api\/v1\/?$/, '');
      const wsUrl = `${wsProto}://${wsHost}/api/v1/spatial/ws/tracking/executive?token=${encodeURIComponent(token)}`;

      console.log("[Phase 2A WS] Executive connecting to FastAPI WebSocket:", wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[Phase 2A WS] Executive FastAPI WebSocket connected successfully.");
        fastApiBackoffMsRef.current = 1000;
      };

      ws.onerror = (err) => {
        console.warn("[Phase 2A WS] Executive FastAPI WebSocket error notice:", err);
      };

      ws.onclose = () => {
        console.warn(`[Phase 2A WS] Executive FastAPI WebSocket closed. Reconnecting in ${fastApiBackoffMsRef.current}ms...`);
        fastApiWsRef.current = null;
        if (fastApiReconnectTimerRef.current) clearTimeout(fastApiReconnectTimerRef.current);
        fastApiReconnectTimerRef.current = setTimeout(() => {
          _initFastApiWebSocket();
        }, fastApiBackoffMsRef.current);
        fastApiBackoffMsRef.current = Math.min(fastApiBackoffMsRef.current * 2, 30000);
      };

      fastApiWsRef.current = ws;
    } catch (err) {
      console.warn("[Phase 2A WS] Failed to init FastAPI WebSocket:", err);
    }
  }, []);

  if (SUPA_URL && SUPA_ANON && !supabaseRef.current) {
    try {
      supabaseRef.current = createClient(SUPA_URL, SUPA_ANON);
      window.__supabase_client = supabaseRef.current;
    } catch {}
  }

  const _initBroadcastChannels = useCallback((empId, code, sessionId) => {
    if (!supabaseRef.current && SUPA_URL && SUPA_ANON) {
      try {
        supabaseRef.current = createClient(SUPA_URL, SUPA_ANON);
        window.__supabase_client = supabaseRef.current;
      } catch {}
    }
    if (!supabaseRef.current) return;
    
    // Clean up old channels
    activeChannelsRef.current.forEach(ch => {
      try { ch.unsubscribe(); } catch {}
    });
    activeChannelsRef.current = [];

    const channelNames = new Set();
    if (empId) {
      channelNames.add(`tracking_${empId}`);
      channelNames.add(`tracking_${empId}_live`);
      if (sessionId) channelNames.add(`tracking_${empId}_${sessionId}`);
    }
    if (code && code !== empId) {
      channelNames.add(`tracking_${code}`);
      channelNames.add(`tracking_${code}_live`);
      if (sessionId) channelNames.add(`tracking_${code}_${sessionId}`);
    }

    channelNames.forEach(chName => {
      try {
        const ch = supabaseRef.current.channel(chName);
        ch.subscribe((status) => {
          console.log(`[SalesLayout] Channel ${chName} subscription status:`, status);
        });
        activeChannelsRef.current.push(ch);
      } catch (err) {
        console.warn(`Failed to subscribe to ${chName}:`, err);
      }
    });
  }, [SUPA_URL, SUPA_ANON]);

  const _pushGpsPoint = useCallback(async ({ lat, lng, accuracy = 10, speed = null, heading = null, sessionId, t1_watch }) => {
    const watchTs = t1_watch || Date.now();
    const empId = user.employee_id || user.auth_user_id || user.id || empCode;
    
    // GPS Filter: Reject inaccurate fixes (> 200m)
    if (accuracy > 200) {
      console.warn(`[GPS Filter] Rejected fix with poor accuracy: ${accuracy}m`);
      return;
    }

    const now = Date.now();

    // 1. Determine if we should broadcast to Supabase Broadcast channel & FastAPI WebSocket
    // Broadcast if moved >= 3m OR if >= 5s elapsed since last broadcast (heartbeat)
    let shouldBroadcast = true;
    if (lastBroadcastPosRef.current) {
      const dlat = lat - lastBroadcastPosRef.current.lat;
      const dlng = lng - lastBroadcastPosRef.current.lng;
      const approxM = Math.sqrt(dlat * dlat + dlng * dlng) * 111000;
      const elapsedSecs = (now - lastBroadcastTimeRef.current) / 1000;
      if (approxM < 3 && elapsedSecs < 5) {
        shouldBroadcast = false;
      }
    }

    const point = { 
      id: Math.random().toString(36).substring(7),
      employee_id: empId,
      employee_code: empCode,
      latitude: lat, 
      longitude: lng, 
      accuracy, 
      speed, 
      heading, 
      recorded_at: new Date().toISOString() 
    };

    if (shouldBroadcast) {
      const sendTs = Date.now();
      // 1A. Supabase Broadcast Channel (Existing Phase 1 Transport)
      if (activeChannelsRef.current.length > 0) {
        activeChannelsRef.current.forEach(ch => {
          try {
            ch.send({
              type: 'broadcast',
              event: 'location',
              payload: {
                ...point,
                t1_watch: watchTs,
                t2_broadcast: sendTs,
                broadcast_sent_at: sendTs
              }
            });
          } catch {}
        });
      }

      // 1B. FastAPI Direct WebSocket Transport (Phase 2A Dual Benchmarking)
      if (fastApiWsRef.current && fastApiWsRef.current.readyState === WebSocket.OPEN) {
        try {
          fastApiWsRef.current.send(JSON.stringify({
            type: 'location_update',
            payload: {
              ...point,
              t1_watch: watchTs,
              t2_ws_send: sendTs
            }
          }));
        } catch (e) {
          console.warn("[Phase 2A WS] Failed to send telemetry via FastAPI WebSocket:", e);
        }
      }

      lastBroadcastPosRef.current = { lat, lng };
      lastBroadcastTimeRef.current = now;
    }

    // 2. Client-side dedup for database persistence: skip DB write if < 10m from last point AND < 30s elapsed
    let shouldPersist = true;
    if (lastPushedPosRef.current) {
      const dlat = lat - lastPushedPosRef.current.lat;
      const dlng = lng - lastPushedPosRef.current.lng;
      const approxM = Math.sqrt(dlat * dlat + dlng * dlng) * 111000;
      const elapsedSecs = (now - lastPushedTimeRef.current) / 1000;
      if (approxM < 10 && elapsedSecs < 30) shouldPersist = false;
    }

    if (!shouldPersist) return;

    // 3. Persist to DB asynchronously (CONSOLIDATED: Single REST call spatialAPI.pushLocation)
    const dbPoint = { latitude: lat, longitude: lng, accuracy, speed, heading, session_id: sessionId };
    try {
      spatialAPI.pushLocation(dbPoint).catch(() => null);
      lastPushedPosRef.current = { lat, lng };
      lastPushedTimeRef.current = now;
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
    const resolvedSessionId = sessionId || localStorage.getItem('tc_tracking_session') || null;
    
    activeSessionRef.current = resolvedSessionId;
    setGpsActive(true);

    // Acquire Wake Lock if supported to prevent background sleep/tab suspension
    try {
      if ('wakeLock' in navigator) {
        navigator.wakeLock.request('screen').then(lock => {
          wakeLockRef.current = lock;
          console.log("[GPS TRACKING] Screen Wake Lock acquired successfully.");
        }).catch(err => {
          console.warn("[GPS TRACKING] Wake Lock request rejected:", err);
        });
      }
    } catch (e) {
      console.warn("[GPS TRACKING] Wake Lock API error:", e);
    }

    // Initialize Supabase Broadcast channels & FastAPI WebSocket (Phase 2A Dual Transport)
    _initBroadcastChannels(empId, empCode, resolvedSessionId);
    _initFastApiWebSocket();

    // Push starting point if available
    if (initLat && initLng) {
      _pushGpsPoint({ lat: initLat, lng: initLng, accuracy: 10, sessionId: resolvedSessionId });
    }

    // Start continuous watchPosition
    if (gpsWatchRef.current !== null) {
      navigator.geolocation.clearWatch(gpsWatchRef.current);
    }

    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const t1_watch = Date.now();
        const { latitude, longitude, accuracy, speed, heading } = pos.coords;
        if (accuracy > 200) return; // reject inaccurate GPS fix (>200m)
        const currentSessId = activeSessionRef.current;
        _pushGpsPoint({ lat: latitude, lng: longitude, accuracy, speed, heading, sessionId: currentSessId, t1_watch });
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
  }, [user, empCode, _pushGpsPoint, _flushRetryQueue, _initBroadcastChannels, showToast]);

  const _stopGpsTracking = useCallback(() => {
    if (gpsWatchRef.current !== null) {
      navigator.geolocation.clearWatch(gpsWatchRef.current);
      gpsWatchRef.current = null;
    }
    window.removeEventListener('online', _flushRetryQueue);

    // Release Screen Wake Lock
    if (wakeLockRef.current !== null) {
      try {
        wakeLockRef.current.release();
        console.log("[GPS TRACKING] Screen Wake Lock released.");
      } catch (err) {
        console.warn("[GPS TRACKING] Failed to release Wake Lock:", err);
      }
      wakeLockRef.current = null;
    }
    
    activeChannelsRef.current.forEach(ch => {
      try { ch.unsubscribe(); } catch {}
    });
    activeChannelsRef.current = [];

    if (fastApiReconnectTimerRef.current) {
      clearTimeout(fastApiReconnectTimerRef.current);
      fastApiReconnectTimerRef.current = null;
    }
    if (fastApiWsRef.current) {
      try { fastApiWsRef.current.close(); } catch {}
      fastApiWsRef.current = null;
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
      
      // Validation (flexible to match employee id or code)
      if (session && session.status === 'active' && (String(session.employee_id) === String(empId) || String(session.employee_id) === String(empCode))) {
        console.log("Validated session for resume:", session.id);
        _startGpsTracking(null, null, {}, session.id);
      } else if (savedSessionId) {
        // Resume session from saved ID
        _startGpsTracking(null, null, {}, savedSessionId);
      } else {
        _startGpsTracking(null, null, {}, null);
      }
    } catch (err) {
      console.warn("Tracking resume validation notice:", err);
      _startGpsTracking(null, null, {}, savedSessionId);
    }
  }, [user, empCode, _startGpsTracking]);

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

    // Auto-resume check or initial background GPS start
    const savedSession = localStorage.getItem("tc_tracking_session");
    if (savedSession) {
      _resumeGpsTracking(savedSession);
    } else if (!gpsWatchRef.current) {
      _startGpsTracking(null, null, {}, null);
    }

    return () => {
      window.removeEventListener("tc:start-tracking", handleStart);
      window.removeEventListener("tc:stop-tracking", handleStop);
      if (gpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
      }
      activeChannelsRef.current.forEach(ch => {
        try { ch.unsubscribe(); } catch {}
      });
      activeChannelsRef.current = [];
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

  // Load latest profile photo from Supabase DB on layout mount
  useEffect(() => {
    hrmsAPI.getEmployeeById('self')
      .then(res => {
        const photo = res?.data?.profile_photo || res?.profile_photo;
        if (photo) {
          setProfilePhoto(photo);
          try { localStorage.setItem('tc_se_photo', photo); } catch (_) {}
        }
      })
      .catch(() => {});
  }, []);

  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log("[ProfilePhoto] File selected");
    console.log("[ProfilePhoto] File name:", file.name);
    console.log("[ProfilePhoto] File type:", file.type);
    console.log("[ProfilePhoto] File size:", file.size);

    if (!file.type.startsWith("image/")) {
      showToast("Please upload an image file (JPG, PNG, etc.)", "error");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropComplete = async (croppedFile) => {
    try {
      setIsUploadingPhoto(true);
      showToast("Uploading cropped profile photo to Storage...", "info");
      console.log("[ProfilePhoto] Uploading cropped file to Supabase Storage...");
      const res = await hrmsAPI.uploadAvatar("self", croppedFile);
      console.log("[ProfilePhoto] Storage & DB Upload response:", res);

      const newPhotoUrl = res?.data?.profile_photo || res?.profile_photo;
      if (!newPhotoUrl) {
        throw new Error("Database update failed: profile_photo empty in response");
      }

      console.log("[ProfilePhoto] Successfully saved photo URL:", newPhotoUrl);
      setProfilePhoto(newPhotoUrl);
      try {
        localStorage.setItem("tc_se_photo", newPhotoUrl);
      } catch (err) {}

      showToast("Profile photo cropped & saved to Database successfully!", "success");
      setCropImageSrc(null);
    } catch (err) {
      console.error("[ProfilePhoto] Upload failed:", err);
      showToast(`Failed to update profile photo: ${err.message || err}`, "error");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const removePhoto = async () => {
    try {
      await hrmsAPI.updateEmployee("self", { profile_photo: null });
      setProfilePhoto(null);
      try {
        localStorage.removeItem("tc_se_photo");
      } catch (err) {}
      showToast("Profile photo removed successfully.", "info");
    } catch (err) {
      showToast(`Failed to remove profile photo: ${err.message || err}`, "error");
    }
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
          setProfilePhoto(emp.profile_photo || null);
          if (emp.profile_photo) {
            localStorage.setItem("tc_se_photo", emp.profile_photo);
          } else {
            localStorage.removeItem("tc_se_photo");
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
      dbPayload.profile_photo = profilePhoto || null;
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
      
      setProfilePhoto(freshEmployee.profile_photo || null);
      if (freshEmployee.profile_photo) {
        localStorage.setItem("tc_se_photo", freshEmployee.profile_photo);
      } else {
        localStorage.removeItem("tc_se_photo");
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
      let errMsg = "Failed to save profile";
      if (err.errors && Array.isArray(err.errors) && err.errors.length > 0) {
        errMsg = err.errors.map(e => `${e.field || "field"}: ${e.message}`).join(", ");
      } else if (err.detail) {
        errMsg = typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail);
      } else if (err.message) {
        errMsg = err.message;
      }
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

  const baseMenus = [
    { title: "Dashboard", icon: LayoutDashboard, path: "/sales/dashboard" },
    { title: "Smart Map", icon: MapPin, path: "/sales/map" },
    { title: "Leads", icon: Users, path: "/sales/leads" },
    { title: "Clients", icon: UserCheck, path: "/sales/customers" },
    { title: "Client Log", icon: ClipboardList, path: "/sales/client-log" },
    { title: "Expenses", icon: BadgeDollarSign, path: "/sales/expenses" },
    { title: "Messages 💬", icon: Bell, path: "/sales/notifications" },
    { title: "HRMS", icon: ShieldCheck, path: "/sales/hrms" },
    { title: "Tasks", icon: CheckSquare, path: "/sales/todo" },
  ];

  const menus = baseMenus;

  const userEmail = (user?.email || "").toLowerCase().trim();
  const [sidebarItems, setSidebarItems] = useState(() => {
    const saved = localStorage.getItem(`tc_sidebar_order_sales_${userEmail}`);
    if (saved) {
      try {
        const titles = JSON.parse(saved);
        const ordered = [];
        titles.forEach(title => {
          const target = title === 'Customers' ? 'Clients' : title;
          const match = menus.find(m => m.title === target || m.title === title);
          if (match && !ordered.some(o => o.path === match.path)) ordered.push(match);
        });
        menus.forEach(m => {
          if (!ordered.some(o => o.path === m.path)) {
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
          const target = title === 'Customers' ? 'Clients' : title;
          const match = menus.find(m => m.title === target || m.title === title);
          if (match && !ordered.some(o => o.path === match.path)) ordered.push(match);
        });
        menus.forEach(m => {
          if (!ordered.some(o => o.path === m.path)) {
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
      <NotificationPermissionBanner />
      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="relative h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30 shadow-xs flex-shrink-0">
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

        {/* Center: Role Indicator Tag */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden sm:flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2.5 bg-slate-50/80 border border-slate-200/80 rounded-full px-4.5 py-1.5 shadow-xs pointer-events-auto">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span
              className="text-xs uppercase tracking-[0.25em] font-black"
              style={{
                background: 'linear-gradient(to right, #475569 20%, #0d9488 40%, #5eead4 60%, #475569 80%)',
                backgroundSize: '200% auto',
                color: 'transparent',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                animation: 'tc-shimmer-se 3s linear infinite',
                display: 'inline-block'
              }}
            >
              {seRole || 'Sales Executive'}
            </span>
            <style>{`
              @keyframes tc-shimmer-se {
                to {
                  background-position: -200% center;
                }
              }
            `}</style>
          </div>
        </div>

        {/* Right Header Navigation */}
        <div className="flex items-center gap-1.5 sm:gap-3">


          <button
            onClick={() => navigate("/sales/notifications")}
            className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:bg-slate-100 relative transition cursor-pointer border border-slate-200"
            title="Notifications & Messages"
          >
            <Bell size={19} />
            {notifCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-black shadow-xs ring-2 ring-white animate-pulse">
                {notifCount > 99 ? '99+' : notifCount}
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
                      setShowUserMenu(false);
                      setMyProfileOpen(true);
                      setEditMode(false);
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <UserCircle size={15} className="text-teal-600" /> My Profile
                  </button>
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
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[4000] lg:hidden transition-opacity"
          />
        )}

        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <aside
          className={`fixed inset-y-0 left-0 z-[4010] lg:z-40 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:pt-0 shrink-0 flex flex-col ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Mobile-only Sidebar Close Header */}
          <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-teal-100 bg-gradient-to-r from-teal-700 to-teal-600 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-white text-[10px] font-black">TC</span>
              <span className="text-xs font-black text-white uppercase tracking-widest">Sales Portal</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-xl text-teal-100 hover:bg-white/10 hover:text-white transition cursor-pointer"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>

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
                  {(open || !isMobile) && notifCount > 0 && (m.path.includes("notifications") || m.title.includes("Message")) && (
                    <span className="ml-auto bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs ring-2 ring-white animate-pulse">
                      🔴 {notifCount > 99 ? '99+' : notifCount}
                    </span>
                  )}
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
        <main className={`flex-1 min-w-0 ${
          isMapPage 
            ? "p-0 pb-14 overflow-hidden h-[calc(100vh-64px)] lg:h-[calc(100vh-80px)] lg:p-6 lg:pb-6" 
            : "p-3 sm:p-5 lg:p-6 overflow-y-auto pb-20 lg:pb-6"
        }`}>
          <Outlet />
        </main>

        {/* ── Mobile Bottom Navigation Dock ────────────────────────── */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-[1020] px-2 py-1.5 flex items-center justify-around shadow-lg">
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
        <div className="fixed inset-0 z-[5000] flex">
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
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-[5010]">
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
        <div className="fixed inset-0 z-[5020] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
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

      {/* WhatsApp-style Image Cropper Modal */}
      {cropImageSrc && (
        <ImageCropperModal
          imageSrc={cropImageSrc}
          onCancel={() => setCropImageSrc(null)}
          onCropComplete={handleCropComplete}
          isUploading={isUploadingPhoto}
        />
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
  const isPhone = label.toLowerCase().includes('phone') || label.toLowerCase().includes('mobile') || label.toLowerCase().includes('contact');
  return (
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      {editMode ? (
        <input
          type={isDate ? "date" : isPhone ? "tel" : "text"}
          maxLength={isPhone ? 10 : undefined}
          value={value || ""}
          onChange={(e) => {
            if (isPhone) {
              onChange(e.target.value.replace(/\D/g, '').slice(0, 10))
            } else {
              onChange(e.target.value)
            }
          }}
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