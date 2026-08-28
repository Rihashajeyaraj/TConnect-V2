import React, { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useLocation, Outlet, useNavigate } from 'react-router-dom'
import { useToast } from '../../common/ToastContext.jsx'
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Target,
  CalendarDays,
  GitBranch,
  Receipt,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ShieldCheck,
  Settings,
  UserCircle,
  Upload,
  Eye,
  FileUp,
  Mail,
  Phone,
  MapPin,
  Building2,
  Briefcase,
  CreditCard,
  HeartPulse,
  Code2,
  AlertCircle,
  Pencil,
  Save,
  Camera,
  GripVertical,
} from 'lucide-react'
import { hrmsAPI } from '../../services/api.js'
import TwiteConnectLogo from '../../common/TwiteConnectLogo.jsx'
import useCurrentUser from '../../hooks/useCurrentUser.js'
import { clearUserCache } from '../../utils/userScope.js'

const mapDbToFrontend = (emp) => {
  if (!emp) return {};
  return {
    fullName: emp.name ?? `${emp.first_name || ""} ${emp.last_name || ""}`.trim() ?? "",
    employeeId: emp.employee_code ?? emp.employee_id ?? "MGR-001",
    officialEmail: emp.email ?? "",
    phone: emp.phone ?? emp.mobile ?? "+91 98765 00099",
    role: emp.role ?? "Sales Manager",
    team: emp.department ?? emp.dept ?? "Sales & Business Development",
    designation: emp.designation ?? "Senior Sales Manager",
    gender: emp.gender ?? "Male",
    employmentType: emp.employment_type ?? "Full-time",
    employmentStatus: emp.status ?? "Active",
    joinDate: emp.joining_date ?? "2024-01-01",
    workMode: emp.work_mode ?? "In Office",
    workLocation: emp.work_location ?? "Chennai, Tamil Nadu",
    reportingManager: emp.reporting_manager_name ?? emp.reporting_manager_email ?? "CEO / Founder (CEO)",
    dob: emp.date_of_birth ?? "",
    maritalStatus: emp.marital_status ?? "Married",
    bloodGroup: emp.blood_group ?? "O+",
    panId: emp.pan_id ?? "",
    personalEmail: emp.personal_email ?? "",
    alternateContact: emp.alternate_contact ?? "",
    currentAddress: emp.current_address ?? "",
    permanentAddress: emp.permanent_address ?? "",
    city: emp.city ?? "Chennai",
    state: emp.state ?? "Tamil Nadu",
    country: emp.country ?? "India",
    postalCode: emp.postal_code ?? "600020",
    primarySkills: emp.primary_skills ?? "Sales Leadership, CRM Systems",
    secondarySkills: emp.secondary_skills ?? "Business Development, Analytics",
    tools: emp.tools ?? "TwiteConnect, Excel, Google Workspace",
    emergencyName: emp.emergency_name ?? "",
    emergencyRelationship: emp.emergency_relationship ?? "Spouse",
    emergencyContact: emp.emergency_contact ?? "",
    accountHolder: emp.account_holder ?? "",
    bankName: emp.bank_name ?? "",
    accountNumber: emp.account_number ?? "",
    ifsc: emp.ifsc ?? "",
    branch: emp.branch ?? "",
    incentivePercentage: emp.incentive_percentage !== undefined && emp.incentive_percentage !== null ? Number(emp.incentive_percentage) : 5.0,
  };
};

const mapFrontendToDb = (prof) => {
  const [first_name, ...last_name_parts] = (prof.fullName || "").split(" ");
  const last_name = last_name_parts.join(" ") || ".";
  return {
    first_name: first_name || "Sales",
    last_name: last_name || "Manager",
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
    incentive_percentage: prof.incentive_percentage !== undefined && prof.incentive_percentage !== null ? Number(prof.incentive_percentage) : 5.0,
  };
};

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/manager' },
  { label: 'Smart Radar Map', icon: MapPin, path: '/manager/map' },
  { label: 'Team Lead Reports', icon: Target, path: '/manager/leads' },
  { label: 'Field Visit Audit', icon: CalendarDays, path: '/manager/visits' },
  { label: 'Expense Claims', icon: Receipt, path: '/manager/expenses' },
  { label: 'Customers', icon: Building2, path: '/manager/customers' },
  { label: 'Team & EOD Reports', icon: Users, path: '/manager/team' },
  { label: 'HRMS', icon: ShieldCheck, path: '/manager/hrms' },
  { label: 'Notifications', icon: Bell, path: '/manager/notifications' },
]

const PROFILE_DEFAULTS = {
  fullName: '',
  employeeId: 'MGR-001',
  officialEmail: '',
  phone: '+91 98765 00099',
  role: 'Sales Manager',
  team: 'Sales & Business Development',
  designation: 'Senior Sales Manager',
  gender: 'Male',
  employmentType: 'Full-time',
  employmentStatus: 'Active',
  joinDate: '2024-01-01',
  workMode: 'In Office',
  workLocation: 'Chennai, Tamil Nadu',
  reportingManager: 'CEO / Founder (CEO)',
  incentivePercentage: 5.0,
  // Personal
  dob: '',
  maritalStatus: 'Married',
  bloodGroup: 'O+',
  panId: '',
  personalEmail: '',
  alternateContact: '',
  currentAddress: '',
  permanentAddress: '',
  city: "Chennai",
  state: "Tamil Nadu",
  country: "India",
  postalCode: "600020",
  // Skills
  primarySkills: 'Sales Leadership, CRM Systems',
  secondarySkills: 'Business Development, Analytics',
  tools: 'TwiteConnect, Excel, Google Workspace',
  // Emergency
  emergencyName: '',
  emergencyRelationship: 'Spouse',
  emergencyContact: '',
  // Bank
  accountHolder: '',
  bankName: '',
  accountNumber: '',
  ifsc: '',
  branch: '',
}

const DOCUMENT_DEFAULTS = [
  { id: 'doc_m1', name: 'Aadhar Card', status: 'pending', fileUrl: null, fileName: '' },
  { id: 'doc_m2', name: 'Offer / Appointment Letter', status: 'pending', fileUrl: null, fileName: '' },
  { id: 'doc_m3', name: 'PAN Card', status: 'pending', fileUrl: null, fileName: '' },
  { id: 'doc_m4', name: 'Manager Agreement', status: 'pending', fileUrl: null, fileName: '' },
  { id: 'doc_m5', name: 'Bank Passbook / Cheque', status: 'pending', fileUrl: null, fileName: '' },
]

export default function ManagerLayout() {
  const { showToast } = useToast()
  const currentUser = useCurrentUser()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [myProfileOpen, setMyProfileOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [showProfileConfirm, setShowProfileConfirm] = useState(false)
  // Tracks profile values at panel-open time — used to diff on save
  const originalProfileRef = useRef(null)
  const [previewDoc, setPreviewDoc] = useState(null)
  const [saving, setSaving] = useState(false)

  // ── Profile Photo State ───────────────────────────────────────────────────
  const [profilePhoto, setProfilePhoto] = useState(() => {
    try { return localStorage.getItem('tc_manager_photo') || null } catch { return null }
  })

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { showToast('Please upload an image file (JPG, PNG, etc.)', 'error'); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target.result
      setProfilePhoto(dataUrl)
      try { localStorage.setItem('tc_manager_photo', dataUrl) } catch (e) { }
      showToast('Profile photo updated!', 'success')
    }
    reader.readAsDataURL(file)
  }

  const removePhoto = () => {
    setProfilePhoto(null)
    try { localStorage.removeItem('tc_manager_photo') } catch (e) { }
    showToast('Profile photo removed.', 'info')
  }
  const location = useLocation()
  const navigate = useNavigate()

  const userEmail = (currentUser?.email || "").toLowerCase().trim();
  const [sidebarItems, setSidebarItems] = useState(() => {
    const saved = localStorage.getItem(`tc_sidebar_order_manager_${userEmail}`);
    if (saved) {
      try {
        const labels = JSON.parse(saved);
        const ordered = [];
        labels.forEach(label => {
          const match = navItems.find(n => n.label === label);
          if (match) ordered.push(match);
        });
        navItems.forEach(n => {
          if (!ordered.some(o => o.label === n.label)) {
            ordered.push(n);
          }
        });
        return ordered;
      } catch (e) {
        return navItems;
      }
    }
    return navItems;
  });

  useEffect(() => {
    const saved = localStorage.getItem(`tc_sidebar_order_manager_${userEmail}`);
    if (saved) {
      try {
        const labels = JSON.parse(saved);
        const ordered = [];
        labels.forEach(label => {
          const match = navItems.find(n => n.label === label);
          if (match) ordered.push(match);
        });
        navItems.forEach(n => {
          if (!ordered.some(o => o.label === n.label)) {
            ordered.push(n);
          }
        });
        setSidebarItems(ordered);
      } catch (e) {
        setSidebarItems(navItems);
      }
    } else {
      setSidebarItems(navItems);
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
    const labels = sidebarItems.map(item => item.label);
    localStorage.setItem(`tc_sidebar_order_manager_${userEmail}`, JSON.stringify(labels));
    setIsCustomizing(false);
    showToast("Sidebar layout order saved successfully!", "success");
  };
  const resetCustomization = () => {
    localStorage.removeItem(`tc_sidebar_order_manager_${userEmail}`);
    setSidebarItems(navItems);
    setIsCustomizing(false);
    showToast("Sidebar layout reset to default.", "info");
  };

  const managerName = currentUser.name || 'Sales Manager'
  const managerRole = currentUser.role || 'Sales Manager'
  const managerEmail = currentUser.email || 'manager@tconnect.com'
  const managerInitials = currentUser.initials || (managerName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()) || 'SM'
  const empCode = currentUser.employee_code || currentUser.employee_id || 'MGR-001'

  // ── Profile State ──────────────────────────────────────────────────────────
  const [profile, setProfile] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('tc_manager_profile') || '{}')
      return {
        ...PROFILE_DEFAULTS,
        fullName: managerName,
        officialEmail: managerEmail,
        employeeId: empCode,
        role: managerRole,
        ...saved,
      }
    } catch { return { ...PROFILE_DEFAULTS, fullName: managerName, officialEmail: managerEmail, employeeId: empCode, role: managerRole } }
  })

  const displayName = profile?.fullName || managerName
  const displayInitials = (displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()) || 'SM'

  useEffect(() => {
    if (!myProfileOpen) return

    const code = currentUser.employee_id || currentUser.auth_user_id || currentUser.id || empCode || 'MGR-001'
    hrmsAPI.getEmployeeById(code)
      .then((res) => {
        if (res && res.data) {
          const emp = res.data
          const mapped = {
            ...PROFILE_DEFAULTS,
            ...mapDbToFrontend(emp),
            employeeId: emp.employee_code || emp.employee_id || empCode,
          }
          setProfile(mapped)
          originalProfileRef.current = { ...mapped }
          localStorage.setItem('tc_manager_profile', JSON.stringify(mapped))
          if (emp.profile_photo) {
            setProfilePhoto(emp.profile_photo)
            localStorage.setItem('tc_manager_photo', emp.profile_photo)
          }
          if (emp.documents) {
            try {
              const parsed = JSON.parse(emp.documents)
              if (Array.isArray(parsed) && parsed.length > 0) {
                setDocumentsList(parsed)
                localStorage.setItem('tc_manager_documents', JSON.stringify(parsed))
              }
            } catch (err) {}
          }
        }
      })
      .catch((err) => {
        console.warn("Could not retrieve online manager profile data:", err)
      })

    return () => {
      originalProfileRef.current = null
    }
  }, [myProfileOpen, empCode, currentUser.employee_code, currentUser.id])

  // Capture original profile once data is loaded (only when entering view mode)
  useEffect(() => {
    if (myProfileOpen && !editMode && originalProfileRef.current === null) {
      originalProfileRef.current = { ...profile }
    }
  }, [myProfileOpen, editMode, profile])

  const closeProfilePanel = () => {
    if (editMode && originalProfileRef.current) {
      setProfile({ ...originalProfileRef.current })
    }
    setMyProfileOpen(false)
    setEditMode(false)
  }

  const saveProfile = async (keepEditing = false) => {
    if (saving) return;
    setSaving(true)
    try {
      const code = currentUser.employee_id || currentUser.auth_user_id || currentUser.id || empCode
      if (!code) throw new Error("No employee identifier found.")

      // ── Build change diff ─────────────────────────────────────────────────
      // Map frontend field names → DB field names (mirrors mapFrontendToDb)
      const EDITABLE_FIELD_MAP = {
        fullName:             "name",
        phone:                "phone",
        gender:               "gender",
        employmentType:       "employment_type",
        workMode:             "work_mode",
        workLocation:         "work_location",
        dob:                  "date_of_birth",
        maritalStatus:        "marital_status",
        bloodGroup:           "blood_group",
        panId:                "pan_id",
        personalEmail:        "personal_email",
        alternateContact:     "alternate_contact",
        currentAddress:       "current_address",
        permanentAddress:     "permanent_address",
        city:                 "city",
        state:                "state",
        country:              "country",
        postalCode:           "postal_code",
        primarySkills:        "primary_skills",
        secondarySkills:      "secondary_skills",
        tools:                "tools",
        emergencyName:        "emergency_name",
        emergencyRelationship:"emergency_relationship",
        emergencyContact:     "emergency_contact",
        accountHolder:        "account_holder",
        bankName:             "bank_name",
        accountNumber:        "account_number",
        ifsc:                 "ifsc",
        branch:               "branch",
        incentivePercentage:  "incentive_percentage",
      }

      const original = originalProfileRef.current || {}
      const dbPayload = {}
      const changedLabels = []

      for (const [frontendKey, dbKey] of Object.entries(EDITABLE_FIELD_MAP)) {
        const oldVal = String(original[frontendKey] ?? "").trim()
        const newVal = String(profile[frontendKey] ?? "").trim()
        if (oldVal !== newVal) {
          const rawVal = profile[frontendKey]
          dbPayload[dbKey] = (rawVal === "" || rawVal === undefined) ? null : rawVal
          changedLabels.push(frontendKey)
        }
      }

      // Handle name split into first_name / last_name
      if (dbPayload.name) {
        const [firstName, ...rest] = (dbPayload.name || "").split(" ")
        dbPayload.first_name = firstName || "Manager"
        dbPayload.last_name  = rest.join(" ") || "."
      }

      // Always include documents and profile_photo in payload
      dbPayload.documents = JSON.stringify(documentsList)
      if (profilePhoto) dbPayload.profile_photo = profilePhoto

      if (changedLabels.length === 0) {
        showToast('No changes to save.', 'info')
        setShowProfileConfirm(false)
        if (!keepEditing) setEditMode(false)
        return
      }

      // ── Send update ───────────────────────────────────────────────────────
      const res = await hrmsAPI.updateEmployee(code, dbPayload)

      // ── Fetch fresh employee record from DB ───────────────────────────────
      const freshRes = await hrmsAPI.getEmployeeById(code)
      const freshEmployee = (freshRes && freshRes.data) ? freshRes.data : ((res && res.data) ? res.data : {})

      const freshProfile = {
        ...PROFILE_DEFAULTS,
        ...mapDbToFrontend(freshEmployee),
      }
      setProfile(freshProfile)
      // Update the original reference so next save diffs from the saved state
      originalProfileRef.current = { ...freshProfile }
      localStorage.setItem('tc_manager_profile', JSON.stringify(freshProfile))

      if (freshEmployee.profile_photo) {
        setProfilePhoto(freshEmployee.profile_photo)
        localStorage.setItem('tc_manager_photo', freshEmployee.profile_photo)
      }
      if (freshEmployee.documents) {
        try {
          const parsed = JSON.parse(freshEmployee.documents)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setDocumentsList(parsed)
            localStorage.setItem('tc_manager_documents', JSON.stringify(parsed))
          }
        } catch (_) {}
      }

      const fieldList = changedLabels.slice(0, 4).join(', ') + (changedLabels.length > 4 ? ` +${changedLabels.length - 4} more` : '')
      showToast(`Profile saved: ${fieldList}`, 'success')
      if (!keepEditing) setEditMode(false)
    } catch (err) {
      console.error(err)
      const errMsg = err.detail
        ? (typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail))
        : (err.message || "Failed to save profile")
      showToast(`Error: ${errMsg}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleProfileKeyDown = (e) => {
    if (!editMode) return;
    if (e.key === 'Enter') {
      // Keep textarea Enter behavior normal (new line)
      if (e.target && e.target.tagName === 'TEXTAREA') {
        return;
      }
      // Only apply on desktop/laptop physical keyboards
      const isMobileDevice = /Mobi|Android|iPhone|iPad|Windows Phone/i.test(navigator.userAgent);
      if (isMobileDevice) {
        return;
      }
      e.preventDefault();
      // Open confirmation modal
      setShowProfileConfirm(true);
    }
  };


  // ── Documents State ────────────────────────────────────────────────────────
  const [documentsList, setDocumentsList] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('tc_manager_documents') || '[]')
    return saved.length > 0 ? saved : DOCUMENT_DEFAULTS
  })
  // NOTE: Documents are intentionally NOT auto-synced to the backend on every
  // change. They are saved explicitly when the user confirms via the modal
  // (Continue Editing / Save & Exit). This prevents noisy background API calls
  // and avoids creating spurious audit log entries on every document upload.

  const handleLogout = () => {
    clearUserCache()
    showToast('Logged out successfully', 'info')
    window.location.href = '/'
  }


  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans relative overflow-x-hidden">

      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="relative h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mgr-card lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
            aria-label="Toggle Navigation Sidebar"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <Link to="/manager" className="flex items-center gap-2.5">
            <TwiteConnectLogo className="w-9 h-9" />
          </Link>
        </div>

        {/* Center: Sleek Metallic Shimmer Indicator (Larger & Centered Absolutely) */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden sm:flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-full px-6 py-2.5 shadow-sm pointer-events-auto">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span
              className="text-sm uppercase tracking-[0.3em] font-black"
              style={{
                background: 'linear-gradient(to right, #475569 20%, #2563eb 40%, #60a5fa 60%, #475569 80%)',
                backgroundSize: '200% auto',
                color: 'transparent',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                animation: 'tc-shimmer 3s linear infinite',
                display: 'inline-block'
              }}
            >
              Sales Manager
            </span>
            <style>{`
              @keyframes tc-shimmer {
                to {
                  background-position: -200% center;
                }
              }
            `}</style>
          </div>
        </div>

        {/* Top-Right Area */}
        <div className="flex items-center gap-1.5 sm:gap-3">

          {/* Avatar + Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="mgr-card flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-blue-50 transition cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center text-white font-black text-sm shadow-xs ring-2 ring-blue-500/20 shrink-0">
                {profilePhoto
                  ? <img src={profilePhoto} alt="avatar" className="w-full h-full object-cover" />
                  : displayInitials
                }
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="font-extrabold text-xs text-slate-800 leading-tight flex items-center gap-1">
                  {displayName} <ChevronDown size={13} className="text-slate-400" />
                </span>
                <span className="text-[10px] text-blue-700 font-extrabold leading-tight truncate max-w-[140px]">{managerRole}</span>
              </div>
            </button>

            {profileOpen && (
              <>
                {/* Backdrop to close dropdown when clicking outside */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={(e) => {
                    e.stopPropagation()
                    setProfileOpen(false)
                  }}
                />

                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-2 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-900 to-blue-700 rounded-xl text-white mb-2 shadow-sm">
                    <div className="w-11 h-11 rounded-full overflow-hidden bg-white text-blue-700 flex items-center justify-center text-base font-black shadow-md border-2 border-white/40 shrink-0">
                      {profilePhoto
                        ? <img src={profilePhoto} alt="avatar" className="w-full h-full object-cover" />
                        : displayInitials
                      }
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-sm truncate leading-tight">{displayName}</h4>
                      <p className="text-[11px] opacity-90 truncate leading-tight mt-0.5">{managerEmail}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-white/20 text-[9px] font-bold tracking-wider uppercase">{managerRole}</span>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false)
                        setMyProfileOpen(true)
                        setEditMode(false)
                      }}
                      className="mgr-card w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-blue-50/40 hover:text-blue-900 text-slate-700 font-bold text-xs transition cursor-pointer"
                    >
                      <UserCircle size={15} className="text-[#0c4160]" /> My Profile
                    </button>
                    <Link
                      to="/manager/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-blue-50/40 hover:text-blue-900 text-slate-700 font-bold text-xs transition"
                    >
                      <Settings size={15} className="text-blue-600" /> Account & Security Settings
                    </Link>
                  </div>

                  <div className="my-1.5 border-t border-slate-100" />

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      setProfileOpen(false)
                      handleLogout()
                    }}
                    className="mgr-card w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold text-xs transition cursor-pointer"
                  >
                    <LogOut size={16} /> Log Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Layout ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-w-0">
        {sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-30 lg:hidden transition-opacity" />
        )}

        <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#0b3c5d] border-r border-[#0b3c5d]/80 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:pt-0 shrink-0 flex flex-col shadow-xl ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {/* Mobile-only Sidebar Close Header */}
          <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#072438] shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#f5ab27] flex items-center justify-center text-[#0b3c5d] text-[10px] font-black">TC</span>
              <span className="text-xs font-black text-white uppercase tracking-widest">Sales Manager</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 p-4 space-y-1.5 overflow-y-auto pt-4 lg:pt-5">
            {sidebarItems.map((item, index) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <div
                  key={item.path}
                  draggable={isCustomizing}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`relative ${isCustomizing ? "cursor-move animate-pulse border border-dashed border-[#0b3c5d]/20 rounded-2xl" : ""}`}
                >
                  <Link
                    to={isCustomizing ? "#" : item.path}
                    onClick={(e) => {
                      if (isCustomizing) {
                        e.preventDefault();
                        return;
                      }
                      setSidebarOpen(false);
                    }}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl font-semibold text-sm transition ${!isCustomizing && isActive
                        ? 'bg-white/15 text-white shadow-md border-l-4 border-[#f5ab27]'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                    {isCustomizing && <GripVertical size={15} className="text-slate-400 shrink-0" />}
                    <Icon className={`w-5 h-5 shrink-0 ${!isCustomizing && isActive ? 'text-[#f5ab27]' : 'text-slate-400'}`} />
                    <span className="truncate tracking-tight">{item.label}</span>
                  </Link>
                </div>
              )
            })}
            <div className="pt-2">
              {isCustomizing ? (
                <div className="pt-2 border-t border-white/10 space-y-1.5 px-1">
                  <button
                    type="button"
                    onClick={saveCustomization}
                    className="mgr-card w-full py-2 px-3 bg-[#0b3c5d] hover:bg-[#072438] text-white rounded-xl text-xs font-black transition cursor-pointer"
                  >
                    Save Order
                  </button>
                  <button
                    type="button"
                    onClick={resetCustomization}
                    className="mgr-card w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black transition cursor-pointer"
                  >
                    Reset Default
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCustomizing(true)}
                  className="mgr-card w-full py-2 px-3 border border-dashed border-white/20 hover:border-[#f5ab27] text-slate-400 hover:text-white rounded-xl text-[10px] font-black tracking-wider uppercase transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>⚙️ Customize Sidebar</span>
                </button>
              )}
            </div>
          </div>
        </aside>

        <main className="flex-1 p-4 lg:p-6 min-w-0 overflow-y-auto w-full pb-20 lg:pb-6 bg-[#F0F4F8]">
          <Outlet />
        </main>

        {/* ── Mobile Bottom Navigation Dock ────────────────────────── */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 bg-[#0b3c5d] border-t border-white/10 z-40 px-2 py-1.5 flex items-center justify-around shadow-lg">
          <NavLink to="/manager/dashboard" className={({ isActive }) => `flex flex-col items-center gap-0.5 p-1 rounded-xl font-black text-[10px] transition ${isActive ? 'text-[#f5ab27]' : 'text-slate-400 hover:text-white'}`}>
            <LayoutDashboard size={18} />
            <span>Home</span>
          </NavLink>
          <NavLink to="/manager/map" className={({ isActive }) => `flex flex-col items-center gap-0.5 p-1 rounded-xl font-black text-[10px] transition ${isActive ? 'text-[#f5ab27]' : 'text-slate-400 hover:text-white'}`}>
            <MapPin size={18} />
            <span>Map</span>
          </NavLink>
          <NavLink to="/manager/attendance" className={({ isActive }) => `flex flex-col items-center gap-0.5 p-1 rounded-xl font-black text-[10px] transition ${isActive ? 'text-[#f5ab27]' : 'text-slate-400 hover:text-white'}`}>
            <UserCheck size={18} />
            <span>Attendance</span>
          </NavLink>
          <NavLink to="/manager/leads" className={({ isActive }) => `flex flex-col items-center gap-0.5 p-1 rounded-xl font-black text-[10px] transition ${isActive ? 'text-[#f5ab27]' : 'text-slate-400 hover:text-white'}`}>
            <Users size={18} />
            <span>Leads</span>
          </NavLink>
          <NavLink to="/manager/hrms" className={({ isActive }) => `flex flex-col items-center gap-0.5 p-1 rounded-xl font-black text-[10px] transition ${isActive ? 'text-[#f5ab27]' : 'text-slate-400 hover:text-white'}`}>
            <ShieldCheck size={18} />
            <span>HRMS</span>
          </NavLink>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MY PROFILE SLIDE-OVER PANEL
      ══════════════════════════════════════════════════════════════════════ */}
      {myProfileOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="flex-1 bg-slate-900/60 backdrop-blur-xs" onClick={closeProfilePanel} />

          {/* Panel */}
          <div 
            onKeyDown={handleProfileKeyDown}
            className="w-full max-w-2xl bg-slate-50 h-full overflow-y-auto flex flex-col shadow-2xl border-l border-slate-200"
          >

            {/* PANEL HEADER */}
            <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <UserCircle size={20} className="text-blue-600" />
                <h2 className="text-base font-black text-slate-900">My Profile</h2>
              </div>
              <div className="flex items-center gap-2">
                {editMode ? (
                  <>
                    <button 
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        if (originalProfileRef.current) {
                          setProfile({ ...originalProfileRef.current })
                        }
                        setEditMode(false)
                      }} 
                      className="mgr-card px-3 py-1.5 rounded-xl text-xs font-extrabold bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      type="button"
                      disabled={saving}
                      onClick={() => setShowProfileConfirm(true)} 
                      className="mgr-card px-3 py-1.5 rounded-xl text-xs font-extrabold bg-blue-600 text-white cursor-pointer hover:bg-blue-700 transition flex items-center gap-1"
                      title="Click or press Enter to choose save action"
                    >
                      <Save size={13} /> {saving ? 'Saving...' : 'Done'}
                    </button>
                  </>
                ) : (
                  <button 
                    type="button"
                    onClick={() => setEditMode(true)} 
                    className="mgr-card px-3 py-1.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition flex items-center gap-1 shadow-md shadow-blue-500/20"
                  >
                    <Pencil size={13} /> Edit Profile
                  </button>
                )}
                <button 
                  type="button"
                  onClick={closeProfilePanel} 
                  className="mgr-card p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* PROFILE AVATAR CARD */}
            <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-center gap-5">

              {/* Avatar with Camera Upload Overlay */}
              <div className="relative shrink-0 group">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center text-white font-black text-3xl shadow-xl ring-4 ring-blue-500/20">
                  {profilePhoto
                    ? <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                    : displayInitials
                  }
                </div>

                {/* Camera Overlay Button */}
                <label
                  htmlFor="manager_profile_photo"
                  className="mgr-card absolute inset-0 rounded-full flex items-center justify-center bg-slate-900/50 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                  title="Upload profile photo"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <Camera size={20} className="text-white" />
                    <span className="text-[9px] font-extrabold text-white tracking-wider uppercase">Change</span>
                  </div>
                </label>
                <input
                  type="file"
                  id="manager_profile_photo"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handlePhotoUpload}
                />

                {/* Remove photo X badge — shown only when photo exists */}
                {profilePhoto && (
                  <button
                    onClick={removePhoto}
                    className="mgr-card absolute -top-1 -right-1 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md cursor-pointer transition"
                    title="Remove photo"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Name & Meta */}
              <div className="space-y-1">
                <h2 className="text-xl font-black text-slate-900">{profile.fullName || managerName}</h2>
                <p className="text-sm text-slate-500 font-semibold">
                  {profile.employeeId} · {profile.team} · {profile.designation}
                </p>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-extrabold">
                  ✅ Active
                </span>
                <div className="pt-0.5">
                  <label
                    htmlFor="manager_profile_photo"
                    className="mgr-card inline-flex items-center gap-1.5 text-[10px] font-extrabold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-300 px-2.5 py-1 rounded-lg cursor-pointer transition"
                  >
                    <Camera size={11} /> {profilePhoto ? 'Change Photo' : 'Upload Profile Photo'}
                  </label>
                </div>
              </div>
            </div>

            {/* CONTENT SECTIONS */}
            <div className="p-5 space-y-4">

              {/* Work Details */}
              <Section icon={Briefcase} title="Work Details">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="Full Name" value={profile.fullName} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, fullName: val }))} />
                  <Field label="Employee ID" value={profile.employeeId} editMode={editMode} readOnly={true} onChange={() => {}} />
                  <Field label="Official Email" value={profile.officialEmail} editMode={editMode} readOnly={true} onChange={() => {}} />
                  <Field label="Phone Number" value={profile.phone} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, phone: val }))} />
                  <Field label="Role" value={profile.role} editMode={editMode} readOnly={true} onChange={() => {}} />
                  <Field label="Team" value={profile.team} editMode={editMode} readOnly={true} onChange={() => {}} />
                  <Field label="Designation" value={profile.designation} editMode={editMode} readOnly={true} onChange={() => {}} />
                  <Field label="Gender" value={profile.gender} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, gender: val }))} />
                  <Field label="Employment Type" value={profile.employmentType} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, employmentType: val }))} />
                  <Field label="Employment Status" value={profile.employmentStatus} editMode={editMode} readOnly={true} onChange={() => {}} />
                  <Field label="Join Date" value={profile.joinDate} editMode={editMode} readOnly={true} onChange={() => {}} />
                  <Field label="Work Mode" value={profile.workMode} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, workMode: val }))} />
                  <Field label="Work Location" value={profile.workLocation} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, workLocation: val }))} />
                  <Field label="Reporting Manager" value={profile.reportingManager} editMode={editMode} readOnly={true} onChange={() => {}} />
                </div>
              </Section>

              {/* Personal Details */}
              <Section icon={HeartPulse} title="Personal Details">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="Date of Birth" value={profile.dob} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, dob: val }))} />
                  <Field label="Marital Status" value={profile.maritalStatus} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, maritalStatus: val }))} />
                  <Field label="Blood Group" value={profile.bloodGroup} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, bloodGroup: val }))} />
                  <Field label="PAN ID" value={profile.panId} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, panId: val }))} />
                  <Field label="Personal Email" value={profile.personalEmail} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, personalEmail: val }))} />
                  <Field label="Alternate Contact" value={profile.alternateContact} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, alternateContact: val }))} />
                  <Field label="City" value={profile.city} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, city: val }))} />
                  <Field label="State" value={profile.state} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, state: val }))} />
                  <Field label="Country" value={profile.country} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, country: val }))} />
                  <Field label="Postal Code" value={profile.postalCode} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, postalCode: val }))} />
                </div>
                <div className="grid grid-cols-1 gap-4 mt-2">
                  <Field label="Current Address" value={profile.currentAddress} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, currentAddress: val }))} />
                  <Field label="Permanent Address" value={profile.permanentAddress} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, permanentAddress: val }))} />
                </div>
              </Section>

              {/* Skills & Technologies */}
              <Section icon={Code2} title="Skills & Technologies">
                <div className="grid grid-cols-1 gap-4">
                  <Field label="Primary Skills" value={profile.primarySkills} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, primarySkills: val }))} />
                  <Field label="Secondary Skills" value={profile.secondarySkills} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, secondarySkills: val }))} />
                  <Field label="Tools & Technologies" value={profile.tools} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, tools: val }))} />
                </div>
              </Section>

              {/* Emergency Contact */}
              <Section icon={AlertCircle} title="Emergency Contact" color="rose">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="Name" value={profile.emergencyName} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, emergencyName: val }))} />
                  <Field label="Relationship" value={profile.emergencyRelationship} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, emergencyRelationship: val }))} />
                  <Field label="Contact Number" value={profile.emergencyContact} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, emergencyContact: val }))} />
                </div>
              </Section>

              {/* Bank Details */}
              <Section icon={CreditCard} title="Bank Details" color="emerald">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="Account Holder" value={profile.accountHolder} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, accountHolder: val }))} />
                  <Field label="Bank Name" value={profile.bankName} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, bankName: val }))} />
                  <Field label="Account Number" value={profile.accountNumber} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, accountNumber: val }))} />
                  <Field label="IFSC Code" value={profile.ifsc} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, ifsc: val }))} />
                  <Field label="Branch" value={profile.branch} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, branch: val }))} />
                </div>
              </Section>

              {/* ── MY DOCUMENTS ─────────────────────────────────────────── */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <FileUp size={16} className="text-blue-600" />
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
                              <p className="text-[11px] font-semibold mt-0.5 text-blue-600 font-bold">
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
                          type="file" id={`profile_doc_${doc.id}`} className="hidden"
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                          onChange={(e) => {
                            const file = e.target.files?.[0]; if (!file) return
                            const reader = new FileReader()
                            reader.onload = (ev) => {
                              setDocumentsList((prev) => prev.map((item) =>
                                item.id === doc.id
                                  ? { ...item, status: 'uploaded', fileName: file.name, fileUrl: ev.target.result }
                                  : item
                              ))
                              showToast(`${file.name} uploaded!`, 'success')
                            }
                            reader.readAsDataURL(file)
                          }}
                        />
                        {(doc.status === 'uploaded' || doc.status === 'approved') && (
                          <button onClick={() => setPreviewDoc(doc)} className="mgr-card text-xs font-extrabold px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-300 cursor-pointer flex items-center gap-1 hover:bg-blue-100 transition">
                            <Eye size={12} /> View
                          </button>
                        )}
                        {doc.status !== 'approved' && (
                          <button
                            onClick={() => document.getElementById(`profile_doc_${doc.id}`)?.click()}
                            className="mgr-card text-xs font-extrabold px-2.5 py-1.5 rounded-xl bg-slate-900 text-white cursor-pointer flex items-center gap-1 hover:bg-slate-700 transition"
                          >
                            <Upload size={12} /> {doc.status === 'uploaded' ? 'Re-upload' : 'Upload'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Custom Upload Drop Zone */}
                <input type="file" id="profile_doc_custom" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => {
                    const file = e.target.files?.[0]; if (!file) return
                    const reader = new FileReader()
                    reader.onload = (ev) => {
                      setDocumentsList((prev) => [...prev, {
                        id: `doc_m_${Date.now()}`, name: file.name.split('.')[0],
                        status: 'uploaded', fileName: file.name, fileUrl: ev.target.result,
                      }])
                      showToast(`${file.name} uploaded!`, 'success')
                    }
                    reader.readAsDataURL(file)
                  }}
                />
                <div
                  onClick={() => document.getElementById('profile_doc_custom')?.click()}
                  className="mgr-card border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/30 hover:bg-blue-50/60 rounded-2xl p-6 text-center transition cursor-pointer group"
                >
                  <FileUp size={28} className="text-blue-600 group-hover:scale-110 transition mx-auto mb-2" />
                  <p className="text-sm font-black text-slate-900">Click to upload additional document</p>
                  <p className="text-[11px] font-bold text-slate-500 mt-1">PDF, JPG, PNG, Word, Excel supported</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── Document Preview Modal ─────────────────────────────────────────── */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900">{previewDoc.name}</h3>
                <p className="text-xs text-slate-400">{previewDoc.fileName}</p>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="mgr-card p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"><X size={20} /></button>
            </div>
            {previewDoc.fileUrl?.startsWith('data:image') ? (
              <img src={previewDoc.fileUrl} alt={previewDoc.name} className="w-full max-h-96 object-contain rounded-xl border border-slate-200" />
            ) : previewDoc.fileUrl?.startsWith('data:application/pdf') ? (
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
                disabled={saving}
                onClick={async () => {
                  await saveProfile(true);
                  setShowProfileConfirm(false);
                }}
                className={`mgr-card w-full py-2.5 px-4 rounded-xl text-sm font-extrabold text-white transition shadow-sm ${
                  saving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                }`}
              >
                {saving ? 'Saving...' : 'Continue Editing'}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  await saveProfile(false);
                  setShowProfileConfirm(false);
                }}
                className={`mgr-card w-full py-2.5 px-4 rounded-xl text-sm font-extrabold text-white transition shadow-sm ${
                  saving ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                }`}
              >
                {saving ? 'Saving...' : 'Save & Exit'}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => setShowProfileConfirm(false)}
                className="mgr-card w-full py-2.5 px-4 rounded-xl text-sm font-extrabold bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer"
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
  )
}

// ── Root Level Sub-Components (fixes React focus loss bug) ──────────────────
// IMPORTANT: These MUST be at module level (outside ManagerLayout).
// If defined inside the component function, React creates a new component
// type on every render, causing inputs to unmount/remount and lose focus.

const Section = ({ icon: Icon, title, color = 'blue', children }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
      <Icon size={16} className={`text-${color}-600`} />
      <h3 className="font-black text-slate-900 text-sm">{title}</h3>
    </div>
    {children}
  </div>
)

const Field = ({ label, value, editMode, onChange, readOnly = false }) => {
  const isDate = label.toLowerCase().includes('date') || label.toLowerCase().includes('dob') || label.toLowerCase().includes('birth');
  return (
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      {editMode ? (
        <input
          type={isDate ? "date" : "text"}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          readOnly={readOnly}
          className={`text-sm font-semibold text-slate-900 border-b border-blue-400 focus:outline-none bg-transparent w-full ${
            readOnly ? 'opacity-60 cursor-not-allowed border-dashed border-slate-300' : ''
          }`}
        />
      ) : (
        <span className="text-sm font-semibold text-slate-900">{value || '—'}</span>
      )}
    </div>
  );
}