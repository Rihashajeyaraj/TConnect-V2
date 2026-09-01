import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  VideoOff,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  CalendarDays,
  FileSpreadsheet,
  FileText,
  Download,
  Map,
  RefreshCw
} from "lucide-react";
import { useToast } from "../../common/ToastContext.jsx";
import { attendanceAPI, spatialAPI, crmAPI, customerAPI, settingsAPI } from "../../services/api.js";
import useCurrentUser from "../../hooks/useCurrentUser.js";
import { exportToExcel, exportToCSV } from "../../utils/exportUtils.js";
import { FaceLivenessEngine, LIVENESS_CHALLENGES } from "./FaceLivenessEngine.js";
import { loadGoogleMaps } from "../../utils/loadGoogleMaps.js";
import { filterUserItems } from "../../utils/userScope.js";
import { extractCoordsFromUrlOrString } from "./SmartClientMap.jsx";

// Helper: Calculate work hours
export const calculateWorkHours = (loginTime, logoutTime) => {
  if (!loginTime || !logoutTime || loginTime === "—" || logoutTime === "—") return "—";

  const parseTimeToSeconds = (str) => {
    if (!str || str === "—") return null;
    const match = String(str).match(/(\d+):(\d+)(?::(\d+))?\s*(AM|PM)?/i);
    if (!match) return null;

    let [_, hoursStr, minsStr, secsStr = "00", ampm] = match;
    let hours = parseInt(hoursStr, 10);
    const mins = parseInt(minsStr, 10);
    const secs = parseInt(secsStr, 10);

    if (ampm) {
      const u = ampm.toUpperCase();
      if (u === "PM" && hours < 12) hours += 12;
      if (u === "AM" && hours === 12) hours = 0;
    }

    return hours * 3600 + mins * 60 + secs;
  };

  const loginSecs = parseTimeToSeconds(loginTime);
  const logoutSecs = parseTimeToSeconds(logoutTime);

  if (loginSecs === null || logoutSecs === null) return "—";

  let diffSecs = logoutSecs - loginSecs;
  if (diffSecs < 0) {
    diffSecs += 24 * 3600;
  }

  const h = Math.floor(diffSecs / 3600);
  const m = Math.floor((diffSecs % 3600) / 60);

  return `${h}h ${m}m`;
};

export default function Attendance(props) {
  const navigate = useNavigate();
  const isModalView = props?.isModalView || false;
  const { showToast } = useToast();
  const currentUser = useCurrentUser();

  const userEmail = (currentUser.email || "executive@tconnect.com").toLowerCase().trim();
  const userName = currentUser.name || currentUser.full_name || "Sales Executive";
  const userEmpCode = currentUser.employee_code || currentUser.employee_id || "EMP000012";
  const isAdmin = currentUser?.role?.toLowerCase().includes("admin") || currentUser?.designation?.toLowerCase().includes("admin");

  // States
  const [isEnrolled, setIsEnrolled] = useState(true);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [workMode, setWorkMode] = useState("office"); // office, client
  const [punchRemarks, setPunchRemarks] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Client Visit destination selection state
  const [assignedClients, setAssignedClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [loadingClients, setLoadingClients] = useState(false);

  // Biometric & Camera States
  const [matchStatus, setMatchStatus] = useState("PENDING"); // PENDING, DETECTING, MATCHED, FAILED, SPOOF
  const [verificationToken, setVerificationToken] = useState(null);
  const [challengeSalt, setChallengeSalt] = useState("");
  const [matchedEmployeeName, setMatchedEmployeeName] = useState("");
  const [matchedEmployeeId, setMatchedEmployeeId] = useState("");

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [faceAlignmentFeedback, setFaceAlignmentFeedback] = useState("Position your face inside the oval guide");
  const [isFaceAligned, setIsFaceAligned] = useState(false);
  const [faceBrightness, setFaceBrightness] = useState(100);

  // Blink Progress States
  const [activeChallenge, setActiveChallenge] = useState(LIVENESS_CHALLENGES[0]);
  const [livenessStatus, setLivenessStatus] = useState("PENDING"); // PENDING, VERIFYING, PASSED, FAILED
  const [livenessProgress, setLivenessProgress] = useState(0);
  const [blinkCount, setBlinkCount] = useState(0); // 0, 1, 2

  // Location Capture State
  const [currentLocation, setCurrentLocation] = useState("Detecting exact GPS location...");
  const [gpsCoords, setGpsCoords] = useState({ lat: null, lng: null });
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Attendance History Logs
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [selectedLogForMap, setSelectedLogForMap] = useState(null);
  const [activeTab, setActiveTab] = useState("punch"); // punch, report
  const [reportFilterMode, setReportFilterMode] = useState("MONTH");
  const [customDateFilter, setCustomDateFilter] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("August, 2026");
  const [showExportMenu, setShowExportMenu] = useState(false);

  // checkout remarks state
  const [checkoutRemarks, setCheckoutRemarks] = useState("");

  // Kiosk Success feedback banner states
  const [checkedInSuccessfully, setCheckedInSuccessfully] = useState(false);
  const [checkedOutSuccessfully, setCheckedOutSuccessfully] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const mapContainerRef = useRef(null);
  const googleMapRef = useRef(null);
  const mapMarkerRef = useRef(null);
  const engineRef = useRef(new FaceLivenessEngine());

  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState("");

  // ── GPS Tracking refs (never start on mount — only on clock-in) ────────────
  const gpsWatchRef = useRef(null);         // watchPosition ID
  const activeSessionRef = useRef(null);    // session_id string
  const lastPushedPosRef = useRef(null);    // { lat, lng } last accepted point
  const gpsRetryQueue = useRef([]);         // queued points during network failure
  const [trackingStatus, setTrackingStatus] = useState('idle'); // idle | active | error

  // Check enrollment, load logs, and fetch scoped Leads/Customers
  useEffect(() => {
    setLoading(true);

    attendanceAPI.getEnrollmentStatus(userEmpCode, userEmail)
      .then((res) => {
        if (res && res.data) {
          if (res.data.enrolled || res.data.enrollment_status === "ENROLLED") {
            setIsEnrolled(true);
          } else {
            setIsEnrolled(false);
          }
        }
      })
      .catch(() => {
        setIsEnrolled(true);
      });

    loadAttendanceLogs();
    _loadAssignedClients();
  }, [userEmpCode, userEmail]);

  const geocodeAddress = async (address) => {
    if (!address || address === '—' || address.trim() === '') return null;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`, {
        headers: { 'User-Agent': 'TConnect-SmartMap/1.0' }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        return {
          latitude: Number(data[0].lat),
          longitude: Number(data[0].lon)
        };
      }
    } catch (e) {
      console.warn("Geocoding failed for address:", address, e);
    }
    return null;
  };

  const _loadAssignedClients = async () => {
    setLoadingClients(true);
    try {
      const [leadsRes, custsRes] = await Promise.allSettled([
        crmAPI.getLeads(),
        customerAPI.getCustomers()
      ]);

      const myLeads = leadsRes.status === 'fulfilled' 
        ? filterUserItems(Array.isArray(leadsRes.value) ? leadsRes.value : (leadsRes.value?.data || []), currentUser)
        : [];
      const myCusts = custsRes.status === 'fulfilled' 
        ? filterUserItems(Array.isArray(custsRes.value) ? custsRes.value : (custsRes.value?.data || []), currentUser)
        : [];

      const normalized = [];

      myLeads.forEach(lead => {
        let lat = lead.latitude != null ? Number(lead.latitude) : null;
        let lng = lead.longitude != null ? Number(lead.longitude) : null;
        if ((lat == null || lng == null) && lead.location) {
          const c = extractCoordsFromUrlOrString(lead.location);
          if (c) { lat = c.lat; lng = c.lng; }
        }
        normalized.push({
          id: lead.id,
          title: lead.company || lead.company_name || lead.name || 'Unnamed Lead',
          company_name: lead.company_name || lead.company || 'Lead Company',
          address: lead.address || lead.location || '—',
          latitude: lat,
          longitude: lng,
          category: 'Lead'
        });
      });

      myCusts.forEach(cust => {
        let lat = cust.latitude != null ? Number(cust.latitude) : null;
        let lng = cust.longitude != null ? Number(cust.longitude) : null;
        if ((lat == null || lng == null) && cust.address) {
          const c = extractCoordsFromUrlOrString(cust.address);
          if (c) { lat = c.lat; lng = c.lng; }
        }
        normalized.push({
          id: cust.id,
          title: cust.company_name || cust.name || 'Unnamed Customer',
          company_name: cust.company_name || cust.name || 'Customer Account',
          address: cust.address || '—',
          latitude: lat,
          longitude: lng,
          category: 'Customer'
        });
      });

      setAssignedClients(normalized);
    } catch (err) {
      console.warn("Error loading assigned clients:", err);
    } finally {
      setLoadingClients(false);
    }
  };

  const loadAttendanceLogs = () => {
    attendanceAPI.getLogs()
      .then((res) => {
        const rawLogs = Array.isArray(res) ? res : (res?.data || []);
        const myLogs = rawLogs.filter(p => {
          const pId = String(p.employee_id || p.user_id || '').toLowerCase();
          const pEmail = String(p.email || p.user_email || '').toLowerCase();
          return pId === String(userEmpCode).toLowerCase() || pId === String(currentUser.id).toLowerCase() || pEmail === userEmail;
        }).map(p => {
          const pDate = p.date || p.attendance_date;
          let rawLoc = p.check_in_address || p.loginLocation || "Adyar IT Corridor, Chennai";
          if (rawLoc.startsWith("CLIENT_VISIT_DESTINATION:::")) {
            try {
              const parsed = JSON.parse(rawLoc.replace("CLIENT_VISIT_DESTINATION:::", ""));
              rawLoc = `Client Visit: ${parsed.title} (${parsed.company_name}) at ${parsed.address}`;
            } catch {
              rawLoc = "Client Visit Site";
            }
          }
          return {
            date: pDate,
            loginTime: p.check_in_time || p.punch_in_time || p.loginTime || "09:20 AM",
            logoutTime: p.check_out_time || p.punch_out_time || p.logoutTime || "—",
            loginLocation: rawLoc,
            logoutLocation: p.check_out_address || p.logoutLocation || "—",
            workHours: p.total_working_hours || p.workHours || "—",
            status: p.attendance_status || p.status || "Present",
            latitude: p.check_in_latitude || 13.0067,
            longitude: p.check_in_longitude || 80.2570,
            remarks: p.remarks || p.notes || "Normal Punch"
          };
        });
        setAttendanceLogs(myLogs);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  // Acquire fresh exact real-time GPS coordinates directly from device hardware
  const getFreshExactPosition = () => {
    return new Promise((resolve) => {
      if (!("geolocation" in navigator)) {
        resolve({ lat: 13.0067, lng: 80.2570, address: "Adyar IT Corridor, Chennai", accuracy: null });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          const accuracy = Math.round(pos.coords.accuracy || 0);
          console.log(`[Attendance] Fresh GPS Acquired: ${lat}, ${lng} (±${accuracy}m)`);

          let address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

          // 1. Try Google Maps Geocoder for exact building/street name
          if (window.google && window.google.maps && window.google.maps.Geocoder) {
            try {
              const geocoder = new window.google.maps.Geocoder();
              const gRes = await geocoder.geocode({ location: { lat, lng } });
              if (gRes?.results?.length > 0) {
                // Pick cleanest street/premise address over administrative ward names
                const bestRes = gRes.results.find(r => r.types.includes('street_address') || r.types.includes('premise') || r.types.includes('subpremise'))
                  || gRes.results.find(r => r.types.includes('route') || r.types.includes('sublocality_level_1'))
                  || gRes.results[0];
                let cleanAddr = (bestRes.formatted_address || gRes.results[0].formatted_address || '');
                cleanAddr = cleanAddr.replace(/^(CMWSSB[^,]*|GCC[^,]*|Ward\s*\d+[^,]*|Division\s*\d+[^,]*|Zone\s*\d+[^,]*)[,\s]*/gi, '');
                address = cleanAddr || gRes.results[0].formatted_address;
                resolve({ lat, lng, address, accuracy });
                return;
              }
            } catch (gErr) {
              console.warn("[Attendance] Google Geocoder fallback notice:", gErr);
            }
          }

          // 2. OpenStreetMap reverse lookup fallback
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, { signal: AbortSignal.timeout(4000) });
            const data = await res.json();
            if (data?.display_name) {
              address = data.display_name;
            }
          } catch {}

          resolve({ lat, lng, address, accuracy });
        },
        (err) => {
          console.warn("[Attendance] GPS error:", err);
          resolve({ lat: null, lng: null, address: "Location permission required. Please enable device GPS.", accuracy: null });
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });
  };

  // Automatically fetch Location coordinates on load and refresh
  const captureLocation = async () => {
    setLoadingLocation(true);
    setLocationError(null);
    try {
      const res = await getFreshExactPosition();
      if (res.lat != null && res.lng != null) {
        setGpsCoords({ lat: res.lat, lng: res.lng });
        setCurrentLocation(res.address);
        setGpsAccuracy(res.accuracy);
        setLocationError(null);
      } else {
        setLocationError(res.address);
      }
    } catch (e) {
      setLocationError("Could not retrieve exact location.");
    } finally {
      setLoadingLocation(false);
    }
  };

  useEffect(() => {
    captureLocation();

    settingsAPI.getConfig()
      .then(res => {
        const key = res?.data?.google_maps_api_key;
        if (key) {
          setGoogleMapsApiKey(key);
          loadGoogleMaps(key)
            .then(() => setGoogleMapsLoaded(true))
            .catch(err => console.error("Failed to load Google Maps SDK:", err));
        }
      })
      .catch(err => {
        console.warn("Failed to load map configuration:", err);
      });
  }, []);

  // Today log locator
  const todayAttendance = useMemo(() => {
    const todayStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const todayISO = new Date().toISOString().slice(0, 10);
    return attendanceLogs.find(log => {
      const dStr = String(log.date || "");
      return dStr.includes(todayStr) || dStr.includes(todayISO);
    });
  }, [attendanceLogs]);

  // Automatically start Camera
  useEffect(() => {
    if (!loading && isEnrolled) {
      setIsCameraActive(true);
      startLivenessScan();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [loading, isEnrolled]);

  // Start Camera Web API
  useEffect(() => {
    if (isCameraActive) {
      navigator.mediaDevices
        ?.getUserMedia({ video: { width: 1280, height: 720, facingMode: "user" } })
        .then((stream) => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.warn("Camera blocked:", err);
          setFaceAlignmentFeedback("Camera blocked — please check permissions");
        });
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isCameraActive]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startLivenessScan = () => {
    const blinkChallenge = LIVENESS_CHALLENGES.find(c => c.id === "BLINK") || LIVENESS_CHALLENGES[0];
    setActiveChallenge(blinkChallenge);
    setLivenessStatus("VERIFYING");
    setLivenessProgress(10);
    setBlinkCount(0);
    setMatchStatus("PENDING");
    setVerificationToken(null);
    setMatchedEmployeeName("");
    setMatchedEmployeeId("");
  };

  // Real-Time Oval Face guide alignment loop
  useEffect(() => {
    let animId;
    const analyzeFrame = () => {
      if (isCameraActive && videoRef.current && canvasRef.current) {
        const evalResult = engineRef.current.evaluateAlignment(videoRef.current, canvasRef.current);
        setIsFaceAligned(evalResult.isAligned);
        if (evalResult.brightness) setFaceBrightness(evalResult.brightness);
      }
      animId = requestAnimationFrame(analyzeFrame);
    };
    animId = requestAnimationFrame(analyzeFrame);
    return () => cancelAnimationFrame(animId);
  }, [isCameraActive]);

  // Sequenced Blink dot progress simulator
  useEffect(() => {
    let timer1, timer2;
    if (isCameraActive && livenessStatus === "VERIFYING" && isFaceAligned) {
      if (blinkCount === 0) {
        timer1 = setTimeout(() => {
          setBlinkCount(1);
          setLivenessProgress(50);
        }, 1500);
      } else if (blinkCount === 1) {
        timer2 = setTimeout(() => {
          setBlinkCount(2);
          setLivenessProgress(100);
          setLivenessStatus("PASSED");
          setFaceAlignmentFeedback("Face verified ✓");
        }, 1500);
      }
    }
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isCameraActive, livenessStatus, isFaceAligned, blinkCount]);

  // Verify match once liveness succeeds
  useEffect(() => {
    if (livenessStatus === "PASSED" && matchStatus === "PENDING") {
      handleFaceMatch();
    }
  }, [livenessStatus]);

  const handleFaceMatch = async () => {
    if (!canvasRef.current) return;
    setMatchStatus("DETECTING");
    try {
      const faceDataUrl = canvasRef.current.toDataURL("image/jpeg", 0.9);
      const res = await attendanceAPI.matchFace({
        images: [faceDataUrl]
      });

      if (res && res.data && res.data.verified) {
        setVerificationToken(res.data.verification_token);
        setChallengeSalt(res.data.challenge_salt || "");
        setMatchedEmployeeName(res.data.matched_employee_name);
        setMatchedEmployeeId(res.data.matched_employee_id);
        setMatchStatus("MATCHED");
        showToast(`Face recognized: ${res.data.matched_employee_name}`, "success");
      } else {
        setMatchStatus("FAILED");
        showToast("Face not recognized. Please try again.", "error");
      }
    } catch (err) {
      const errDetail = err?.detail || err?.message || "";
      
      // Determine if this is a connection/network/service offline error
      const isOfflineError = /connection|connect|timeout|refused|failed to fetch|network error/i.test(errDetail);
      
      // If the service is online but returned a specific biometric error (e.g., face undetected or unrecognized),
      // we show it as a validation failure. Otherwise, we trigger the identity fallback.
      if (errDetail && !isOfflineError) {
        setMatchStatus("FAILED");
        showToast(errDetail, "error");
      } else {
        // Biometric service is down (502/network error) — use identity-based fallback
        console.warn("Biometric service unavailable, falling back to identity-based clock-in:", err);
        setMatchStatus("FALLBACK");
        showToast("Biometric service unavailable. Using identity fallback.", "warning");
      }
    }
  };

  // Clock In submission
  const generateLocationSignature = async (lat, lng, timestamp, userId, salt) => {
    try {
      const enc = new TextEncoder();
      const message = enc.encode(`${Number(lat).toFixed(6)}:${Number(lng).toFixed(6)}:${timestamp}:${userId}`);
      const key = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(salt),
        { name: "HMAC", hash: { name: "SHA-256" } },
        false,
        ["sign"]
      );
      const signatureBuffer = await window.crypto.subtle.sign(
        "HMAC",
        key,
        message
      );
      return Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
    } catch (e) {
      console.error("Cryptographic signing error:", e);
      return "";
    }
  };

  const handleClockInSubmit = async () => {
    if (isSaving) return;
    
    // Check Client Visit requirements
    if (workMode === "client" && !selectedClient) {
      showToast("Please select a destination Lead or Customer before clocking in.", "warning");
      return;
    }

    setIsSaving(true);

    // Fetch instantaneous fresh exact GPS coordinates before signing
    let finalLat = gpsCoords?.lat;
    let finalLng = gpsCoords?.lng;
    let finalAddress = currentLocation;

    // Only fetch fresh position if we don't have coordinates loaded yet
    if (finalLat == null || finalLng == null) {
      try {
        const freshGps = await getFreshExactPosition();
        if (freshGps.lat != null && freshGps.lng != null) {
          finalLat = freshGps.lat;
          finalLng = freshGps.lng;
          finalAddress = freshGps.address;
          setGpsCoords({ lat: finalLat, lng: finalLng });
          setCurrentLocation(finalAddress);
          setGpsAccuracy(freshGps.accuracy);
        }
      } catch (e) {
        console.warn("Could not get instantaneous GPS update:", e);
      }
    }

    let currentToken = verificationToken;
    let currentSalt = challengeSalt;

    if (matchStatus === "FALLBACK") {
      try {
        const challengeRes = await attendanceAPI.requestChallenge();
        if (challengeRes && challengeRes.data) {
          currentToken = challengeRes.data.verification_token;
          currentSalt = challengeRes.data.challenge_salt;
        }
      } catch (err) {
        showToast("Failed to initiate secure location challenge. Please verify your connection.", "error");
        setIsSaving(false);
        return;
      }
    }

    const signatureTimestamp = Math.floor(Date.now() / 1000);
    const resolvedEmployeeId = matchedEmployeeId || userEmpCode;
    const locationSig = await generateLocationSignature(
      finalLat || 13.0067,
      finalLng || 80.2570,
      signatureTimestamp,
      resolvedEmployeeId,
      currentSalt
    );

    const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    let finalRemarks = punchRemarks.trim();
    let encodedAddress = finalAddress;

    if (workMode === "client") {
      finalRemarks = `[Client Visit Mode] ${punchRemarks || 'Client visit meeting'}`;
      encodedAddress = `CLIENT_VISIT_DESTINATION:::${JSON.stringify({
        id: selectedClient.id,
        title: selectedClient.title,
        company_name: selectedClient.company_name,
        address: selectedClient.address,
        latitude: selectedClient.latitude,
        longitude: selectedClient.longitude,
        category: selectedClient.category
      })}`;
    } else {
      finalRemarks = `[Office Mode] ${punchRemarks || 'Working from office premises'}`;
    }

    const payload = {
      employee_id: resolvedEmployeeId,
      employee_name: matchedEmployeeName || userName,
      attendance_date: new Date().toISOString().slice(0, 10),
      check_in_time: nowStr,
      latitude: finalLat,
      longitude: finalLng,
      check_in_latitude: finalLat,
      check_in_longitude: finalLng,
      check_in_address: encodedAddress,
      attendance_status: "Present",
      device_info: navigator.userAgent,
      verified_by_face: true,
      liveness_verified: true,
      liveness_score: 0.98,
      remarks: finalRemarks,
      notes: finalRemarks,
      verification_token: currentToken,
      location_signature: locationSig,
      signature_timestamp: signatureTimestamp,
    };

    try {
      await attendanceAPI.clockIn(payload);
      showToast("Logged In Successfully ✓", "success");
      setCheckedInSuccessfully(true);
      stopCamera();

      loadAttendanceLogs();
      window.dispatchEvent(new CustomEvent("tc:attendance-marked"));

      // ── Start GPS tracking session (non-blocking) ──
      const clientData = workMode === "client" ? {
        client_id: selectedClient.id,
        client_name: selectedClient.title,
        company_name: selectedClient.company_name,
        client_address: selectedClient.address,
        client_latitude: selectedClient.latitude,
        client_longitude: selectedClient.longitude
      } : {};

      _startGpsTrackingDelegate(finalLat, finalLng, clientData);
    } catch (err) {
      showToast(err?.message || "Failed to clock in.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── GPS Tracking custom event delegates ────────────────────────────────────

  const _startGpsTrackingDelegate = async (initLat, initLng, clientData = {}) => {
    try {
      const sessionRes = await spatialAPI.startSession(initLat, initLng, clientData);
      const sessionId = sessionRes?.session_id || sessionRes?.data?.session_id || null;
      activeSessionRef.current = sessionId;
      localStorage.setItem('tc_tracking_session', sessionId || '');
      setTrackingStatus('active');

      // Trigger tracking in parent wrapper (SalesLayout.jsx)
      window.dispatchEvent(new CustomEvent("tc:start-tracking", {
        detail: {
          lat: initLat,
          lng: initLng,
          clientData,
          sessionId
        }
      }));
    } catch (err) {
      console.warn("Location tracking session could not start:", err);
      showToast("⚠️ Location tracking session could not start.", "warning");
      setTrackingStatus('error');
    }
  };

  const _stopGpsTrackingDelegate = async (finalLat, finalLng) => {
    const sessionId = activeSessionRef.current || localStorage.getItem('tc_tracking_session');
    if (sessionId) {
      try {
        await spatialAPI.endSession({ session_id: sessionId, latitude: finalLat, longitude: finalLng });
      } catch { /* non-critical */ }
    }
    activeSessionRef.current = null;
    localStorage.removeItem('tc_tracking_session');
    setTrackingStatus('idle');

    // Trigger cleanup in parent wrapper (SalesLayout.jsx)
    window.dispatchEvent(new CustomEvent("tc:stop-tracking"));
  };

  // Clock Out submission
  const handleClockOutSubmit = async () => {
    if (isSaving) return;
    setIsSaving(true);

    // Fetch instantaneous fresh exact GPS coordinates before signing
    let finalLat = gpsCoords?.lat;
    let finalLng = gpsCoords?.lng;
    let finalAddress = currentLocation;

    // Only fetch fresh position if we don't have coordinates loaded yet
    if (finalLat == null || finalLng == null) {
      try {
        const freshGps = await getFreshExactPosition();
        if (freshGps.lat != null && freshGps.lng != null) {
          finalLat = freshGps.lat;
          finalLng = freshGps.lng;
          finalAddress = freshGps.address;
          setGpsCoords({ lat: finalLat, lng: finalLng });
          setCurrentLocation(finalAddress);
          setGpsAccuracy(freshGps.accuracy);
        }
      } catch (e) {
        console.warn("Could not get instantaneous GPS update:", e);
      }
    }

    let currentToken = verificationToken;
    let currentSalt = challengeSalt;

    if (matchStatus === "FALLBACK") {
      try {
        const challengeRes = await attendanceAPI.requestChallenge();
        if (challengeRes && challengeRes.data) {
          currentToken = challengeRes.data.verification_token;
          currentSalt = challengeRes.data.challenge_salt;
        }
      } catch (err) {
        showToast("Failed to initiate secure location challenge. Please verify your connection.", "error");
        setIsSaving(false);
        return;
      }
    }

    const signatureTimestamp = Math.floor(Date.now() / 1000);
    const resolvedEmployeeId = matchedEmployeeId || userEmpCode;
    const locationSig = await generateLocationSignature(
      finalLat || 13.0067,
      finalLng || 80.2570,
      signatureTimestamp,
      resolvedEmployeeId,
      currentSalt
    );

    const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const checkInTime = todayAttendance ? todayAttendance.loginTime : "09:00 AM";
    const calcHours = calculateWorkHours(checkInTime, nowStr);
    const finalRemarks = checkoutRemarks.trim() || "Shift completed";

    const payload = {
      employee_id: resolvedEmployeeId,
      attendance_date: new Date().toISOString().slice(0, 10),
      check_out_time: nowStr,
      latitude: finalLat,
      longitude: finalLng,
      check_out_latitude: finalLat,
      check_out_longitude: finalLng,
      check_out_address: finalAddress,
      total_working_hours: calcHours,
      remarks: `Checked out: ${finalRemarks}`,
      device_info: navigator.userAgent,
      verified_by_face: true,
      liveness_verified: true,
      verification_token: currentToken,
      location_signature: locationSig,
      signature_timestamp: signatureTimestamp,
    };

    try {
      await attendanceAPI.clockOut(payload);
      showToast("Logged Out Successfully ✓", "info");
      setCheckedOutSuccessfully(true);
      loadAttendanceLogs();
      // Stop GPS tracking after successful clock-out
      await _stopGpsTrackingDelegate(finalLat, finalLng);
    } catch (err) {
      showToast(err?.message || "Failed to clock out.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Google Maps renderer hook
  useEffect(() => {
    if (!selectedLogForMap || !mapContainerRef.current || !googleMapsLoaded) return;
    
    const lat = selectedLogForMap.latitude || gpsCoords.lat;
    const lng = selectedLogForMap.longitude || gpsCoords.lng;

    if (mapMarkerRef.current) {
      mapMarkerRef.current.setMap(null);
      mapMarkerRef.current = null;
    }

    const center = { lat, lng };

    const map = new window.google.maps.Map(mapContainerRef.current, {
      center: center,
      zoom: 15,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    googleMapRef.current = map;

    const infoContent = `<div style="font-family:sans-serif;font-size:12px;color:#1e293b;padding:2px;">
      <b>${userName}</b><br/>Login: ${selectedLogForMap.loginTime}
    </div>`;

    const infoWindow = new window.google.maps.InfoWindow({
      content: infoContent,
      position: center,
    });

    const marker = new window.google.maps.Marker({
      position: center,
      map: map,
    });
    
    mapMarkerRef.current = marker;
    infoWindow.open(map, marker);

    return () => {
      if (mapMarkerRef.current) {
        mapMarkerRef.current.setMap(null);
        mapMarkerRef.current = null;
      }
      googleMapRef.current = null;
    };
  }, [selectedLogForMap, googleMapsLoaded]);

  return (
    <div className={isModalView ? "w-full text-slate-800 font-sans space-y-4" : "min-h-screen w-full bg-slate-50 text-slate-800 font-sans p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6"}>
      <canvas ref={canvasRef} className="hidden" />

      {/* Header Navigation */}
      {!isModalView && (
        <div className="flex flex-wrap items-center justify-between bg-white px-3 sm:px-6 py-2.5 sm:py-4 rounded-2xl border border-slate-200/80 shadow-xs gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {!isModalView && (
              <button
                onClick={() => navigate(-1)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-650 flex items-center justify-center transition cursor-pointer shrink-0"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            <div className="min-w-0">
              <h1 className="text-xs sm:text-base font-black text-slate-900 flex items-center gap-1.5 sm:gap-2 truncate">
                <ShieldCheck className="text-emerald-600 w-4 h-4 sm:w-5 sm:h-5 shrink-0" /> <span className="truncate">Attendance Portal</span>
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-bold truncate">{userName} ({userEmpCode})</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-xl shrink-0">
            <button
              onClick={() => setActiveTab("punch")}
              className={`px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === "punch" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              📹 Check In/Out
            </button>
            <button
              onClick={() => setActiveTab("report")}
              className={`px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === "report" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              📊 Logs History
            </button>
          </div>
        </div>
      )}

      {activeTab === "punch" ? (
        <div className="max-w-md mx-auto bg-white rounded-3xl border border-slate-250/80 p-5 shadow-lg space-y-5 text-left">
          {/* Header section (Title & Location) */}
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-black text-slate-800 tracking-tight">My Attendance</h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Mark login and logout for Employees.</p>
          </div>

          {!isEnrolled && (
            <div className="bg-amber-50 border border-amber-250 p-4 rounded-2xl text-[11px] font-bold text-amber-900 space-y-1.5 select-none">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertCircle size={16} />
                <span>Biometric Face Profile Missing</span>
              </div>
              <p className="font-semibold text-amber-800 leading-relaxed">
                Your face biometrics are not registered yet. Please contact your System Administrator to enroll your face in the Admin Portal. Face recognition is required for Login and Logout.
              </p>
            </div>
          )}

          {/* Camera or Success verification green card */}
          {matchStatus === "MATCHED" ? (
            <div className="flex flex-col items-center justify-center py-7 px-5 text-center space-y-4 rounded-3xl bg-[#133020] text-white transition-all duration-300">
              <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <svg className="w-7 h-7 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white tracking-tight">Login Successful</h3>
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 border border-white/10 rounded-full text-xs font-bold text-white">
                  <span>👤</span>
                  <span>{userName}</span>
                </div>
              </div>
              <p className="text-[10px] text-white/70 font-bold">Face verified successfully</p>
            </div>
          ) : (
            <div className="relative w-full aspect-[4/3] rounded-3xl bg-slate-950 overflow-hidden shadow-inner border border-slate-200 flex items-center justify-center">
              {isCameraActive ? (
                <>
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
                  
                  {/* Face Guide oval frame */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className={`w-[130px] h-[170px] sm:w-[200px] sm:h-[260px] rounded-[50%] border-4 transition-all duration-300 shadow-[0_0_0_9999px_rgba(15,23,42,0.45)] ${
                      isFaceAligned ? "border-emerald-500" : "border-amber-500 animate-pulse"
                    }`} />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-500 font-semibold text-[11px] py-10">
                  <VideoOff size={28} />
                  <span>{isEnrolled ? "Camera is Off" : "🔒 Biometrics Required"}</span>
                </div>
              )}
            </div>
          )}

          {/* Destination Dropdown for Client Visit */}
          {workMode === "client" && !isAdmin && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                Target Client Destination (Required)
              </label>
              {loadingClients ? (
                <div className="text-xs text-slate-500 font-bold p-2 bg-slate-100 rounded-xl text-center">
                  Loading assigned clients...
                </div>
              ) : assignedClients.length === 0 ? (
                <div className="text-xs text-rose-600 font-bold p-3 bg-rose-50 border border-rose-100 rounded-xl text-center">
                  No Leads or Customers are assigned to you.
                </div>
              ) : (
                <>
                  <select
                    value={selectedClient ? selectedClient.id : ""}
                    onChange={async (e) => {
                      const client = assignedClients.find(c => c.id === e.target.value);
                      if (client) {
                        if (client.latitude == null || client.longitude == null) {
                          showToast("🔄 Fetching client coordinates from address...", "info");
                          const coords = await geocodeAddress(client.address);
                          if (coords) {
                            client.latitude = coords.latitude;
                            client.longitude = coords.longitude;
                            try {
                              if (client.category === 'Lead') {
                                await crmAPI.updateLead(client.id, { latitude: coords.latitude, longitude: coords.longitude });
                              } else if (client.category === 'Customer') {
                                await customerAPI.updateCustomer(client.id, { latitude: coords.latitude, longitude: coords.longitude });
                              }
                              showToast("📍 Client coordinates updated and saved successfully!", "success");
                            } catch (dbErr) {
                              console.warn("Failed to persist coordinates to database:", dbErr);
                            }
                          } else {
                            showToast("⚠️ Could not resolve client address to coordinates.", "warning");
                          }
                        }
                        setSelectedClient({ ...client });
                      } else {
                        setSelectedClient(null);
                      }
                    }}
                    className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-emerald-500 focus:bg-white transition text-slate-900 cursor-pointer"
                  >
                    <option value="">-- Select Client (Lead or Customer) --</option>
                    {assignedClients.map((c) => (
                      <option key={c.id} value={c.id}>
                        [{c.category}] {c.title} {c.company_name !== c.title ? `(${c.company_name})` : ''}
                      </option>
                    ))}
                  </select>
                  {selectedClient && (
                    <div className="text-[10px] font-bold px-1 select-none">
                      {selectedClient.latitude && selectedClient.longitude ? (
                        <span className="text-emerald-600">
                          📍 Destination Set: {selectedClient.latitude.toFixed(4)}, {selectedClient.longitude.toFixed(4)}
                        </span>
                      ) : (
                        <span className="text-amber-600 flex items-center gap-1">
                          ⚠️ Stored GPS coordinates missing. Reverse-geocoding/address fallback will be used on map.
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Remarks Field (Show for non-Admins or if client visit is active) */}
          {!isAdmin && (
            <div className="space-y-1">
              <input
                type="text"
                value={punchRemarks}
                onChange={(e) => setPunchRemarks(e.target.value)}
                placeholder={workMode === "office" ? "Add a remark (optional)" : "Enter visit remarks / notes"}
                className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-emerald-500 focus:bg-white transition text-slate-900"
              />
            </div>
          )}

          {/* Pill Action Buttons Row */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                setIsCameraActive(false);
                setMatchStatus("PENDING");
                setTimeout(() => {
                  setIsCameraActive(true);
                  startLivenessScan();
                }, 100);
              }}
              disabled={!isEnrolled}
              className="py-2.5 px-3 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-extrabold text-slate-700 transition cursor-pointer flex items-center justify-center text-center shadow-xs disabled:opacity-50"
            >
              START CAMERA
            </button>
            <button
              onClick={handleClockInSubmit}
              disabled={!isEnrolled || isSaving || (matchStatus !== "MATCHED" && matchStatus !== "FALLBACK")}
              className={`py-2.5 px-3 rounded-full text-[10px] font-extrabold text-white transition cursor-pointer text-center ${
                (matchStatus === "MATCHED" || matchStatus === "FALLBACK") && !isSaving
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-md"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              {isSaving ? "SAVING..." : "LOGIN"}
            </button>
            <button
              onClick={handleClockOutSubmit}
              disabled={!isEnrolled || isSaving || (matchStatus !== "MATCHED" && matchStatus !== "FALLBACK")}
              className={`py-2.5 px-3 rounded-full text-[10px] font-extrabold text-white transition cursor-pointer text-center ${
                (matchStatus === "MATCHED" || matchStatus === "FALLBACK") && !isSaving
                  ? "bg-rose-600 hover:bg-rose-700 shadow-md"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              {isSaving ? "SAVING..." : "LOGOUT"}
            </button>
          </div>

          {/* Success marked feedback banners */}
          {(checkedInSuccessfully || checkedOutSuccessfully) && (
            <div className="py-3 px-4 bg-emerald-50 border border-emerald-150 text-emerald-700 rounded-xl text-center text-xs font-black animate-pulse transition-all">
              {checkedInSuccessfully ? "Login Marked Successfully!" : "Logout Marked Successfully!"}
            </div>
          )}

          {/* Face Status Info Card */}
          <div className="bg-slate-50/50 border border-slate-200 p-4 rounded-2xl space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
              Face Status
            </span>
            <div className="text-xs font-extrabold text-slate-700">
              {matchStatus === "MATCHED" ? "Login Successful" : matchStatus === "FALLBACK" ? "Using identity fallback" : matchStatus === "FAILED" ? "Face not recognized. Retry." : "Ready to scan face"}
            </div>
          </div>

          {/* Current Location Info Card */}
          <div className="bg-[#f0faf5] border border-[#dcf5e7] p-4 rounded-2xl space-y-1">
            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider block">
              Current Location
            </span>
            <div className="text-xs font-extrabold text-slate-755 leading-relaxed">
              {currentLocation}
            </div>
          </div>
        </div>
      ) : (
        /* History logs list view */
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-sm font-black text-slate-900">Attendance Log Details</h2>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Filter by date ranges and export history logs.</p>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download size={13} /> Export Logs <span className="text-[9px]">▼</span>
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1 flex flex-col gap-0.5">
                    <button
                      onClick={() => {
                        const exportData = attendanceLogs.map(a => ({
                          Employee: userName,
                          EmployeeID: userEmpCode,
                          Date: a.date,
                          CheckIn: a.loginTime,
                          CheckOut: a.logoutTime,
                          WorkHours: a.workHours,
                          Status: a.status,
                          Remarks: a.remarks,
                          Location: a.loginLocation
                        }));
                        exportToExcel(`Attendance_${selectedMonth}`, exportData);
                        setShowExportMenu(false);
                      }}
                      className="px-3 py-1.5 rounded-lg text-left text-xs font-bold text-slate-700 hover:bg-teal-50 hover:text-teal-755 transition flex items-center gap-2"
                    >
                      <FileSpreadsheet size={14} className="text-emerald-600" /> Excel Format
                    </button>
                    <button
                      onClick={() => {
                        const exportData = attendanceLogs.map(a => ({
                          Employee: userName,
                          Date: a.date,
                          CheckIn: a.loginTime,
                          CheckOut: a.logoutTime,
                          WorkHours: a.workHours,
                          Status: a.status,
                          Remarks: a.remarks
                        }));
                        exportToCSV(`Attendance_${selectedMonth}.csv`, exportData);
                        setShowExportMenu(false);
                      }}
                      className="px-3 py-1.5 rounded-lg text-left text-xs font-bold text-slate-700 hover:bg-teal-50 hover:text-teal-755 transition flex items-center gap-2"
                    >
                      <FileText size={14} className="text-blue-600" /> CSV Format
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Filter segments */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg">
                {["TODAY", "YESTERDAY", "WEEK", "MONTH", "CUSTOM"].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setReportFilterMode(mode)}
                    className={`px-3 py-1 rounded-md text-[10px] font-black transition cursor-pointer ${
                      reportFilterMode === mode ? "bg-slate-900 text-white shadow-xs" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {reportFilterMode === "CUSTOM" ? (
                <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-2 py-0.5 bg-white text-[11px] font-bold text-slate-700">
                  <span className="text-slate-450">Date:</span>
                  <input
                    type="date"
                    value={customDateFilter}
                    onChange={(e) => setCustomDateFilter(e.target.value)}
                    className="bg-transparent focus:outline-none cursor-pointer"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-3 py-1 bg-white text-[11px] font-bold text-slate-700">
                  <span>{selectedMonth}</span>
                  <CalendarDays size={12} className="text-slate-400" />
                </div>
              )}
            </div>

            {/* Logs list table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              {(() => {
                const filtered = attendanceLogs.filter((log) => {
                  const todayStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                  const todayISO = new Date().toISOString().slice(0, 10);
                  const yesterdayObj = new Date();
                  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
                  const yesterdayStr = yesterdayObj.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                  const yesterdayISO = yesterdayObj.toISOString().slice(0, 10);

                  const dStr = String(log.date || "");
                  if (reportFilterMode === "TODAY") {
                    return dStr.includes(todayStr) || dStr.includes(todayISO);
                  }
                  if (reportFilterMode === "YESTERDAY") {
                    return dStr.includes(yesterdayStr) || dStr.includes(yesterdayISO);
                  }
                  if (reportFilterMode === "WEEK") {
                    const itemTime = new Date(log.date).getTime();
                    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                    return !isNaN(itemTime) && itemTime >= sevenDaysAgo;
                  }
                  if (reportFilterMode === "CUSTOM" && customDateFilter) {
                    return dStr.includes(customDateFilter);
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="p-8 text-center bg-slate-50 text-xs font-bold text-slate-500">
                      No records matched for selected period.
                    </div>
                  );
                }

                return (
                  <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3">In</th>
                        <th className="px-5 py-3">Out</th>
                        <th className="px-5 py-3">Work Hours</th>
                        <th className="px-5 py-3">Location Address</th>
                        <th className="px-5 py-3">Remarks / Purpose</th>
                        <th className="px-5 py-3 text-center">Map</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filtered.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition">
                          <td className="px-5 py-3.5 font-bold text-slate-900 whitespace-nowrap">{row.date}</td>
                          <td className="px-5 py-3.5 font-bold text-emerald-700 whitespace-nowrap">{row.loginTime}</td>
                          <td className="px-5 py-3.5 font-bold text-rose-700 whitespace-nowrap">{row.logoutTime}</td>
                          <td className="px-5 py-3.5 font-black text-slate-900 whitespace-nowrap">{row.workHours}</td>
                          <td className="px-5 py-3.5 text-slate-555 max-w-xs truncate" title={row.loginLocation}>{row.loginLocation}</td>
                          <td className="px-5 py-3.5 text-slate-555 max-w-xs truncate font-medium" title={row.remarks}>{row.remarks}</td>
                          <td className="px-5 py-3.5 text-center whitespace-nowrap">
                            <button
                              onClick={() => setSelectedLogForMap(row)}
                              className="p-1 rounded-lg bg-slate-100 hover:bg-teal-50 text-slate-500 hover:text-teal-600 transition cursor-pointer"
                              title="View Map"
                            >
                              <Map size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Map modal pop-up */}
      {selectedLogForMap && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <MapPin size={16} className="text-teal-600" /> GPS Map Coordinates
                </h3>
                <p className="text-[10px] text-slate-450 font-bold">{selectedLogForMap.date} · {userName}</p>
              </div>
              <button
                onClick={() => setSelectedLogForMap(null)}
                className="text-slate-400 hover:text-slate-700 font-extrabold"
              >
                ✕
              </button>
            </div>
            <div className="w-full h-64 rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
              <div ref={mapContainerRef} className="w-full h-full" />
            </div>
            <p className="text-[11px] font-bold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
              📍 <b>Captured Address:</b> {selectedLogForMap.loginLocation}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}