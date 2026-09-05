import React, { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useLocation, Outlet, useNavigate } from 'react-router-dom'
import { useToast } from '../../common/ToastContext.jsx'
import ImageCropperModal from '../../common/ImageCropperModal.jsx'
import PhotoLightboxModal from '../../common/PhotoLightboxModal.jsx'
import {
  LayoutDashboard,
  Users,
  Target,
  CalendarDays,
  Receipt,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ShieldCheck,
  Settings,
  UserCircle,
  MapPin,
  Building2,
  GripVertical,
  Pencil,
  Save,
  Camera,
  FileUp,
  Briefcase,
  CreditCard,
  HeartPulse,
  Code2,
  AlertCircle,
  Upload,
  Eye,
  UserCheck,
} from 'lucide-react'
import { hrmsAPI } from '../../services/api.js'
import TwiteConnectLogo from '../../common/TwiteConnectLogo.jsx'
import useCurrentUser from '../../hooks/useCurrentUser.js'
import useNotificationCount from '../../hooks/useNotificationCount.js'
import { clearUserCache } from '../../utils/userScope.js'

const mapDbToFrontend = (emp) => {
  if (!emp) return {}
  return {
    fullName: emp.name ?? `${emp.first_name || ""} ${emp.last_name || ""}`.trim() ?? "",
    employeeId: emp.employee_code ?? emp.employee_id ?? "TL-001",
    officialEmail: emp.email ?? "",
    phone: emp.phone ?? emp.mobile ?? "+91 98765 00099",
    role: emp.role ?? "Team Lead",
    team: emp.department ?? emp.dept ?? "Sales & Business Development",
    designation: emp.designation ?? "Sales Team Lead",
    gender: emp.gender ?? "Male",
    employmentType: emp.employment_type ?? "Full-time",
    employmentStatus: emp.status ?? "Active",
    joinDate: emp.joining_date ?? "2024-01-01",
    workMode: emp.work_mode ?? "In Office",
    workLocation: emp.work_location ?? "Chennai, Tamil Nadu",
    reportingManager: emp.reporting_manager_name ?? emp.reporting_manager_email ?? "Sales Manager",
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
    primarySkills: emp.primary_skills ?? "Team Leadership, Field Operations",
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
  }
}

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/team-lead/dashboard' },
  { label: 'Smart Radar Map', icon: MapPin, path: '/team-lead/map' },
  { label: 'Total Leads', icon: Target, path: '/team-lead/leads' },
  { label: 'Field Visit Audit', icon: CalendarDays, path: '/team-lead/visits' },
  { label: 'Expense Claims', icon: Receipt, path: '/team-lead/expenses' },
  { label: 'Clients', icon: Building2, path: '/team-lead/customers' },
  { label: 'Team & EOD Reports', icon: Users, path: '/team-lead/team' },
  { label: 'HRMS', icon: ShieldCheck, path: '/team-lead/hrms' },
  { label: 'Notifications', icon: Bell, path: '/team-lead/notifications' },
]

const PROFILE_DEFAULTS = {
  fullName: '',
  employeeId: '',
  officialEmail: '',
  phone: '',
  role: 'Team Lead',
  team: 'Sales & Business Development',
  designation: 'Sales Team Lead',
  gender: 'Male',
  employmentType: 'Full-time',
  employmentStatus: 'Active',
  joinDate: '2024-01-01',
  workMode: 'In Office',
  workLocation: 'Chennai, Tamil Nadu',
  reportingManager: 'Sales Manager',
  incentivePercentage: 5.0,
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
  primarySkills: 'Team Leadership, Field Operations',
  secondarySkills: 'Business Development, Analytics',
  tools: 'TwiteConnect, Excel, Google Workspace',
  emergencyName: '',
  emergencyRelationship: 'Spouse',
  emergencyContact: '',
  accountHolder: '',
  bankName: '',
  accountNumber: '',
  ifsc: '',
  branch: '',
}

const DOCUMENT_DEFAULTS = [
  { id: 'doc_tl1', name: 'Aadhar Card', status: 'pending', fileUrl: null, fileName: '' },
  { id: 'doc_tl2', name: 'Offer / Appointment Letter', status: 'pending', fileUrl: null, fileName: '' },
  { id: 'doc_tl3', name: 'PAN Card', status: 'pending', fileUrl: null, fileName: '' },
  { id: 'doc_tl4', name: 'Team Lead Agreement', status: 'pending', fileUrl: null, fileName: '' },
  { id: 'doc_tl5', name: 'Bank Passbook / Cheque', status: 'pending', fileUrl: null, fileName: '' },
]

export default function TeamLeadLayout() {
  const { showToast } = useToast()
  const currentUser = useCurrentUser()
  const { unreadCount } = useNotificationCount()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [myProfileOpen, setMyProfileOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [showProfileConfirm, setShowProfileConfirm] = useState(false)
  const originalProfileRef = useRef(null)
  const [previewDoc, setPreviewDoc] = useState(null)
  const [saving, setSaving] = useState(false)

  const [cropImageSrc, setCropImageSrc] = useState(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [showExpandedHeaderPhoto, setShowExpandedHeaderPhoto] = useState(false)

  const location = useLocation()
  const navigate = useNavigate()

  const [profilePhoto, setProfilePhoto] = useState(() => {
    try { return localStorage.getItem('tc_tl_photo') || null } catch { return null }
  })

  useEffect(() => {
    hrmsAPI.getEmployeeById('self')
      .then(res => {
        const photo = res?.data?.profile_photo || res?.profile_photo
        if (photo) {
          setProfilePhoto(photo)
          try { localStorage.setItem('tc_tl_photo', photo) } catch (_) {}
        }
      })
      .catch(() => {})
  }, [])

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file (JPG, PNG, etc.)', 'error')
      e.target.value = ""
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setCropImageSrc(reader.result)
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  const handleCropComplete = async (croppedFile) => {
    try {
      setIsUploadingPhoto(true)
      showToast('Uploading cropped profile photo to Storage...', 'info')
      const res = await hrmsAPI.uploadAvatar('self', croppedFile)

      const newPhotoUrl = res?.data?.profile_photo || res?.profile_photo
      if (!newPhotoUrl) {
        throw new Error('Database update failed: profile_photo empty in response')
      }

      setProfilePhoto(newPhotoUrl)
      try { localStorage.setItem('tc_tl_photo', newPhotoUrl) } catch (e) { }
      showToast('Profile photo cropped & saved to Database successfully!', 'success')
      setCropImageSrc(null)
    } catch (err) {
      console.error('[ProfilePhoto] Upload failed:', err)
      showToast(`Failed to update profile photo: ${err.message || err}`, 'error')
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const removePhoto = async () => {
    try {
      await hrmsAPI.updateEmployee('self', { profile_photo: null })
      setProfilePhoto(null)
      try { localStorage.removeItem('tc_tl_photo') } catch (e) { }
      showToast('Profile photo removed successfully.', 'info')
    } catch (err) {
      showToast(`Failed to remove profile photo: ${err.message || err}`, 'error')
    }
  }

  const userEmail = (currentUser?.email || "").toLowerCase().trim();
  const [sidebarItems, setSidebarItems] = useState(() => {
    const saved = localStorage.getItem(`tc_sidebar_order_tl_${userEmail}`);
    if (saved) {
      try {
        const labels = JSON.parse(saved);
        const ordered = [];
        labels.forEach(label => {
          const target = label === 'Customers' ? 'Clients' : label;
          const match = navItems.find(n => n.label === target || n.label === label);
          if (match && !ordered.some(o => o.path === match.path)) ordered.push(match);
        });
        navItems.forEach(n => {
          if (!ordered.some(o => o.path === n.path)) {
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
    localStorage.setItem(`tc_sidebar_order_tl_${userEmail}`, JSON.stringify(labels));
    setIsCustomizing(false);
    showToast("Sidebar layout order saved successfully!", "success");
  };
  const resetCustomization = () => {
    localStorage.removeItem(`tc_sidebar_order_tl_${userEmail}`);
    setSidebarItems(navItems);
    setIsCustomizing(false);
    showToast("Sidebar layout reset to default.", "info");
  };

  const tlName = currentUser?.name || currentUser?.full_name || 'Team Lead'
  const tlRole = currentUser?.role || 'Team Lead'
  const tlEmail = currentUser?.email || ''
  const empCode = currentUser?.employee_code || currentUser?.employee_id || ''

  const [profile, setProfile] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('tc_tl_profile') || '{}')
      return {
        ...PROFILE_DEFAULTS,
        fullName: tlName,
        officialEmail: tlEmail,
        employeeId: empCode,
        role: tlRole,
        ...saved,
      }
    } catch { return { ...PROFILE_DEFAULTS, fullName: tlName, officialEmail: tlEmail, employeeId: empCode, role: tlRole } }
  })

  const displayName = profile?.fullName || tlName
  const displayInitials = (displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()) || 'TL'

  useEffect(() => {
    if (!myProfileOpen) return

    hrmsAPI.getEmployeeById('self')
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
          localStorage.setItem('tc_tl_profile', JSON.stringify(mapped))
          setProfilePhoto(emp.profile_photo || null)
          if (emp.profile_photo) {
            localStorage.setItem('tc_tl_photo', emp.profile_photo)
          } else {
            localStorage.removeItem('tc_tl_photo')
          }
          if (emp.documents) {
            try {
              const parsed = JSON.parse(emp.documents)
              if (Array.isArray(parsed) && parsed.length > 0) {
                setDocumentsList(parsed)
                localStorage.setItem('tc_tl_documents', JSON.stringify(parsed))
              }
            } catch (err) {}
          }
        }
      })
      .catch((err) => {
        console.warn("Could not retrieve online team lead profile data:", err)
      })

    return () => {
      originalProfileRef.current = null
    }
  }, [myProfileOpen, empCode])

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
      const code = 'self'

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

      if (dbPayload.name) {
        const [firstName, ...rest] = (dbPayload.name || "").split(" ")
        dbPayload.first_name = firstName || "Team"
        dbPayload.last_name  = rest.join(" ") || "Lead"
      }

      dbPayload.documents = JSON.stringify(documentsList)
      dbPayload.profile_photo = profilePhoto || null

      const isPhotoChanged = profilePhoto !== localStorage.getItem('tc_tl_photo')
      const isDocsChanged = JSON.stringify(documentsList) !== localStorage.getItem('tc_tl_documents')

      if (changedLabels.length === 0 && !isPhotoChanged && !isDocsChanged) {
        showToast('No changes to save.', 'info')
        setShowProfileConfirm(false)
        if (!keepEditing) setEditMode(false)
        return
      }

      const res = await hrmsAPI.updateEmployee(code, dbPayload)
      const freshRes = await hrmsAPI.getEmployeeById(code)
      const freshEmployee = (freshRes && freshRes.data) ? freshRes.data : ((res && res.data) ? res.data : {})

      const freshProfile = {
        ...PROFILE_DEFAULTS,
        ...mapDbToFrontend(freshEmployee),
      }
      setProfile(freshProfile)
      originalProfileRef.current = { ...freshProfile }
      localStorage.setItem('tc_tl_profile', JSON.stringify(freshProfile))

      setProfilePhoto(freshEmployee.profile_photo || null)
      if (freshEmployee.profile_photo) {
        localStorage.setItem('tc_tl_photo', freshEmployee.profile_photo)
      } else {
        localStorage.removeItem('tc_tl_photo')
      }

      const fieldList = changedLabels.slice(0, 4).join(', ') + (changedLabels.length > 4 ? ` +${changedLabels.length - 4} more` : '')
      showToast(`Profile saved: ${fieldList}`, 'success')
      if (!keepEditing) setEditMode(false)
    } catch (err) {
      console.error(err)
      showToast(`Error: ${err.message || 'Failed to save profile'}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleProfileKeyDown = (e) => {
    if (!editMode) return;
    if (e.key === 'Enter') {
      if (e.target && e.target.tagName === 'TEXTAREA') return;
      const isMobileDevice = /Mobi|Android|iPhone|iPad|Windows Phone/i.test(navigator.userAgent);
      if (isMobileDevice) return;
      e.preventDefault();
      setShowProfileConfirm(true);
    }
  };

  const [documentsList, setDocumentsList] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('tc_tl_documents') || '[]')
    return saved.length > 0 ? saved : DOCUMENT_DEFAULTS
  })

  const handleLogout = () => {
    clearUserCache()
    showToast('Logged out successfully', 'info')
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-slate-900 flex flex-col font-sans relative overflow-x-hidden">

      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="relative h-16 bg-[#FCF9F5] border-b border-[#E8D8C8] flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mgr-card lg:hidden p-2 rounded-lg text-[#6B4E3D] hover:bg-[#F3ECE2] cursor-pointer"
            aria-label="Toggle Navigation Sidebar"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <Link to="/team-lead" className="flex items-center gap-2.5">
            <TwiteConnectLogo className="w-9 h-9" />
          </Link>
        </div>

        {/* Center: Metallic Shimmer Indicator */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden sm:flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-3 bg-[#FAF3EB] border border-[#E0D0C0] rounded-full px-6 py-2.5 shadow-xs pointer-events-auto">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D49A6A] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#D49A6A]"></span>
            </span>
            <span
              className="text-sm uppercase tracking-[0.3em] font-black"
              style={{
                background: 'linear-gradient(to right, #543D30 20%, #D49A6A 40%, #E2B284 60%, #543D30 80%)',
                backgroundSize: '200% auto',
                color: 'transparent',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                animation: 'tc-shimmer 3s linear infinite',
                display: 'inline-block'
              }}
            >
              Team Lead Portal
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
          {/* Notification Bell */}
          <button
            onClick={() => navigate('/team-lead/notifications')}
            className="p-2 rounded-xl text-[#6B4E3D] hover:bg-[#F3ECE2] relative transition cursor-pointer border border-[#E8D8C8]"
            title="Notifications & Inquiries"
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 rounded-full bg-[#D49A6A] text-white text-[10px] flex items-center justify-center font-black shadow-xs ring-2 ring-white animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Avatar + Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="mgr-card flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-[#F3ECE2] transition cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-[#543D30] to-[#966038] flex items-center justify-center text-white font-black text-sm shadow-xs ring-2 ring-[#D49A6A]/30 shrink-0">
                {profilePhoto
                  ? <img src={profilePhoto} alt="avatar" className="w-full h-full object-cover" />
                  : displayInitials
                }
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="font-extrabold text-xs text-[#543D30] leading-tight flex items-center gap-1">
                  {displayName} <ChevronDown size={13} className="text-[#966038]" />
                </span>
                <span className="text-[10px] text-[#966038] font-extrabold leading-tight truncate max-w-[140px]">{tlRole}</span>
              </div>
            </button>

            {profileOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={(e) => {
                    e.stopPropagation()
                    setProfileOpen(false)
                  }}
                />

                <div className="absolute right-0 mt-2 w-64 bg-white border border-[#E8D8C8] rounded-2xl shadow-2xl z-50 p-2 overflow-hidden">
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-[#543D30] via-[#6B4E3D] to-[#966038] rounded-xl text-white mb-2 shadow-sm">
                    <div 
                      onClick={() => {
                        if (profilePhoto) {
                          setProfileOpen(false)
                          setShowExpandedHeaderPhoto(true)
                        }
                      }}
                      className={`w-11 h-11 rounded-full overflow-hidden bg-white text-[#543D30] flex items-center justify-center text-base font-black shadow-md border-2 border-white/40 shrink-0 ${profilePhoto ? 'cursor-pointer hover:scale-105 transition' : ''}`}
                    >
                      {profilePhoto
                        ? <img src={profilePhoto} alt="avatar" className="w-full h-full object-cover" />
                        : displayInitials
                      }
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-sm truncate leading-tight">{displayName}</h4>
                      <p className="text-[11px] opacity-90 truncate leading-tight mt-0.5">{tlEmail}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-white/20 text-[9px] font-bold tracking-wider uppercase">{tlRole}</span>
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
                      className="mgr-card w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#F3ECE2] hover:text-[#543D30] text-[#6B4E3D] font-bold text-xs transition cursor-pointer"
                    >
                      <UserCircle size={15} className="text-[#966038]" /> My Profile
                    </button>
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

        <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#543D30] border-r border-[#422E22] transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:pt-0 shrink-0 flex flex-col shadow-xl ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#422E22] shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#D49A6A] flex items-center justify-center text-[#422E22] text-[10px] font-black">TC</span>
              <span className="text-xs font-black text-white uppercase tracking-widest">Team Lead Manager</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-6 flex flex-col">
            <div className="flex items-center justify-between px-2 pt-2">
              <span className="text-[10px] font-extrabold text-[#E8D8C8]/80 uppercase tracking-widest">Navigation</span>
              {!isCustomizing ? (
                <button
                  onClick={() => setIsCustomizing(true)}
                  className="text-[10px] font-extrabold text-amber-200 hover:text-white transition flex items-center gap-1 cursor-pointer bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-md"
                >
                  <GripVertical size={11} /> Reorder
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={saveCustomization}
                    className="text-[10px] font-extrabold text-emerald-300 hover:text-white bg-emerald-700/60 hover:bg-emerald-600 px-2 py-0.5 rounded-md cursor-pointer transition"
                  >
                    Save
                  </button>
                  <button
                    onClick={resetCustomization}
                    className="text-[10px] font-extrabold text-slate-300 hover:text-white bg-slate-700/60 px-1.5 py-0.5 rounded-md cursor-pointer transition"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>

            <nav className="space-y-1 flex-1">
              {sidebarItems.map((item, index) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path || (item.path === '/team-lead/dashboard' && (location.pathname === '/team-lead' || location.pathname === '/team-lead/'))
                
                return (
                  <div
                    key={item.path}
                    draggable={isCustomizing}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`relative group ${isCustomizing ? 'cursor-grab active:cursor-grabbing' : ''}`}
                  >
                    <NavLink
                      to={item.path}
                      onClick={(e) => {
                        if (isCustomizing) e.preventDefault()
                        else setSidebarOpen(false)
                      }}
                      className={`flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition duration-150 ${
                        isActive
                          ? 'bg-[#966038] text-white shadow-sm shadow-[#966038]/40 font-black'
                          : 'text-[#E8D8C8] hover:bg-[#6B4E3D]/60 hover:text-white'
                      }`}
                    >
                      {isCustomizing && (
                        <GripVertical size={14} className="text-amber-200/50 shrink-0 animate-pulse" />
                      )}
                      <Icon className={`w-4 h-4 shrink-0 transition ${isActive ? 'text-[#FFF8F0]' : 'text-[#D49A6A] group-hover:text-[#FFF8F0]'}`} />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  </div>
                )
              })}
            </nav>

            <div className="pt-4 border-t border-white/10 mt-auto">
              <div className="bg-[#422E22]/60 rounded-2xl p-3 border border-[#D49A6A]/30 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#966038] text-white flex items-center justify-center font-black text-xs shrink-0">
                  {displayInitials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-white truncate">{displayName}</p>
                  <p className="text-[10px] text-amber-200/90 font-bold">Team Lead Manager</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Workspace Content */}
        <main className="flex-1 min-w-0 p-4 lg:p-6 overflow-y-auto">
          <Outlet />
        </main>
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
            className="w-full max-w-2xl bg-[#FAF6F0] h-full overflow-y-auto flex flex-col shadow-2xl border-l border-[#E8D8C8]"
          >

            {/* PANEL HEADER */}
            <div className="bg-white border-b border-[#E8D8C8] px-5 py-4 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <UserCircle size={20} className="text-[#8B5E3C]" />
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
                      className="mgr-card px-3 py-1.5 rounded-xl text-xs font-extrabold bg-[#F3ECE2] text-[#523A2B] hover:bg-[#E8D8C8] transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      type="button"
                      disabled={saving}
                      onClick={() => setShowProfileConfirm(true)} 
                      className="mgr-card px-3 py-1.5 rounded-xl text-xs font-extrabold bg-[#8B5E3C] text-white cursor-pointer hover:bg-[#744C2E] transition flex items-center gap-1"
                      title="Click or press Enter to choose save action"
                    >
                      <Save size={13} /> {saving ? 'Saving...' : 'Done'}
                    </button>
                  </>
                ) : (
                  <button 
                    type="button"
                    onClick={() => setEditMode(true)} 
                    className="mgr-card px-3 py-1.5 rounded-xl text-xs font-black bg-[#8B5E3C] hover:bg-[#744C2E] text-white cursor-pointer transition flex items-center gap-1 shadow-md shadow-[#8B5E3C]/20"
                  >
                    <Pencil size={13} /> Edit Profile
                  </button>
                )}
                <button 
                  type="button"
                  onClick={closeProfilePanel} 
                  className="mgr-card p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-[#F3ECE2] cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* PROFILE AVATAR CARD */}
            <div className="bg-white border-b border-[#E8D8C8] px-6 py-5 flex items-center gap-5">
              <div className="relative shrink-0 group">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-[#3D2B1F] to-[#8B5E3C] flex items-center justify-center text-white font-black text-3xl shadow-xl ring-4 ring-[#C68B59]/30">
                  {profilePhoto
                    ? <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                    : displayInitials
                  }
                </div>

                <label
                  htmlFor="tl_profile_photo"
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
                  id="tl_profile_photo"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handlePhotoUpload}
                />

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

              <div className="space-y-1">
                <h2 className="text-xl font-black text-slate-900">{profile.fullName || tlName}</h2>
                <p className="text-sm text-slate-500 font-semibold">
                  {profile.employeeId} · {profile.team} · {profile.designation}
                </p>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-extrabold">
                  ✅ Active
                </span>
                <div className="pt-0.5">
                  <label
                    htmlFor="tl_profile_photo"
                    className="mgr-card inline-flex items-center gap-1.5 text-[10px] font-extrabold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-300 px-2.5 py-1 rounded-lg cursor-pointer transition"
                  >
                    <Camera size={11} /> {profilePhoto ? 'Change Photo' : 'Upload Profile Photo'}
                  </label>
                </div>
              </div>
            </div>

            {/* CONTENT SECTIONS */}
            <div className="p-5 space-y-4">
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

              <Section icon={Code2} title="Skills & Technologies">
                <div className="grid grid-cols-1 gap-4">
                  <Field label="Primary Skills" value={profile.primarySkills} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, primarySkills: val }))} />
                  <Field label="Secondary Skills" value={profile.secondarySkills} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, secondarySkills: val }))} />
                  <Field label="Tools & Technologies" value={profile.tools} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, tools: val }))} />
                </div>
              </Section>

              <Section icon={AlertCircle} title="Emergency Contact" color="rose">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="Name" value={profile.emergencyName} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, emergencyName: val }))} />
                  <Field label="Relationship" value={profile.emergencyRelationship} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, emergencyRelationship: val }))} />
                  <Field label="Contact Number" value={profile.emergencyContact} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, emergencyContact: val }))} />
                </div>
              </Section>

              <Section icon={CreditCard} title="Bank Details" color="emerald">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="Account Holder" value={profile.accountHolder} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, accountHolder: val }))} />
                  <Field label="Bank Name" value={profile.bankName} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, bankName: val }))} />
                  <Field label="Account Number" value={profile.accountNumber} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, accountNumber: val }))} />
                  <Field label="IFSC Code" value={profile.ifsc} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, ifsc: val }))} />
                  <Field label="Branch" value={profile.branch} editMode={editMode} onChange={(val) => setProfile(p => ({ ...p, branch: val }))} />
                </div>
              </Section>

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
                          type="file" id={`profile_doc_tl_${doc.id}`} className="hidden"
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
                            onClick={() => document.getElementById(`profile_doc_tl_${doc.id}`)?.click()}
                            className="mgr-card text-xs font-extrabold px-2.5 py-1.5 rounded-xl bg-slate-900 text-white cursor-pointer flex items-center gap-1 hover:bg-slate-700 transition"
                          >
                            <Upload size={12} /> {doc.status === 'uploaded' ? 'Re-upload' : 'Upload'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <input type="file" id="tl_profile_doc_custom" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => {
                    const file = e.target.files?.[0]; if (!file) return
                    const reader = new FileReader()
                    reader.onload = (ev) => {
                      setDocumentsList((prev) => [...prev, {
                        id: `doc_tl_${Date.now()}`, name: file.name.split('.')[0],
                        status: 'uploaded', fileName: file.name, fileUrl: ev.target.result,
                      }])
                      showToast(`${file.name} uploaded!`, 'success')
                    }
                    reader.readAsDataURL(file)
                  }}
                />
                <div
                  onClick={() => document.getElementById('tl_profile_doc_custom')?.click()}
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
            </div>
          </div>
        </div>
      )}

      {cropImageSrc && (
        <ImageCropperModal
          imageSrc={cropImageSrc}
          onCancel={() => setCropImageSrc(null)}
          onCropComplete={handleCropComplete}
          isUploading={isUploadingPhoto}
        />
      )}

      {showExpandedHeaderPhoto && (
        <PhotoLightboxModal
          photoUrl={profilePhoto}
          name={displayName}
          role={tlRole}
          onClose={() => setShowExpandedHeaderPhoto(false)}
        />
      )}

    </div>
  )
}

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
  const isPhone = label.toLowerCase().includes('phone') || label.toLowerCase().includes('mobile') || label.toLowerCase().includes('contact');
  return (
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      {editMode ? (
        <input
          type={isDate ? "date" : isPhone ? "tel" : "text"}
          maxLength={isPhone ? 10 : undefined}
          value={value || ''}
          onChange={(e) => {
            if (isPhone) {
              onChange(e.target.value.replace(/\D/g, '').slice(0, 10))
            } else {
              onChange(e.target.value)
            }
          }}
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
