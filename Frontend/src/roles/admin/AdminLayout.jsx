import { useState, useEffect } from 'react'
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom'
import { useToast } from '../../common/ToastContext.jsx'
import useCurrentUser from '../../hooks/useCurrentUser.js'
import { clearUserCache } from '../../utils/userScope.js'
import { notificationAPI, hrmsAPI } from '../../services/api.js'
import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
  UserCheck2,
  FileText,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Bell,
  CheckCheck,
  Info,
  Clock,
  UserPlus,
  MapPin,
  ShieldAlert,
  GripVertical,
  Network,
  Layers,
  UserCircle,
  Briefcase,
  HeartPulse,
  Code2,
  AlertCircle,
  CreditCard,
  Camera,
  Save,
  Pencil,
  Eye,
  Upload,
  FileUp,
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { label: 'Company Overview', icon: Building2, path: '/admin/company' },
  { label: 'User Management', icon: Users, path: '/admin/users' },
  { label: 'Role Management', icon: ShieldCheck, path: '/admin/roles' },
  { label: 'HRMS', icon: UserCheck2, path: '/admin/hrms' },
  { label: 'Reports & Audit Logs', icon: FileText, path: '/admin/reports' },
  { label: 'Notifications', icon: Bell, path: '/admin/notifications' },
  { label: 'Settings', icon: Settings, path: '/admin/settings' },
]

const initialNotifications = [
  {
    id: 'n1',
    title: 'New Account Creation',
    message: 'New Sales Executive account created for Arun Kumar.',
    time: '10 mins ago',
    type: 'user',
    read: false,
    icon: UserPlus,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  {
    id: 'n2',
    title: 'Field Representative Check-In',
    message: 'John Doe logged check-in at Client Site - Guindy, Chennai.',
    time: '25 mins ago',
    type: 'visit',
    read: false,
    icon: MapPin,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  {
    id: 'n3',
    title: 'System Security Audit Log',
    message: 'Role permissions matrix updated for Sales Manager role.',
    time: '2 hours ago',
    type: 'security',
    read: false,
    icon: ShieldAlert,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
  },
  {
    id: 'n4',
    title: 'Leave Request Pending',
    message: 'Mary Jane submitted Casual Leave request for 10 May 2026.',
    time: '1 day ago',
    type: 'hrms',
    read: true,
    icon: Clock,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
]

const PROFILE_DEFAULTS = {
  fullName: "",
  employeeId: "",
  officialEmail: "",
  phone: "+91 98765 00000",
  role: "Admin",
  team: "Management",
  designation: "System Administrator",
  gender: "Male",
  employmentType: "Full-time",
  employmentStatus: "Active",
  joinDate: "2026-01-01",
  workMode: "On-site",
  workLocation: "Headquarters",
  reportingManager: "CEO",
  dob: "1995-01-01",
  maritalStatus: "Single",
  bloodGroup: "O+",
  panId: "",
  personalEmail: "",
  alternateContact: "",
  currentAddress: "",
  permanentAddress: "",
  primarySkills: "System Operations, Security Auditing, DB Administration",
  secondarySkills: "FastAPI, React, Supabase",
  tools: "TwiteConnect, Supabase Dashboard, GitHub",
  emergencyName: "Kin",
  emergencyRelationship: "Kin",
  emergencyContact: "+91 99999 99999",
  accountHolder: "",
  bankName: "",
  accountNumber: "",
  ifsc: "",
  branch: "",
};

const mapDbToFrontend = (emp) => {
  if (!emp) return {};
  return {
    fullName: emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.fullName,
    employeeId: emp.employee_code || emp.employee_id || emp.employeeId,
    officialEmail: emp.email || emp.officialEmail,
    phone: emp.phone || emp.mobile || emp.phone,
    role: emp.role || "Admin",
    team: emp.department || "Management",
    designation: emp.designation || "System Administrator",
    gender: emp.gender || "Male",
    employmentType: emp.employment_type || emp.employmentType,
    employmentStatus: emp.is_active ? "Active" : "Active",
    joinDate: emp.joining_date || emp.joinDate,
    workMode: emp.work_mode || "On-site",
    workLocation: emp.work_location || "Headquarters",
    reportingManager: emp.reporting_manager_name || emp.reporting_manager_email || "CEO",
    dob: emp.date_of_birth || emp.dob,
    maritalStatus: emp.marital_status || emp.maritalStatus,
    bloodGroup: emp.blood_group || emp.bloodGroup,
    panId: emp.pan_id || emp.panId,
    personalEmail: emp.personal_email || emp.personalEmail,
    alternateContact: emp.alternate_contact || emp.alternateContact,
    currentAddress: emp.current_address || emp.currentAddress,
    permanentAddress: emp.permanent_address || emp.permanentAddress,
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
  };
};

const mapFrontendToDb = (prof) => {
  const [first_name, ...last_name_parts] = (prof.fullName || "").split(" ");
  const last_name = last_name_parts.join(" ") || ".";
  return {
    first_name: first_name || "Admin",
    last_name: last_name || "User",
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

function AdminLayout() {
  const { showToast } = useToast()
  const currentUser = useCurrentUser()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [selectedNotif, setSelectedNotif] = useState(null)

  // My Profile States
  const [myProfileOpen, setMyProfileOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [profilePhoto, setProfilePhoto] = useState(null)
  const [previewDoc, setPreviewDoc] = useState(null)

  const adminName = currentUser.name || "Admin"
  const adminEmail = currentUser.email || "admin@tconnect.com"
  const empCode = currentUser.employee_code || currentUser.employee_id || ""

  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem(`tc_admin_profile_${adminEmail}`)
      return saved ? JSON.parse(saved) : { ...PROFILE_DEFAULTS, fullName: adminName, officialEmail: adminEmail, employeeId: empCode }
    } catch {
      return { ...PROFILE_DEFAULTS, fullName: adminName, officialEmail: adminEmail, employeeId: empCode }
    }
  })

  const [documentsList, setDocumentsList] = useState(() => {
    try {
      const saved = localStorage.getItem(`tc_admin_documents_${adminEmail}`)
      return saved ? JSON.parse(saved) : [
        { id: "doc_ad1", name: "Aadhar Card", status: "pending", fileUrl: null, fileName: "" },
        { id: "doc_ad2", name: "Offer Letter", status: "pending", fileUrl: null, fileName: "" },
        { id: "doc_ad3", name: "PAN Card", status: "pending", fileUrl: null, fileName: "" },
      ]
    } catch {
      return [
        { id: "doc_ad1", name: "Aadhar Card", status: "pending", fileUrl: null, fileName: "" },
        { id: "doc_ad2", name: "Offer Letter", status: "pending", fileUrl: null, fileName: "" },
        { id: "doc_ad3", name: "PAN Card", status: "pending", fileUrl: null, fileName: "" },
      ]
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(`tc_admin_documents_${adminEmail}`, JSON.stringify(documentsList))
    } catch {}
  }, [documentsList, adminEmail])

  useEffect(() => {
    if (!myProfileOpen) return
    async function loadOnlineProfile() {
      try {
        const savedPhoto = localStorage.getItem(`tc_admin_photo_${adminEmail}`)
        if (savedPhoto) setProfilePhoto(savedPhoto)
        
        const res = await hrmsAPI.getEmployee(empCode || currentUser.employee_code || currentUser.id)
        if (res && res.data) {
          const emp = res.data
          const mapped = {
            ...PROFILE_DEFAULTS,
            ...mapDbToFrontend(emp),
            employeeId: emp.employee_code || emp.employee_id || empCode,
          }
          setProfile(mapped)
          localStorage.setItem(`tc_admin_profile_${adminEmail}`, JSON.stringify(mapped))
          if (emp.profile_photo) {
            setProfilePhoto(emp.profile_photo)
            localStorage.setItem(`tc_admin_photo_${adminEmail}`, emp.profile_photo)
          }
        }
      } catch (err) {
        console.warn("Could not retrieve online profile data:", err)
      }
    }
    loadOnlineProfile()
  }, [myProfileOpen, empCode, currentUser.employee_code, currentUser.id, adminEmail])

  const saveProfile = async () => {
    try {
      localStorage.setItem(`tc_admin_profile_${adminEmail}`, JSON.stringify(profile))
      const dbPayload = mapFrontendToDb(profile)
      if (profilePhoto) {
        dbPayload.profile_photo = profilePhoto
      }
      await hrmsAPI.updateEmployee(empCode || currentUser.employee_code || currentUser.id, dbPayload)
      showToast("Profile synced online to Supabase!", "success")
      setEditMode(false)
    } catch (err) {
      showToast("Profile updated locally, online sync failed.", "warning")
      setEditMode(false)
    }
  }

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target.result
      setProfilePhoto(dataUrl)
      localStorage.setItem(`tc_admin_photo_${adminEmail}`, dataUrl)
      showToast("Profile photo updated!", "success")
    }
    reader.readAsDataURL(file)
  }

  const removePhoto = () => {
    setProfilePhoto(null)
    localStorage.removeItem(`tc_admin_photo_${adminEmail}`)
    showToast("Profile photo removed.", "info")
  }

  const loadNotifications = async () => {
    try {
      const res = await notificationAPI.getNotifications()
      if (res && res.data) {
        const mapped = res.data.map((n) => ({
          id: n.id,
          title: n.title || 'System Notification',
          message: n.message || n.description || '',
          time: n.created_at ? new Date(n.created_at).toLocaleDateString('en-IN') : 'Recently',
          type: n.type || 'INFO',
          read: n.is_read || false,
          icon: Bell,
          color: 'text-blue-600 bg-blue-50 border-blue-200',
        }))
        setNotifications(mapped)
      }
    } catch (err) {
      console.warn('Failed to fetch notifications from database:', err)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  const location = useLocation()
  const navigate = useNavigate()

  const userEmail = (currentUser?.email || "").toLowerCase().trim();
  const [sidebarItems, setSidebarItems] = useState(() => {
    const saved = localStorage.getItem(`tc_sidebar_order_admin_${userEmail}`);
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
    const saved = localStorage.getItem(`tc_sidebar_order_admin_${userEmail}`);
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
    localStorage.setItem(`tc_sidebar_order_admin_${userEmail}`, JSON.stringify(labels));
    setIsCustomizing(false);
    showToast("Sidebar layout order saved successfully!", "success");
  };
  const resetCustomization = () => {
    localStorage.removeItem(`tc_sidebar_order_admin_${userEmail}`);
    setSidebarItems(navItems);
    setIsCustomizing(false);
    showToast("Sidebar layout reset to default.", "info");
  };

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleLogout = () => {
    clearUserCache()
    showToast('Logged out successfully', 'info')
    window.location.href = '/'
  }

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    showToast('All notifications marked as read', 'info')
    const unread = notifications.filter(n => !n.read)
    for (const n of unread) {
      try {
        await notificationAPI.markRead(n.id)
      } catch (e) {}
    }
  }

  const handleSelectNotif = async (notif) => {
    setSelectedNotif(notif)
    setNotificationsOpen(false)
    if (!notif.read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      )
      try {
        await notificationAPI.markRead(notif.id)
      } catch (err) {
        console.warn('Failed to mark read in Supabase:', err)
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-200/90 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <Link to="/admin" className="flex items-center gap-2.5 font-extrabold text-xl text-blue-600">
            <span className="bg-blue-600 text-white px-2.5 py-1 rounded-xl text-sm shadow-md shadow-blue-600/30">TC</span>
            <span className="text-slate-900 tracking-tight">TConnect Admin</span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {/* MY PROFILE BUTTON */}
          <button
            onClick={() => {
              setMyProfileOpen(true)
              setProfileOpen(false)
              setEditMode(false)
            }}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-xs transition cursor-pointer"
          >
            <UserCircle size={15} /> My Profile
          </button>

          {/* Notification Bell Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => {
                setNotificationsOpen(!notificationsOpen)
                setProfileOpen(false)
              }}
              className="relative p-2.5 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition cursor-pointer"
              title="System Alerts & Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 size-5 rounded-full bg-rose-600 text-white font-extrabold text-[10px] flex items-center justify-center border-2 border-white shadow-xs animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Popover */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in duration-150">
                <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-blue-600" />
                    <span className="font-extrabold text-slate-900 text-xs">System Notifications</span>
                    {unreadCount > 0 && (
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        {unreadCount} New
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.map((n) => {
                    const NotifIcon = n.icon
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleSelectNotif(n)}
                        className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 transition cursor-pointer ${
                          !n.read ? 'bg-blue-50/40 font-semibold' : ''
                        }`}
                      >
                        <span className={`p-2 rounded-xl border shrink-0 ${n.color}`}>
                          <NotifIcon className="w-4 h-4" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-extrabold text-slate-900 truncate">{n.title}</p>
                            <span className="text-[10px] text-slate-400 font-medium">{n.time}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="p-2 border-t border-slate-100 text-center bg-slate-50 rounded-b-2xl">
                  <p className="text-[10px] font-bold text-slate-500">Showing recent administrative notifications</p>
                </div>
              </div>
            )}
          </div>

          {/* System Admin User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setProfileOpen(!profileOpen)
                setNotificationsOpen(false)
              }}
              className="flex items-center gap-2.5 p-1.5 px-3 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200/60 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-blue-600/20 overflow-hidden">
                {profilePhoto ? (
                  <img src={profilePhoto} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  currentUser.initials || 'AD'
                )}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="font-bold text-xs text-slate-800 leading-tight">{currentUser.name || 'Admin'}</span>
                <span className="text-[10px] text-slate-500 leading-tight truncate max-w-[120px]">{currentUser.email}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-white border border-slate-200/90 rounded-2xl shadow-2xl py-2 z-50">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900">{currentUser.name || 'Admin'}</p>
                  <p className="text-[11px] font-semibold text-blue-600 truncate">{currentUser.email || 'admin@tconnect.com'}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-extrabold uppercase">
                    {currentUser.role || 'Admin'}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setMyProfileOpen(true)
                    setProfileOpen(false)
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs text-slate-700 font-bold hover:bg-slate-50 flex items-center gap-2 cursor-pointer border-b border-slate-100"
                >
                  <UserCircle className="w-4 h-4 text-blue-600" /> My Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-xs text-rose-600 font-bold hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" /> Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar Navigation */}
        <aside
          className={`fixed inset-y-0 left-0 z-20 w-64 bg-white border-r border-slate-200/90 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static pt-16 lg:pt-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-3 border-b border-slate-100 bg-slate-50/80 font-bold text-[11px] uppercase tracking-wider text-blue-600 px-4">
            Module Navigation
          </div>
          <div className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-4rem)]">
            {sidebarItems.map((item, index) => {
              const Icon = item.icon
              const isActive = location.pathname.replace(/\/$/, '') === item.path.replace(/\/$/, '') || (item.path === '/admin' && (location.pathname === '/admin' || location.pathname === '/admin/'))
              return (
                <div
                  key={item.path}
                  draggable={isCustomizing}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`relative ${isCustomizing ? "cursor-move animate-pulse border border-dashed border-blue-600/20 rounded-xl" : ""}`}
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
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                      !isCustomizing && isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'
                    }`}
                  >
                    {isCustomizing && <GripVertical size={14} className="text-slate-450 shrink-0" />}
                    <Icon className={`w-4 h-4 ${!isCustomizing && isActive ? 'text-white' : 'text-blue-600'}`} />
                    <span>{item.label}</span>
                  </Link>
                </div>
              )
            })}
            <div className="pt-2">
              {isCustomizing ? (
                <div className="pt-2 border-t border-slate-100 space-y-1.5 px-1">
                  <button
                    type="button"
                    onClick={saveCustomization}
                    className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition cursor-pointer"
                  >
                    Save Order
                  </button>
                  <button
                    type="button"
                    onClick={resetCustomization}
                    className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black transition cursor-pointer"
                  >
                    Reset Default
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCustomizing(true)}
                  className="w-full py-2 px-3 border border-dashed border-slate-200 hover:border-blue-400 text-slate-500 hover:text-blue-600 rounded-xl text-[10px] font-black tracking-wider uppercase transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>⚙️ Customize Sidebar</span>
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto bg-slate-100/70">
          <Outlet />
        </main>
      </div>

      {/* Selected Notification Detail Modal */}
      {selectedNotif && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                Notification Details
              </span>
              <button onClick={() => setSelectedNotif(null)} className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer">
                ✕
              </button>
            </h3>
            <div className="space-y-3 text-xs text-slate-700">
              <div>
                <p className="font-bold text-slate-900 text-sm">{selectedNotif.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{selectedNotif.time}</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800">
                {selectedNotif.message}
              </div>
            </div>
            <button
              onClick={() => setSelectedNotif(null)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ADMIN MY PROFILE SLIDE-OVER PANEL */}
      {myProfileOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
            onClick={() => {
              setMyProfileOpen(false)
              setEditMode(false)
            }}
          />

          <div className="w-full max-w-2xl bg-slate-50 h-full overflow-y-auto flex flex-col shadow-2xl border-l border-slate-200 animate-slideLeft">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <UserCircle size={20} className="text-blue-600" />
                <h2 className="text-base font-black text-slate-900">Admin Profile</h2>
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
                    className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-blue-600 text-white cursor-pointer hover:bg-blue-700 transition flex items-center gap-1"
                  >
                    <Pencil size={13} /> Edit Profile
                  </button>
                )}
                <button
                  onClick={() => {
                    setMyProfileOpen(false)
                    setEditMode(false)
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
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-black text-3xl shadow-xl ring-4 ring-blue-400/20">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    currentUser.initials || "AD"
                  )}
                </div>

                <label
                  htmlFor="ad_profile_photo"
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
                  id="ad_profile_photo"
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
                <h2 className="text-xl font-black text-slate-900">{profile.fullName || adminName}</h2>
                <p className="text-sm text-slate-500 font-semibold">
                  {profile.employeeId || "EMP-ADMIN"} · {profile.team} · {profile.designation}
                </p>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-extrabold">
                  ✅ Active Administrator
                </span>
              </div>
            </div>

            {/* Profile Sections */}
            <div className="p-5 space-y-4">
              {/* Work Details */}
              <Section icon={Briefcase} title="Work Details" color="blue">
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
              <Section icon={HeartPulse} title="Personal Details" color="blue">
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
              <Section icon={Code2} title="Skills & Technologies" color="blue">
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

              {/* documents Section */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <FileUp size={16} className="text-blue-600" />
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
                          id={`ad_doc_${doc.id}`}
                          className="hidden"
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            const reader = new FileReader()
                            reader.onload = (ev) => {
                              setDocumentsList((prev) =>
                                prev.map((item) =>
                                  item.id === doc.id
                                    ? { ...item, status: "uploaded", fileName: file.name, fileUrl: ev.target.result }
                                    : item
                                )
                              )
                              showToast(`${file.name} uploaded!`, "success")
                            }
                            reader.readAsDataURL(file)
                          }}
                        />
                        {doc.status === "uploaded" && (
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            className="text-xs font-extrabold px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-300 cursor-pointer flex items-center gap-1 hover:bg-blue-100 transition"
                          >
                            <Eye size={12} /> View
                          </button>
                        )}
                        <button
                          onClick={() => document.getElementById(`ad_doc_${doc.id}`)?.click()}
                          className="text-xs font-extrabold px-2.5 py-1.5 rounded-xl bg-slate-900 text-white cursor-pointer flex items-center gap-1 hover:bg-slate-700 transition"
                        >
                          <Upload size={12} /> {doc.status === "uploaded" ? "Re-upload" : "Upload"}
                        </button>
                      </div>
                    </div>
                  ))}
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
  )
}

// ── Root Level Sub-Components (fixes React focus loss bug) ──────────────────
const Section = ({ icon: Icon, title, color = "blue", children }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
      <Icon size={16} className={`text-${color}-600`} />
      <h3 className="font-black text-slate-900 text-sm">{title}</h3>
    </div>
    {children}
  </div>
)

const Field = ({ label, value, editMode, onChange, readOnly = false }) => (
  <div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
    {editMode ? (
      <input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={readOnly}
        readOnly={readOnly}
        className={`text-sm font-semibold text-slate-900 border-b border-blue-500 focus:outline-none bg-transparent w-full ${
          readOnly ? "opacity-60 cursor-not-allowed border-dashed border-slate-300" : ""
        }`}
      />
    ) : (
      <span className="text-sm font-semibold text-slate-900">{value || "—"}</span>
    )}
  </div>
)

export default AdminLayout
