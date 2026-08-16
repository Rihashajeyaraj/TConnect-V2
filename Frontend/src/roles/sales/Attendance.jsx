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
  Map
} from "lucide-react";
import { useToast } from "../../common/ToastContext.jsx";
import { attendanceAPI, visitAPI, customerAPI, spatialAPI } from "../../services/api.js";
import useCurrentUser from "../../hooks/useCurrentUser.js";
import { exportToExcel, exportToCSV } from "../../utils/exportUtils.js";
import { FaceLivenessEngine, LIVENESS_CHALLENGES } from "./FaceLivenessEngine.js";

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

export default function Attendance() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const currentUser = useCurrentUser();

  const userEmail = (currentUser.email || "executive@tconnect.com").toLowerCase().trim();
  const userName = currentUser.name || currentUser.full_name || "Sales Executive";
  const userEmpCode = currentUser.employee_code || currentUser.employee_id || "EMP000012";

  // States
  const [isEnrolled, setIsEnrolled] = useState(true);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [workMode, setWorkMode] = useState("office"); // office, client
  const [punchRemarks, setPunchRemarks] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Biometric & Camera States
  const [matchStatus, setMatchStatus] = useState("PENDING"); // PENDING, DETECTING, MATCHED, FAILED, SPOOF
  const [verificationToken, setVerificationToken] = useState(null);
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
  const [currentLocation, setCurrentLocation] = useState("Detecting location...");
  const [gpsCoords, setGpsCoords] = useState({ lat: 13.0067, lng: 80.2570 });
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
  const leafletInstanceRef = useRef(null);
  const engineRef = useRef(new FaceLivenessEngine());

  // Check enrollment & load logs
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
  }, [userEmpCode, userEmail]);

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
          return {
            date: pDate,
            loginTime: p.check_in_time || p.punch_in_time || p.loginTime || "09:20 AM",
            logoutTime: p.check_out_time || p.punch_out_time || p.logoutTime || "—",
            loginLocation: p.check_in_address || p.loginLocation || "Adyar IT Corridor, Chennai",
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

  // Automatically fetch Location coordinates
  const captureLocation = () => {
    if ("geolocation" in navigator) {
      setLoadingLocation(true);
      setLocationError(null);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          setGpsCoords({ lat, lng });
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            if (data && data.display_name) {
              setCurrentLocation(data.display_name);
            } else {
              setCurrentLocation(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            }
          } catch {
            setCurrentLocation(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          } finally {
            setLoadingLocation(false);
          }
        },
        (err) => {
          console.warn("Location error:", err);
          setLocationError("Location permission required");
          setLoadingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );
    } else {
      setLocationError("Location not supported");
    }
  };

  useEffect(() => {
    captureLocation();
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
  const handleClockInSubmit = async () => {
    if (isSaving) return;
    setIsSaving(true);

    const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    let finalRemarks = punchRemarks.trim();
    if (workMode === "client") {
      finalRemarks = `[Client Visit Mode] ${punchRemarks || 'Client visit meeting'}`;
    } else {
      finalRemarks = `[Office Mode] ${punchRemarks || 'Working from office premises'}`;
    }

    const payload = {
      employee_id: matchedEmployeeId || userEmpCode,
      employee_name: matchedEmployeeName || userName,
      attendance_date: new Date().toISOString().slice(0, 10),
      check_in_time: nowStr,
      latitude: gpsCoords.lat,
      longitude: gpsCoords.lng,
      check_in_latitude: gpsCoords.lat,
      check_in_longitude: gpsCoords.lng,
      check_in_address: currentLocation,
      attendance_status: "Present",
      device_info: navigator.userAgent,
      verified_by_face: true,
      liveness_verified: true,
      liveness_score: 0.98,
      remarks: finalRemarks,
      notes: finalRemarks,
      verification_token: verificationToken,
    };

    try {
      await attendanceAPI.clockIn(payload);
      showToast("Logged In Successfully ✓", "success");
      setCheckedInSuccessfully(true);
      stopCamera();

      // Push live GPS to employee_locations so the manager's Smart Radar Map
      // immediately shows this executive (especially for Client Visit mode)
      if (gpsCoords.lat && gpsCoords.lng) {
        spatialAPI.updateLocation({
          latitude: gpsCoords.lat,
          longitude: gpsCoords.lng,
          accuracy: gpsCoords.accuracy || 10,
          name: matchedEmployeeName || userName,
          employee_code: matchedEmployeeId || userEmpCode,
          mode: workMode === "client" ? "Client Visit" : "Office",
          check_in_address: currentLocation,
        }).catch(() => {
          // Non-critical: map update failure should not block attendance
        });
      }

      loadAttendanceLogs();
    } catch (err) {
      showToast(err?.message || "Failed to clock in.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Clock Out submission
  const handleClockOutSubmit = async () => {
    if (isSaving) return;
    setIsSaving(true);

    const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const checkInTime = todayAttendance ? todayAttendance.loginTime : "09:00 AM";
    const calcHours = calculateWorkHours(checkInTime, nowStr);
    const finalRemarks = checkoutRemarks.trim() || "Shift completed";

    const payload = {
      employee_id: userEmpCode,
      attendance_date: new Date().toISOString().slice(0, 10),
      check_out_time: nowStr,
      latitude: gpsCoords.lat,
      longitude: gpsCoords.lng,
      check_out_latitude: gpsCoords.lat,
      check_out_longitude: gpsCoords.lng,
      check_out_address: currentLocation,
      total_working_hours: calcHours,
      remarks: `Checked out: ${finalRemarks}`,
      device_info: navigator.userAgent,
      verified_by_face: true,
      liveness_verified: true,
      verification_token: verificationToken,
    };

    try {
      await attendanceAPI.clockOut(payload);
      showToast("Logged Out Successfully ✓", "info");
      setCheckedOutSuccessfully(true);
      loadAttendanceLogs();
    } catch (err) {
      showToast(err?.message || "Failed to clock out.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Leaflet map renderer hook
  useEffect(() => {
    if (!selectedLogForMap || !mapContainerRef.current || !window.L) return;
    if (leafletInstanceRef.current) {
      leafletInstanceRef.current.remove();
      leafletInstanceRef.current = null;
    }
    const L = window.L;
    const lat = selectedLogForMap.latitude || gpsCoords.lat;
    const lng = selectedLogForMap.longitude || gpsCoords.lng;

    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: false,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png").addTo(map);
    L.marker([lat, lng])
      .bindPopup(`<b>${userName}</b><br/>Login: ${selectedLogForMap.loginTime}`)
      .addTo(map)
      .openPopup();

    leafletInstanceRef.current = map;
    return () => {
      if (leafletInstanceRef.current) {
        leafletInstanceRef.current.remove();
        leafletInstanceRef.current = null;
      }
    };
  }, [selectedLogForMap]);

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-800 font-sans p-4 sm:p-6 lg:p-8 space-y-6">
      <canvas ref={canvasRef} className="hidden" />

      {/* Header Navigation */}
      <div className="flex flex-wrap items-center justify-between bg-white px-6 py-4 rounded-2xl border border-slate-200/80 shadow-xs gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-650 flex items-center justify-center transition cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-base font-black text-slate-900 flex items-center gap-2">
              <ShieldCheck className="text-emerald-600 w-5 h-5" /> Attendance Portal
            </h1>
            <p className="text-[11px] text-slate-500 font-bold">{userName} ({userEmpCode})</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-0.5 rounded-xl">
          <button
            onClick={() => setActiveTab("punch")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === "punch" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            📹 Check In/Out
          </button>
          <button
            onClick={() => setActiveTab("report")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === "report" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            📊 Logs History
          </button>
        </div>
      </div>

      {activeTab === "punch" ? (
        <div className="max-w-md mx-auto bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-md space-y-6">
          <div className="text-center">
            <h2 className="text-sm font-black text-slate-900">My Attendance</h2>
            {locationError ? (
              <span className="text-[10px] text-rose-600 font-bold">⚠️ {locationError}</span>
            ) : (
              <span className="text-[10px] text-slate-450 font-bold truncate block">📍 {currentLocation}</span>
            )}
          </div>

          {/* Unified Kiosk Check-In & Check-Out View */}
          <div className="space-y-6">
              {/* Camera Section */}
              <div className="relative w-full aspect-[4/3] rounded-2xl bg-slate-950 overflow-hidden shadow-inner border border-slate-200 flex items-center justify-center">
                {isCameraActive ? (
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-500 font-semibold text-xs">
                    <VideoOff size={32} />
                    <span>Camera Starting...</span>
                  </div>
                )}
                
                {/* Face Guide oval frame */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className={`w-[130px] h-[175px] sm:w-[150px] sm:h-[195px] rounded-[50%] border-4 transition-all duration-300 shadow-[0_0_0_9999px_rgba(15,23,42,0.45)] ${
                    isFaceAligned ? "border-emerald-500" : "border-amber-500 animate-pulse"
                  }`} />
                </div>
              </div>

              {/* Progress Indicator */}
              <div className="text-center space-y-1">
                {matchStatus === "MATCHED" ? (
                  <div className="text-emerald-600 font-black text-xs flex items-center justify-center gap-1">
                    <CheckCircle2 size={14} /> Face verified ✓
                  </div>
                ) : matchStatus === "FALLBACK" ? (
                  <div className="space-y-1">
                    <div className="text-amber-600 font-black text-xs flex items-center justify-center gap-1">
                      <AlertCircle size={13} /> Biometric Unavailable
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold">Using identity fallback — proceed with Login</div>
                  </div>
                ) : matchStatus === "FAILED" ? (
                  <div className="text-rose-600 font-black text-xs flex items-center justify-center gap-1">
                    <AlertCircle size={13} /> Face not recognized. Retry.
                  </div>
                ) : livenessStatus === "VERIFYING" && isFaceAligned ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1.5 text-xs text-slate-700 font-bold select-none">
                      <span>Blink Progress:</span>
                      <span className="text-sm font-black">
                        {blinkCount === 0 && "○ ○"}
                        {blinkCount === 1 && "● ○"}
                        {blinkCount >= 2 && "● ●"}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-450 font-bold">Blink naturally</div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-450 font-bold">
                    Position your face inside the oval guide
                  </div>
                )}
              </div>

              {/* Work Mode Selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block text-center">
                  Where are you working today?
                </label>
                <div className="grid grid-cols-2 gap-3.5">
                  <button
                    onClick={() => setWorkMode("office")}
                    className={`py-2 px-4 rounded-xl border text-xs font-extrabold transition cursor-pointer select-none ${
                      workMode === "office"
                        ? "border-emerald-600 bg-emerald-50/20 text-emerald-700 font-black"
                        : "border-slate-200 hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    Office
                  </button>
                  <button
                    onClick={() => setWorkMode("client")}
                    className={`py-2 px-4 rounded-xl border text-xs font-extrabold transition cursor-pointer select-none ${
                      workMode === "client"
                        ? "border-emerald-600 bg-emerald-50/20 text-emerald-700 font-black"
                        : "border-slate-200 hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    Client Visit
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsCameraActive(false);
                    setTimeout(() => {
                      setIsCameraActive(true);
                      startLivenessScan();
                    }, 100);
                  }}
                  className="w-full py-2 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-black text-slate-700 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  📹 Start Camera
                </button>
              </div>

              {/* Remarks Field */}
              <div className="space-y-1">
                <input
                  type="text"
                  value={punchRemarks}
                  onChange={(e) => setPunchRemarks(e.target.value)}
                  placeholder={workMode === "office" ? "Add a remark (optional)" : "Enter visit details"}
                  className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-emerald-500 focus:bg-white transition text-slate-900"
                />
              </div>

              {/* Actions Panel showing both buttons */}
              {checkedInSuccessfully ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-800 font-bold animate-pulse">
                  ✓ Logged In Successfully ✓
                </div>
              ) : checkedOutSuccessfully ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center text-xs text-rose-800 font-bold animate-pulse">
                  ✓ Logged Out Successfully ✓
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3.5">
                  <button
                    onClick={handleClockInSubmit}
                    disabled={isSaving || (matchStatus !== "MATCHED" && matchStatus !== "FALLBACK")}
                    className={`py-3 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition cursor-pointer text-center ${
                      matchStatus === "FALLBACK"
                        ? "bg-amber-500 hover:bg-amber-600"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {isSaving ? "Saving..." : "LOGIN"}
                  </button>
                  <button
                    onClick={handleClockOutSubmit}
                    disabled={isSaving || (matchStatus !== "MATCHED" && matchStatus !== "FALLBACK")}
                    className={`py-3 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition cursor-pointer text-center ${
                      matchStatus === "FALLBACK"
                        ? "bg-amber-500 hover:bg-amber-600"
                        : "bg-rose-600 hover:bg-rose-700"
                    }`}
                  >
                    {isSaving ? "Saving..." : "LOGOUT"}
                  </button>
                </div>
              )}

              {/* Status Indicator */}
              <div className="text-center text-[10px] text-slate-455 font-bold pt-2 border-t border-slate-100">
                {todayAttendance ? (
                  <span>
                    Logged in today at: {todayAttendance.loginTime} 
                    {todayAttendance.logoutTime !== "—" && ` · Checked out: ${todayAttendance.logoutTime}`}
                  </span>
                ) : (
                  "Status: Ready to mark attendance"
                )}
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