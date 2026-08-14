import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { notificationAPI, hrmsAPI } from "../../services/api.js";
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
  // Personal
  dob: "2000-05-15",
  maritalStatus: "Single",
  bloodGroup: "B+",
  panId: "ABCDE1234F",
  personalEmail: "",
  alternateContact: "+91 98765 99999",
  currentAddress: "Plot No. 15, Adyar IT Corridor, Chennai - 600020",
  permanentAddress: "No. 42, Main Road, Madurai, Tamil Nadu - 625001",
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
    fullName: emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.fullName,
    employeeId: emp.employee_code || emp.employee_id || emp.employeeId,
    officialEmail: emp.email || emp.officialEmail,
    phone: emp.phone || emp.mobile || emp.phone,
    role: emp.role || emp.role,
    team: emp.department || emp.team,
    designation: emp.designation || emp.designation,
    gender: emp.gender || emp.gender,
    employmentType: emp.employment_type || emp.employmentType,
    employmentStatus: emp.is_active ? "Active" : "Inactive",
    joinDate: emp.joining_date || emp.joinDate,
    workMode: emp.work_mode || emp.workMode,
    workLocation: emp.work_location || emp.workLocation,
    reportingManager: emp.reporting_manager_name || emp.reporting_manager_email || emp.reportingManager,
    dob: emp.date_of_birth || emp.dob,
    maritalStatus: emp.marital_status || emp.maritalStatus,
    bloodGroup: emp.blood_group || emp.bloodGroup,
    panId: emp.pan_id || emp.panId,
    personalEmail: emp.personal_email || emp.personalEmail,
    alternateContact: emp.alternate_contact || emp.alternateContact,
    currentAddress: emp.current_address || emp.currentAddress,
    permanentAddress: emp.permanent_address || emp.permanentAddress,
    primarySkills: emp.primary_skills || emp.primarySkills,
    secondarySkills: emp.secondary_skills || emp.secondarySkills,
    tools: emp.tools || emp.tools,
    emergencyName: emp.emergency_name || emp.emergencyName,
    emergencyRelationship: emp.emergency_relationship || emp.emergencyRelationship,
    emergencyContact: emp.emergency_contact || emp.emergencyContact,
    accountHolder: emp.account_holder || emp.accountHolder,
    bankName: emp.bank_name || emp.bankName,
    accountNumber: emp.account_number || emp.accountNumber,
    ifsc: emp.ifsc || emp.ifsc,
    branch: emp.branch || emp.branch,
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
  };
};

export default function SalesLayout() {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [notifCount, setNotifCount] = useState(0);
  const [gpsActive, setGpsActive] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [myProfileOpen, setMyProfileOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setOpen(true);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

    // Fetch live data from Supabase
    const code = empCode || user.employee_code || user.id || "EMP000012";
    hrmsAPI.getEmployeeById(code)
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
        }
      })
      .catch((err) => {
        console.warn("Could not retrieve online profile data:", err);
      });
  }, [myProfileOpen, empCode, user.employee_code, user.id]);

  const saveProfile = async () => {
    try {
      localStorage.setItem("tc_se_profile", JSON.stringify(profile));
      const code = empCode || user.employee_code || user.id || "EMP000012";
      const dbPayload = mapFrontendToDb(profile);
      if (profilePhoto) {
        dbPayload.profile_photo = profilePhoto;
      }
      await hrmsAPI.updateEmployee(code, dbPayload);
      showToast("Profile synced online to Supabase!", "success");
    } catch (err) {
      console.error(err);
      showToast("Profile updated locally, online sync failed.", "warning");
    }
    setEditMode(false);
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
      localStorage.setItem("tc_se_documents", JSON.stringify(documentsList));
    } catch (err) { }
  }, [documentsList]);

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
        () => setGpsActive(true),
        () => setGpsActive(false)
      );
    }
  }, []);

  const handleLogout = () => {
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
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden relative">
      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 bg-white border-r border-slate-200 transition-all duration-300 ease-in-out flex flex-col ${open ? "w-64" : "w-0 md:w-20"
          } ${isMobile && !open ? "-translate-x-full" : "translate-x-0"}`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 flex-shrink-0">
          <Link to="/sales/dashboard" className="flex items-center gap-2.5 shrink-0 overflow-hidden">
            <TwiteConnectLogo className="w-8 h-8 shrink-0" showText={open} />
          </Link>
          <button
            onClick={() => setOpen(false)}
            className={`text-slate-400 hover:text-slate-600 p-1 transition ${open ? 'block' : 'hidden'}`}
            aria-label="Close sidebar"
          >
            <X size={20} />
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
                  } ${!open ? "justify-center" : ""}`
                }
                title={!open ? m.title : undefined}
              >
                {isCustomizing && open && <GripVertical size={14} className="text-slate-400 shrink-0 mr-1" />}
                <m.icon size={18} className="flex-shrink-0" />
                {open && <span className="truncate">{m.title}</span>}
              </NavLink>
            </div>
          ))}
          {open && (
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
          {open ? (
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

      {/* ── Main App Content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white shadow-xs flex justify-between items-center px-4 sm:px-6 flex-shrink-0 border-b border-slate-100 z-30">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Hamburger — visible on all screen sizes */}
            <button
              onClick={() => setOpen(!open)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition cursor-pointer shrink-0"
              aria-label="Toggle navigation drawer"
            >
              <Menu size={20} />
            </button>
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

        {/* Page Content Container */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 overflow-y-auto min-w-0 pb-20 md:pb-6">
          <Outlet />
        </main>

        {/* ── Mobile Bottom Navigation Dock ────────────────────────── */}
        <div className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 px-2 py-1.5 flex items-center justify-around shadow-lg">
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

          <div className="w-full max-w-2xl bg-slate-50 h-full overflow-y-auto flex flex-col shadow-2xl border-l border-slate-200">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <UserCircle size={20} className="text-teal-600" />
                <h2 className="text-base font-black text-slate-900">Executive Profile</h2>
              </div>
              <div className="flex items-center gap-2">
                {editMode ? (
                  <>
                    <button
                      onClick={() => setEditMode(false)}
                      className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-slate-100 text-slate-600 cursor-pointer hover:bg-slate-200 transition flex items-center gap-1"
                    >
                      <X size={13} /> Cancel
                    </button>
                    <button
                      onClick={saveProfile}
                      className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700 transition flex items-center gap-1"
                    >
                      <Save size={13} /> Save Profile
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditMode(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-teal-600 text-white cursor-pointer hover:bg-teal-700 transition flex items-center gap-1"
                  >
                    <Pencil size={13} /> Edit Profile
                  </button>
                )}
                <button
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
                        <p className={`text-[11px] font-semibold mt-0.5 ${doc.status === "uploaded" ? "text-emerald-600" : "text-slate-400"}`}>
                          {doc.status === "uploaded" ? `✅ ${doc.fileName}` : "📄 Required — not uploaded yet"}
                        </p>
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
                        {doc.status === "uploaded" && (
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            className="text-xs font-extrabold px-2.5 py-1.5 rounded-xl bg-teal-50 text-teal-800 border border-teal-300 cursor-pointer flex items-center gap-1 hover:bg-teal-100 transition"
                          >
                            <Eye size={12} /> View
                          </button>
                        )}
                        <button
                          onClick={() => document.getElementById(`se_doc_${doc.id}`)?.click()}
                          className="text-xs font-extrabold px-2.5 py-1.5 rounded-xl bg-slate-900 text-white cursor-pointer flex items-center gap-1 hover:bg-slate-700 transition"
                        >
                          <Upload size={12} /> {doc.status === "uploaded" ? "Re-upload" : "Upload"}
                        </button>
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

const Field = ({ label, value, editMode, onChange, readOnly = false }) => (
  <div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
    {editMode ? (
      <input
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