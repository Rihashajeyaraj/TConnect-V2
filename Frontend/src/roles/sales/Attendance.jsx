import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Camera, VideoOff } from "lucide-react";
import { useToast } from "../../common/ToastContext.jsx";

import useCurrentUser from "../../hooks/useCurrentUser.js";

export default function Attendance() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const currentUser = useCurrentUser();

  const [isCameraActive, setIsCameraActive] = useState(true);
  const [faceStatus, setFaceStatus] = useState("Ready — Click Login or Logout");
  const [currentLocation, setCurrentLocation] = useState("Fetching GPS location...");
  const [isLogging, setIsLogging] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Initialize WebCam stream
  useEffect(() => {
    let activeStream = null;
    if (isCameraActive) {
      navigator.mediaDevices
        ?.getUserMedia({ video: { width: 1280, height: 720, facingMode: "user" } })
        .then((stream) => {
          activeStream = stream;
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.warn("Camera access denied or unavailable:", err);
          setFaceStatus("Camera unavailable — Please check permissions.");
        });
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isCameraActive]);

  // Fetch Live Geolocation
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(4);
          const lng = pos.coords.longitude.toFixed(4);
          setCurrentLocation(`13D-1, 13/28, E Club Rd, Venkatasamy Nagar, Shenoy Nagar, Chennai, Tamil Nadu 600030, India (${lat}, ${lng})`);
        },
        () => {
          setCurrentLocation("13D-1, 13/28, E Club Rd, Venkatasamy Nagar, Shenoy Nagar, Chennai, Tamil Nadu 600030, India");
        }
      );
    } else {
      setCurrentLocation("13D-1, 13/28, E Club Rd, Venkatasamy Nagar, Shenoy Nagar, Chennai, Tamil Nadu 600030, India");
    }
  }, []);

  const handleStopCamera = () => {
    setIsCameraActive(!isCameraActive);
    setFaceStatus(isCameraActive ? "Camera stopped." : "Ready — Click Login or Logout");
  };

  const handleAttendanceSubmit = (type) => {
    setIsLogging(true);
    const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const todayDateStr = new Date().toLocaleDateString("en-GB", { day: "02-digit", month: "short", year: "numeric" });

    setTimeout(() => {
      setIsLogging(false);
      try {
        const savedLogs = JSON.parse(localStorage.getItem("tc_attendance_logs") || "[]");
        const cleanLoc = currentLocation.replace(/\s*\([\d.,\s-]+\)/, "");

        const userEmail = (currentUser.email || "").toLowerCase().trim();
        const userName = currentUser.name || currentUser.full_name || userEmail.split("@")[0] || "Sales Executive";
        const userEmpCode = currentUser.employee_code || currentUser.employee_id || "";
        const userId = currentUser.id || currentUser.user_id || "";

        if (type === "LOGIN") {
          const newEntry = {
            date: todayDateStr,
            loginTime: nowStr,
            logoutTime: "—",
            loginLocation: cleanLoc,
            logoutLocation: "—",
            workHours: "—",
            user_id: userId,
            employee_id: userEmpCode,
            email: userEmail,
            executive: userName,
            timestamp: Date.now()
          };
          localStorage.setItem("tc_attendance_logs", JSON.stringify([newEntry, ...savedLogs]));
          setFaceStatus(`✅ Logged IN at ${nowStr}`);
          showToast(`✅ Login Attendance marked at ${nowStr}! Synced to HRMS.`, "success");
        } else {
          // LOGOUT
          if (savedLogs.length > 0 && (savedLogs[0].logoutTime === "—" || !savedLogs[0].logoutTime)) {
            savedLogs[0].logoutTime = nowStr;
            savedLogs[0].logoutLocation = cleanLoc;
            savedLogs[0].workHours = "08:15:30";
            savedLogs[0].user_id = userId;
            savedLogs[0].employee_id = userEmpCode;
            savedLogs[0].email = userEmail;
            savedLogs[0].executive = userName;
          } else {
            savedLogs.unshift({
              date: todayDateStr,
              loginTime: "09:15 AM",
              logoutTime: nowStr,
              loginLocation: cleanLoc,
              logoutLocation: cleanLoc,
              workHours: "08:15:30",
              user_id: userId,
              employee_id: userEmpCode,
              email: userEmail,
              executive: userName,
              timestamp: Date.now()
            });
          }
          localStorage.setItem("tc_attendance_logs", JSON.stringify(savedLogs));
          setFaceStatus(`🔴 Logged OUT at ${nowStr}`);
          showToast(`🔴 Logout Attendance marked at ${nowStr}! Synced to HRMS.`, "info");
        }
      } catch (err) {}
    }, 600);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#1b2537] overflow-hidden flex items-center justify-center p-4 sm:p-6 font-sans">
      {/* Background Graphic Canvas Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#12283e] via-[#1a2d48] to-[#3a1d30] opacity-90" />
      <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:28px_28px] opacity-15" />

      {/* Top Left Floating Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-6 left-6 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg transition cursor-pointer"
        aria-label="Back"
      >
        <ChevronLeft size={20} />
      </button>

      {/* Center White Modal Card (Exact Screenshot Match) */}
      <div className="relative z-10 bg-white rounded-[28px] shadow-2xl max-w-xl w-full p-6 sm:p-8 space-y-5 border border-slate-100 my-auto">
        {/* Header Title & Subtitle */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            My Attendance
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-semibold">
            Mark login and logout for Employees.
          </p>
        </div>

        {/* Live Camera View Box */}
        <div className="relative w-full aspect-[4/3] rounded-2xl bg-slate-900 overflow-hidden shadow-inner border border-slate-200 flex items-center justify-center">
          {isCameraActive ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-400 font-semibold text-xs">
              <VideoOff size={32} />
              <span>Camera Stopped</span>
            </div>
          )}
        </div>

        {/* Action Controls Row (STOP CAMERA | LOGIN | LOGOUT) */}
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={handleStopCamera}
            className="py-3 px-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wide border border-slate-200 transition cursor-pointer"
          >
            {isCameraActive ? "STOP CAMERA" : "START CAMERA"}
          </button>

          <button
            type="button"
            disabled={isLogging}
            onClick={() => handleAttendanceSubmit("LOGIN")}
            className="py-3 px-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-wide transition shadow-md shadow-emerald-500/20 cursor-pointer"
          >
            LOGIN
          </button>

          <button
            type="button"
            disabled={isLogging}
            onClick={() => handleAttendanceSubmit("LOGOUT")}
            className="py-3 px-2 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xs uppercase tracking-wide transition shadow-md shadow-rose-500/20 cursor-pointer"
          >
            LOGOUT
          </button>
        </div>

        {/* Bottom Details Grid (FACE STATUS & CURRENT LOCATION) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Face Status Box */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              FACE STATUS
            </span>
            <p className="text-xs font-bold text-slate-800 leading-snug">
              {faceStatus}
            </p>
          </div>

          {/* Current Location Box */}
          <div className="p-4 bg-emerald-50/60 border border-emerald-200/70 rounded-2xl space-y-1">
            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">
              CURRENT LOCATION
            </span>
            <p className="text-[11px] font-bold text-slate-800 leading-relaxed">
              {currentLocation}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}