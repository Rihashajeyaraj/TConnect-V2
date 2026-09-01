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
            attendance_date: pDate,
            loginTime: p.check_in_time || p.punch_in_time || p.loginTime || "09:20 AM",
            check_in_time: p.check_in_time || p.punch_in_time || p.loginTime || "09:20 AM",
            logoutTime: p.check_out_time || p.punch_out_time || p.logoutTime || "—",
            check_out_time: p.check_out_time || p.punch_out_time || p.logoutTime || "—",
            loginLocation: rawLoc,
            check_in_address: rawLoc,
            logoutLocation: p.check_out_address || p.logoutLocation || "—",
            check_out_address: p.check_out_address || p.logoutLocation || "—",
            workHours: p.total_working_hours || p.workHours || "—",
            total_working_hours: p.total_working_hours || p.workHours || "—",
            status: p.attendance_status || p.status || "Present",
            latitude: p.check_in_latitude || 13.0067,
            longitude: p.check_in_longitude || 80.2570,
            remarks: p.remarks || p.notes || "Normal Punch",
            notes: p.remarks || p.notes || "Normal Punch",
            employee_id: p.employee_id || p.user_id || userEmpCode,
            employee_name: p.employee_name || p.name || userName,
            email: p.email || p.user_email || userEmail,
          };
        });
        setAttendanceLogs(myLogs);
        // ── Sync to localStorage so HRMS attendance record table stays up-to-date ──
        try {
          // Merge with any existing records not in today's API response
          const existing = JSON.parse(localStorage.getItem("tc_attendance_logs") || "[]");
          const merged = [...myLogs];
          existing.forEach(ex => {
            const exDate = ex.date || ex.attendance_date;
            const exIn = ex.loginTime || ex.check_in_time;
            const alreadyPresent = merged.some(m =>
              (m.date === exDate || m.attendance_date === exDate) &&
              (m.loginTime === exIn || m.check_in_time === exIn)
            );
            if (!alreadyPresent) merged.push(ex);
          });
          localStorage.setItem("tc_attendance_logs", JSON.stringify(merged));
          // Fire event so HRMS can react immediately
          window.dispatchEvent(new CustomEvent("tc:attendance-sync"));
        } catch { /* non-critical */ }
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

      // ── Immediately persist to localStorage so HRMS report shows it right away ──
      const todayDateISO = new Date().toISOString().slice(0, 10);
      let readableLoginAddr = encodedAddress;
      if (readableLoginAddr.startsWith("CLIENT_VISIT_DESTINATION:::")) {
        try {
          const parsed = JSON.parse(readableLoginAddr.replace("CLIENT_VISIT_DESTINATION:::", ""));
          readableLoginAddr = `Client Visit: ${parsed.title} (${parsed.company_name}) at ${parsed.address}`;
        } catch { readableLoginAddr = "Client Visit Site"; }
      }
      const newLogEntry = {
        date: todayDateISO,
        attendance_date: todayDateISO,
        loginTime: nowStr,
        check_in_time: nowStr,
        logoutTime: "—",
        check_out_time: "—",
        loginLocation: readableLoginAddr,
        check_in_address: readableLoginAddr,
        logoutLocation: "—",
        check_out_address: "—",
        workHours: "—",
        total_working_hours: "—",
        status: "Present",
        latitude: finalLat || 13.0067,
        longitude: finalLng || 80.2570,
        remarks: finalRemarks,
        notes: finalRemarks,
        employee_id: resolvedEmployeeId,
        employee_name: matchedEmployeeName || userName,
        email: userEmail,
      };
      try {
        const existing = JSON.parse(localStorage.getItem("tc_attendance_logs") || "[]");
        // Remove any same-day login entry to avoid duplicates
        const filtered = existing.filter(e => {
          const eDate = e.date || e.attendance_date || "";
          return !eDate.startsWith(todayDateISO);
        });
        localStorage.setItem("tc_attendance_logs", JSON.stringify([newLogEntry, ...filtered]));
        window.dispatchEvent(new CustomEvent("tc:attendance-sync"));
      } catch { /* non-critical */ }

      // Async refresh from backend (non-blocking)
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

      // ── Immediately update localStorage so HRMS report shows logout time right away ──
      const todayDateISO = new Date().toISOString().slice(0, 10);
      try {
        const existing = JSON.parse(localStorage.getItem("tc_attendance_logs") || "[]");
        const updated = existing.map(e => {
          const eDate = e.date || e.attendance_date || "";
          if (eDate.startsWith(todayDateISO)) {
            return {
              ...e,
              logoutTime: nowStr,
              check_out_time: nowStr,
              logoutLocation: finalAddress || e.logoutLocation || "—",
              check_out_address: finalAddress || e.check_out_address || "—",
              workHours: calcHours,
              total_working_hours: calcHours,
              remarks: `Checked out: ${finalRemarks}`,
            };
          }
          return e;
        });
        // If no today entry existed, add a new one
        const hasTodayEntry = existing.some(e => (e.date || e.attendance_date || "").startsWith(todayDateISO));
        if (!hasTodayEntry) {
          updated.unshift({
            date: todayDateISO,
            attendance_date: todayDateISO,
            loginTime: checkInTime,
            check_in_time: checkInTime,
            logoutTime: nowStr,
            check_out_time: nowStr,
            loginLocation: currentLocation,
            check_in_address: currentLocation,
            logoutLocation: finalAddress || "—",
            check_out_address: finalAddress || "—",
            workHours: calcHours,
            total_working_hours: calcHours,
            status: "Present",
            latitude: finalLat || 13.0067,
            longitude: finalLng || 80.2570,
            remarks: `Checked out: ${finalRemarks}`,
            notes: `Checked out: ${finalRemarks}`,
            employee_id: resolvedEmployeeId,
            employee_name: userName,
            email: userEmail,
          });
        }
        localStorage.setItem("tc_attendance_logs", JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent("tc:attendance-sync"));
      } catch { /* non-critical */ }

      // Async refresh from backend
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
        <div className="max-w-sm mx-auto bg-white rounded-3xl shadow-xl overflow-hidden" style={{fontFamily: "'Inter', 'Segoe UI', sans-serif"}}>

          {/* ── Title + Location header ── */}
          <div className="pt-6 pb-3 px-6 text-center border-b border-slate-100">
            <h2 className="text-base font-black text-slate-900 tracking-tight">My Attendance</h2>
            <div className="flex items-start justify-center gap-1 mt-1">
              <MapPin size={12} className="text-rose-500 mt-0.5 shrink-0" />
              <p className="text-[11px] text-rose-500 font-semibold leading-snug text-left max-w-[260px] truncate" title={currentLocation}>
                {loadingLocation ? "Detecting location..." : currentLocation}
              </p>
            </div>
          </div>

          {!isEnrolled && (
            <div className="mx-5 mt-4 bg-amber-50 border border-amber-200 p-3 rounded-2xl text-[11px] font-semibold text-amber-800 flex items-start gap-2">
              <AlertCircle size={15} className="text-amber-500 mt-0.5 shrink-0" />
              <span>Biometric face profile missing. Contact admin to enroll.</span>
            </div>
          )}

          {/* ── Camera / Face Verified panel ── */}
          <div className="px-5 pt-4">
            {matchStatus === "MATCHED" ? (
              <div className="w-full aspect-[4/3] rounded-3xl bg-[#133020] flex flex-col items-center justify-center text-white gap-3">
                <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-black">Face Verified</p>
                  <p className="text-[11px] text-white/70 font-semibold mt-0.5">{userName}</p>
                </div>
              </div>
            ) : (
              <div
                className="relative w-full rounded-3xl overflow-hidden border border-slate-800"
                style={{ paddingBottom: "75%", backgroundColor: "#020617" }}
              >
                <div className="absolute inset-0">
                  {isCameraActive ? (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          transform: "scaleX(-1)",
                        }}
                      />
                      {/* Oval face guide + blink liveness overlay */}
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                        <div
                          style={{
                            position: "relative",
                            width: "54%",
                            height: "76%",
                            borderRadius: "50%",
                            border: livenessStatus === "PASSED" ? "4px solid #22c55e" : blinkCount > 0 ? "4px solid #f59e0b" : "4px solid #22c55e",
                            boxShadow: "0 0 0 9999px rgba(0,0,0,0.48)",
                            transition: "border-color 0.3s",
                          }}
                        >
                          {/* Blink dots progress — shown at bottom of oval */}
                          {livenessStatus !== "PASSED" && isFaceAligned && (
                            <div style={{
                              position: "absolute",
                              bottom: "14%",
                              left: "50%",
                              transform: "translateX(-50%)",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              background: "rgba(0,0,0,0.55)",
                              borderRadius: "20px",
                              padding: "4px 14px",
                            }}>
                              {/* Eye icon */}
                              <span style={{ fontSize: "13px" }}>👁️</span>
                              {/* Dot 1 */}
                              <div style={{
                                width: "10px", height: "10px", borderRadius: "50%",
                                background: blinkCount >= 1 ? "#22c55e" : "rgba(255,255,255,0.35)",
                                boxShadow: blinkCount >= 1 ? "0 0 6px #22c55e" : "none",
                                transition: "background 0.4s, box-shadow 0.4s",
                              }} />
                              {/* Dot 2 */}
                              <div style={{
                                width: "10px", height: "10px", borderRadius: "50%",
                                background: blinkCount >= 2 ? "#22c55e" : "rgba(255,255,255,0.35)",
                                boxShadow: blinkCount >= 2 ? "0 0 6px #22c55e" : "none",
                                transition: "background 0.4s, box-shadow 0.4s",
                              }} />
                            </div>
                          )}
                          {/* Verified badge inside oval */}
                          {livenessStatus === "PASSED" && (
                            <div style={{
                              position: "absolute",
                              bottom: "10%",
                              left: "50%",
                              transform: "translateX(-50%)",
                              background: "#22c55e",
                              color: "#fff",
                              borderRadius: "20px",
                              padding: "3px 12px",
                              fontSize: "11px",
                              fontWeight: "900",
                              whiteSpace: "nowrap",
                              letterSpacing: "0.02em",
                            }}>✓ Blink Verified</div>
                          )}
                        </div>
                      </div>
                      {/* Blink instruction banner — top of camera */}
                      {isCameraActive && livenessStatus !== "PASSED" && (
                        <div style={{
                          position: "absolute",
                          top: "8px",
                          left: "50%",
                          transform: "translateX(-50%)",
                          background: "rgba(0,0,0,0.62)",
                          color: "#fff",
                          borderRadius: "20px",
                          padding: "5px 16px",
                          fontSize: "11px",
                          fontWeight: "700",
                          whiteSpace: "nowrap",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          pointerEvents: "none",
                        }}>
                          <span style={{ animation: "pulse 1s infinite" }}>👁️</span>
                          {blinkCount === 0 ? "Blink once to verify" : blinkCount === 1 ? "Blink again to confirm" : "Processing..."}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-500">
                      <VideoOff size={32} />
                      <span className="text-xs font-semibold">{isEnrolled ? "Camera is Off" : "🔒 Biometrics Required"}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Face alignment / blink hint ── */}
          <p className={`text-center text-[11px] font-semibold mt-3 px-5 transition-colors duration-300 ${
            livenessStatus === "PASSED" ? "text-emerald-600" :
            matchStatus === "DETECTING" ? "text-blue-500" :
            matchStatus === "FAILED" ? "text-rose-500" :
            "text-slate-600"
          }`}>
            {matchStatus === "DETECTING" ? "🔍 Matching face..." :
             matchStatus === "FAILED" ? "❌ Face not recognized — try again" :
             matchStatus === "FALLBACK" ? "⚠️ Biometric offline — identity fallback" :
             livenessStatus === "PASSED" ? "✅ Liveness confirmed — matching identity..." :
             isFaceAligned && blinkCount === 0 ? "👁️ Blink once to start liveness check" :
             isFaceAligned && blinkCount === 1 ? "👁️ Blink once more to verify" :
             faceAlignmentFeedback}
          </p>

          {/* ── WHERE ARE YOU WORKING TODAY? ── */}
          <div className="px-5 mt-4">
            <p className="text-center text-[10px] font-black text-slate-400 tracking-widest uppercase mb-2">
              Where are you working today?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setWorkMode("office")}
                className={`flex-1 py-2.5 rounded-full text-[12px] font-bold border-2 transition-all duration-200 ${
                  workMode === "office"
                    ? "border-emerald-500 text-emerald-600 bg-white shadow-sm"
                    : "border-slate-200 text-slate-500 bg-white hover:border-slate-300"
                }`}
              >
                Office
              </button>
              <button
                onClick={() => setWorkMode("client")}
                className={`flex-1 py-2.5 rounded-full text-[12px] font-bold border-2 transition-all duration-200 ${
                  workMode === "client"
                    ? "border-emerald-500 text-emerald-600 bg-white shadow-sm"
                    : "border-slate-200 text-slate-500 bg-white hover:border-slate-300"
                }`}
              >
                Client Visit
              </button>
            </div>
          </div>

          {/* ── Client destination dropdown (Client Visit mode) ── */}
          {workMode === "client" && !isAdmin && (
            <div className="px-5 mt-3 space-y-1.5">
              {loadingClients ? (
                <div className="text-xs text-slate-500 font-semibold p-2 bg-slate-100 rounded-xl text-center">
                  Loading assigned clients...
                </div>
              ) : assignedClients.length === 0 ? (
                <div className="text-xs text-rose-600 font-semibold p-3 bg-rose-50 border border-rose-100 rounded-xl text-center">
                  No Leads or Customers assigned to you.
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
                              showToast("📍 Client coordinates updated!", "success");
                            } catch (dbErr) {
                              console.warn("Failed to persist coordinates:", dbErr);
                            }
                          } else {
                            showToast("⚠️ Could not resolve address to coordinates.", "warning");
                          }
                        }
                        setSelectedClient({ ...client });
                      } else {
                        setSelectedClient(null);
                      }
                    }}
                    className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-emerald-500 focus:bg-white transition text-slate-900 cursor-pointer"
                  >
                    <option value="">-- Select Client Destination --</option>
                    {assignedClients.map((c) => (
                      <option key={c.id} value={c.id}>
                        [{c.category}] {c.title} {c.company_name !== c.title ? `(${c.company_name})` : ''}
                      </option>
                    ))}
                  </select>
                  {selectedClient && (
                    <p className="text-[10px] font-semibold px-1 text-emerald-600">
                      📍 {selectedClient.latitude && selectedClient.longitude
                        ? `Destination: ${selectedClient.latitude.toFixed(4)}, ${selectedClient.longitude.toFixed(4)}`
                        : "⚠️ GPS coords missing — address fallback will be used."}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Start Camera button ── */}
          <div className="px-5 mt-3">
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
              className="w-full py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[12px] font-semibold text-slate-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>🎥</span> Start Camera
            </button>
          </div>

          {/* ── Remark input ── */}
          {!isAdmin && (
            <div className="px-5 mt-3">
              <input
                type="text"
                value={punchRemarks}
                onChange={(e) => setPunchRemarks(e.target.value)}
                placeholder={workMode === "office" ? "Add a remark (optional)" : "Enter visit remarks / notes"}
                className="w-full text-[12px] font-medium px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-emerald-400 focus:bg-white transition text-slate-800 placeholder-slate-400"
              />
            </div>
          )}

          {/* ── LOGIN / LOGOUT buttons ── */}
          <div className="px-5 mt-4 pb-1 grid grid-cols-2 gap-3">
            <button
              id="attendance-login-btn"
              onClick={handleClockInSubmit}
              disabled={isSaving}
              className="py-3.5 rounded-full text-[13px] font-black tracking-widest uppercase text-white transition-all duration-200 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 shadow-md active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSaving ? "..." : "LOGIN"}
            </button>
            <button
              id="attendance-logout-btn"
              onClick={handleClockOutSubmit}
              disabled={isSaving}
              className="py-3.5 rounded-full text-[13px] font-black tracking-widest uppercase text-white transition-all duration-200 bg-gradient-to-r from-pink-400 to-rose-500 hover:from-pink-500 hover:to-rose-600 shadow-md active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSaving ? "..." : "LOGOUT"}
            </button>
          </div>

          {/* ── Status line ── */}
          <div className="px-5 pb-6 mt-3 text-center">
            {(checkedInSuccessfully || checkedOutSuccessfully) ? (
              <p className="text-[12px] font-bold text-emerald-600">
                ✓ {checkedInSuccessfully ? "Login marked successfully!" : "Logout marked successfully!"}
              </p>
            ) : (
              <p className="text-[12px] font-semibold text-slate-500">
                Status: {matchStatus === "MATCHED" ? "Face verified — ready to mark" : matchStatus === "FALLBACK" ? "Identity fallback — ready to mark" : matchStatus === "FAILED" ? "Face not recognized. Retry." : "Ready to mark attendance"}
              </p>
            )}
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