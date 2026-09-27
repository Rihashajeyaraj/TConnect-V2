import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useLocation, Outlet, useNavigate } from 'react-router-dom'
import useNotificationCount from '../../hooks/useNotificationCount.js'
import { useToast } from '../../common/ToastContext.jsx'
import ImageCropperModal from '../../common/ImageCropperModal.jsx'
import PhotoLightboxModal from '../../common/PhotoLightboxModal.jsx'
import TwiteConnectLogo from '../../common/TwiteConnectLogo.jsx'
import useCurrentUser from '../../hooks/useCurrentUser.js'
import { clearUserCache } from '../../utils/userScope.js'
import { notificationAPI, hrmsAPI } from '../../services/api.js'
import { formatDate } from '../../utils/dateUtils.js'
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
  CheckCircle2,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { label: 'Company Overview', icon: Building2, path: '/admin/company' },
  { label: 'User Management', icon: Users, path: '/admin/users' },
  { label: 'Clients', icon: Users, path: '/admin/customers' },
  { label: 'Role Management', icon: ShieldCheck, path: '/admin/roles' },
  { label: 'HRMS', icon: UserCheck2, path: '/admin/hrms' },
  { label: 'Reports & Audit Logs', icon: FileText, path: '/admin/reports' },
  { label: 'Notifications', icon: Bell, path: '/admin/notifications' },
  { label: 'Settings', icon: Settings, path: '/admin/settings' },
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
  incentivePercentage: 5.0,
  dob: "1995-01-01",
  maritalStatus: "Single",
  bloodGroup: "O+",
  panId: "",
  personalEmail: "",
  alternateContact: "",
  currentAddress: "",
  permanentAddress: "",
  city: "Chennai",
  state: "Tamil Nadu",
  country: "India",
  postalCode: "600020",
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
    fullName: emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || "",
    employeeId: emp.employee_code || emp.employee_id || "",
    officialEmail: emp.email || "",
    phone: emp.phone || emp.mobile || "",
    role: emp.role || "Admin",
    team: emp.department || "Management",
    designation: emp.designation || "System Administrator",
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

function AdminLayout() {
  const { showToast } = useToast()
  const currentUser = useCurrentUser()
  const { unreadCount } = useNotificationCount()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [selectedNotif, setSelectedNotif] = useState(null)

  // My Profile States
  const [myProfileOpen, setMyProfileOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [showProfileConfirm, setShowProfileConfirm] = useState(false)
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

  const displayName = profile.fullName || currentUser.name || currentUser.full_name || adminName || "System Admin"
  const displayInitials = (() => {
    const parts = String(displayName).trim().split(" ").filter(Boolean)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    } else if (parts.length === 1 && parts[0]) {
      return parts[0].slice(0, 2).toUpperCase()
    }
    return "AD"
  })()

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
      const currentStr = JSON.stringify(documentsList);
      localStorage.setItem(`tc_admin_documents_${adminEmail}`, currentStr);

      const savedStr = localStorage.getItem(`tc_admin_documents_synced_${adminEmail}`);
      if (savedStr === currentStr) {
        return;
      }

      const code = 'self';
      if (code) {
        hrmsAPI.updateEmployee(code, { documents: currentStr })
          .then(() => {
            localStorage.setItem(`tc_admin_documents_synced_${adminEmail}`, currentStr);
          })
          .catch((err) => console.warn("Auto-sync documents failed:", err))
      }
    } catch {}
  }, [documentsList, adminEmail, empCode, currentUser.employee_id, currentUser.auth_user_id, currentUser.id])

  useEffect(() => {
    if (!myProfileOpen) return
    async function loadOnlineProfile() {
      try {
        const savedPhoto = localStorage.getItem(`tc_admin_photo_${adminEmail}`)
        if (savedPhoto) setProfilePhoto(savedPhoto)
        
        const res = await hrmsAPI.getEmployeeById("self")
        if (res && res.data) {
          const emp = res.data
          const mapped = {
            ...PROFILE_DEFAULTS,
            ...mapDbToFrontend(emp),
            employeeId: emp.employee_code || emp.employee_id || empCode,
          }
          setProfile(mapped)
          localStorage.setItem(`tc_admin_profile_${adminEmail}`, JSON.stringify(mapped))
          setProfilePhoto(emp.profile_photo || null)
          if (emp.profile_photo) {
            localStorage.setItem(`tc_admin_photo_${adminEmail}`, emp.profile_photo)
          } else {
            localStorage.removeItem(`tc_admin_photo_${adminEmail}`)
          }
          if (emp.documents) {
            try {
              const parsed = JSON.parse(emp.documents)
              if (Array.isArray(parsed) && parsed.length > 0) {
                const currentStr = JSON.stringify(documentsList);
                const parsedStr = JSON.stringify(parsed);
                if (currentStr !== parsedStr) {
                  setDocumentsList(parsed)
                  localStorage.setItem(`tc_admin_documents_${adminEmail}`, parsedStr)
                  localStorage.setItem(`tc_admin_documents_synced_${adminEmail}`, parsedStr)
                }
              }
            } catch (err) {}
          }
        }
      } catch (err) {
        console.warn("Could not retrieve online profile data:", err)
      }
    }
    loadOnlineProfile()
  }, [myProfileOpen, empCode, currentUser.employee_id, currentUser.auth_user_id, currentUser.id, adminEmail])

  const saveProfile = async (keepEditing = false) => {
    try {
      const code = 'self'
      if (!code) {
        throw new Error("No employee identifier found.")
      }

      console.log("PROFILE BEFORE SAVE", profile)

      const dbPayload = mapFrontendToDb(profile)
      for (const key of Object.keys(dbPayload)) {
        if (dbPayload[key] === "" || dbPayload[key] === undefined) {
          dbPayload[key] = null
        }
      }
      dbPayload.profile_photo = profilePhoto || null
      dbPayload.documents = JSON.stringify(documentsList)

      const res = await hrmsAPI.updateEmployee(code, dbPayload)
      console.log("SAVE RESPONSE", res)

      // Explicitly fetch the fresh record from the database to guarantee representation parity
      const freshRes = await hrmsAPI.getEmployeeById(code)
      const freshEmployee = freshRes && freshRes.data ? freshRes.data : {}
      console.log("FRESH PROFILE FROM DB", freshEmployee)

      const normalizedProfile = {
        ...PROFILE_DEFAULTS,
        ...mapDbToFrontend(freshEmployee),
      }
      console.log("NORMALIZED PROFILE", normalizedProfile)

      setProfile(normalizedProfile)
      localStorage.setItem(`tc_admin_profile_${adminEmail}`, JSON.stringify(normalizedProfile))

      setProfilePhoto(freshEmployee.profile_photo || null)
      if (freshEmployee.profile_photo) {
        localStorage.setItem(`tc_admin_photo_${adminEmail}`, freshEmployee.profile_photo)
      } else {
        localStorage.removeItem(`tc_admin_photo_${adminEmail}`)
      }
      if (freshEmployee.documents) {
        try {
          const parsed = JSON.parse(freshEmployee.documents)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setDocumentsList(parsed)
            localStorage.setItem(`tc_admin_documents_${adminEmail}`, JSON.stringify(parsed))
          }
        } catch (err) {}
      }

      showToast("Profile synced online to Supabase!", "success")
      if (!keepEditing) {
        setEditMode(false)
      }
    } catch (err) {
      console.error(err)
      let errMsg = "Failed to save profile"
      if (err.errors && Array.isArray(err.errors) && err.errors.length > 0) {
        errMsg = err.errors.map(e => `${e.field || "field"}: ${e.message}`).join(", ")
      } else if (err.detail) {
        errMsg = typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail)
      } else if (err.message) {
        errMsg = err.message
      }
      showToast(`Error: ${errMsg}`, "error")
    }
  }

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


  // Load latest profile photo from Supabase DB on layout mount
  useEffect(() => {
    hrmsAPI.getEmployeeById('self')
      .then(res => {
        const photo = res?.data?.profile_photo || res?.profile_photo
        if (photo) {
          setProfilePhoto(photo)
          try { localStorage.setItem(`tc_admin_photo_${adminEmail}`, photo) } catch (_) {}
        }
      })
      .catch(() => {})
  }, [adminEmail])

  const [cropImageSrc, setCropImageSrc] = useState(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [showExpandedHeaderPhoto, setShowExpandedHeaderPhoto] = useState(false)

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    console.log("[ProfilePhoto] File selected")
    console.log("[ProfilePhoto] File name:", file.name)
    console.log("[ProfilePhoto] File type:", file.type)
    console.log("[ProfilePhoto] File size:", file.size)

    if (!file.type.startsWith("image/")) {
      showToast("Please upload an image file (JPG, PNG, etc.)", "error")
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
      showToast("Uploading cropped profile photo to Storage...", "info")
      console.log("[ProfilePhoto] Uploading cropped file to Supabase Storage...")
      const res = await hrmsAPI.uploadAvatar("self", croppedFile)
      console.log("[ProfilePhoto] Storage & DB Upload response:", res)

      const newPhotoUrl = res?.data?.profile_photo || res?.profile_photo

      if (!newPhotoUrl) {
        throw new Error("Database update failed: profile_photo empty in response")
      }

      console.log("[ProfilePhoto] Successfully saved photo URL:", newPhotoUrl)
      setProfilePhoto(newPhotoUrl)
      try { localStorage.setItem(`tc_admin_photo_${adminEmail}`, newPhotoUrl) } catch (e) { }
      showToast("Profile photo cropped & saved to Database successfully!", "success")
      setCropImageSrc(null)
    } catch (err) {
      console.error("[ProfilePhoto] Upload failed:", err)
      showToast(`Failed to update profile photo: ${err.message || err}`, "error")
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const removePhoto = async () => {
    try {
      await hrmsAPI.updateEmployee("self", { profile_photo: null })
      setProfilePhoto(null)
      try { localStorage.removeItem(`tc_admin_photo_${adminEmail}`) } catch (e) { }
      showToast("Profile photo removed successfully.", "info")
    } catch (err) {
      showToast(`Failed to remove profile photo: ${err.message || err}`, "error")
    }
  }

  const loadNotifications = async () => {
    try {
      const res = await notificationAPI.getNotifications()
      if (res && res.data) {
        const mapped = res.data.map((n) => ({
          id: n.id,
          title: n.title || 'System Notification',
          message: n.message || n.description || '',
          time: formatDate(n.created_at) || 'Recently',
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

  useEffect(() => {
    const saved = localStorage.getItem(`tc_sidebar_order_admin_${userEmail}`);
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

  const handleLogout = () => {
    clearUserCache()
    showToast('Logged out successfully', 'info')
    window.location.href = '/'
  }

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, is_read: true })))
    showToast('All notifications marked as read', 'info')
    try {
      localStorage.setItem("tc_unread_message_count", "0")
      if (typeof window !== "undefined" && "navigator" in window && "clearAppBadge" in navigator) {
        navigator.clearAppBadge().catch(() => {})
      }
    } catch (e) {}

    try {
      await notificationAPI.markAllRead()
    } catch (e) {
      console.warn("Mark all read sync error:", e)
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

  const [isSidebarMinimized, setIsSidebarMinimized] = useState(() => localStorage.getItem("tc_sidebar_minimized") === "true");

  const toggleSidebarMinimize = () => {
    setIsSidebarMinimized((prev) => {
      const next = !prev;
      localStorage.setItem("tc_sidebar_minimized", String(next));
      return next;
    });
  };

  return (
    <div className="h-screen overflow-hidden bg-[#F7F9FC] text-slate-900 flex flex-col font-sans admin-portal-root">
      <style>{`
        @media (max-width: 639px) {
          .admin-portal-root {
            font-size: 13px !important;
          }
          .admin-portal-root .text-xs,
          .admin-portal-root .text-xs\\/5 {
            font-size: 11px !important;
          }
          .admin-portal-root .text-sm {
            font-size: 12.5px !important;
          }
          .admin-portal-root .text-base {
            font-size: 13.5px !important;
          }
          .admin-portal-root .text-lg {
            font-size: 15px !important;
          }
          .admin-portal-root .text-xl {
            font-size: 16.5px !important;
          }
          .admin-portal-root .text-2xl {
            font-size: 18.5px !important;
          }
          .admin-portal-root .text-\\[9px\\] {
            font-size: 9.5px !important;
          }
          .admin-portal-root .text-\\[10px\\] {
            font-size: 10px !important;
          }
          .admin-portal-root .text-\\[11px\\] {
            font-size: 11px !important;
          }
          .admin-portal-root .text-\\[13px\\] {
            font-size: 12.5px !important;
          }
          .admin-portal-root th,
          .admin-portal-root td {
            font-size: 11px !important;
          }
          .admin-sidebar-link {
            font-size: 12.5px !important;
          }
          .admin-sidebar-header {
            font-size: 11.5px !important;
          }
        }

        @media (min-width: 640px) and (max-width: 1024px) {
          .admin-portal-root {
            font-size: 13.5px !important;
          }
          .admin-portal-root .text-xs,
          .admin-portal-root .text-xs\\/5 {
            font-size: 11.5px !important;
          }
          .admin-portal-root .text-sm {
            font-size: 13px !important;
          }
          .admin-portal-root .text-base {
            font-size: 14.5px !important;
          }
          .admin-portal-root .text-lg {
            font-size: 16px !important;
          }
          .admin-portal-root .text-xl {
            font-size: 18px !important;
          }
          .admin-portal-root .text-2xl {
            font-size: 20px !important;
          }
          .admin-portal-root .text-\\[9px\\] {
            font-size: 10px !important;
          }
          .admin-portal-root .text-\\[10px\\] {
            font-size: 10.5px !important;
          }
          .admin-portal-root .text-\\[11px\\] {
            font-size: 11.5px !important;
          }
          .admin-portal-root .text-\\[13px\\] {
            font-size: 13px !important;
          }
          .admin-portal-root th,
          .admin-portal-root td {
            font-size: 12px !important;
          }
          .admin-sidebar-link {
            font-size: 13.5px !important;
          }
          .admin-sidebar-header {
            font-size: 12px !important;
          }
        }

        @media (min-width: 1025px) {
          .admin-portal-root {
            font-size: 14px !important;
          }
          .admin-portal-root .text-xs,
          .admin-portal-root .text-xs\\/5 {
            font-size: 12px !important;
          }
          .admin-portal-root .text-sm {
            font-size: 13.5px !important;
          }
          .admin-portal-root .text-base {
            font-size: 15px !important;
          }
          .admin-portal-root .text-lg {
            font-size: 17px !important;
          }
          .admin-portal-root .text-xl {
            font-size: 19px !important;
          }
          .admin-portal-root .text-2xl {
            font-size: 22px !important;
          }
          .admin-portal-root .text-\\[9px\\] {
            font-size: 10.5px !important;
          }
          .admin-portal-root .text-\\[10px\\] {
            font-size: 11px !important;
          }
          .admin-portal-root .text-\\[11px\\] {
            font-size: 12px !important;
          }
          .admin-portal-root .text-\\[13px\\] {
            font-size: 13.5px !important;
          }
          .admin-portal-root th,
          .admin-portal-root td {
            font-size: 12.5px !important;
          }
          .admin-sidebar-link {
            font-size: 14px !important;
          }
          .admin-sidebar-header {
            font-size: 12.5px !important;
          }
        }
      `}</style>
      {/* Top Header */}
      <header className="relative h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 shadow-xs flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <Link to="/admin" className="flex items-center gap-2.5">
            <TwiteConnectLogo className="w-9 h-9" />
          </Link>
        </div>

        {/* Center: Clean Admin Pill Tag (matching user screenshot) */}
        <div className="hidden sm:flex items-center justify-center">
          <div className="flex items-center gap-2.5 bg-white border border-slate-200/90 rounded-full px-5 py-1.5 shadow-xs">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs uppercase tracking-wider font-black text-blue-600">
              SYSTEM ADMIN
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <button
            onClick={() => navigate('/admin/notifications')}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 relative transition cursor-pointer border border-slate-200"
            title="Notifications & Messages"
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-black shadow-xs ring-2 ring-white animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* System Admin User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setProfileOpen(!profileOpen)
                setNotificationsOpen(false)
              }}
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs ring-2 ring-slate-400/20 shrink-0">
                {profilePhoto ? (
                  <img src={profilePhoto} alt="avatar" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                ) : (
                  displayInitials
                )}
              </div>
              <div className="hidden sm:block text-left min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate max-w-[120px]">{displayName}</p>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">System Admin</p>
              </div>
              <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
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
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 space-y-1">
                  <div className="p-3 bg-slate-50 rounded-xl space-y-0.5">
                    <p className="text-xs font-black text-slate-900 truncate">{displayName}</p>
                    <p className="text-[11px] text-slate-500 truncate">{adminEmail}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setProfileOpen(false)
                      setMyProfileOpen(true)
                      setEditMode(false)
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <UserCircle size={15} className="text-blue-600" /> My Profile
                  </button>
                  <Link
                    to="/admin/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <Settings size={15} className="text-slate-500" /> System Settings
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setProfileOpen(false)
                      handleLogout()
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

      {/* Main Content Area */}
      <div className="flex flex-1 min-h-0 min-w-0 relative overflow-hidden">
        {sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-20 lg:hidden transition-opacity" />
        )}
        {/* Sidebar Navigation */}
        <aside
          className={`fixed inset-y-0 left-0 z-20 ${
            isSidebarMinimized ? "lg:w-20" : "lg:w-64"
          } w-64 bg-white border-r border-slate-200 transform transition-all duration-200 ease-in-out lg:translate-x-0 lg:static flex flex-col h-full shrink-0 shadow-xs ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Mobile-only Sidebar Close Header */}
          <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
            <div className="flex items-center gap-2">
              <span className="bg-[#0B2545] text-white px-2 py-0.5 rounded-lg text-xs font-black shadow-sm">TC</span>
              <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Admin Portal</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Desktop Minimize/Maximize Toggle Button */}
          <div className="hidden lg:flex items-center justify-end px-3 py-2 border-b border-slate-100">
            <button
              type="button"
              onClick={toggleSidebarMinimize}
              className={`p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition cursor-pointer flex items-center gap-2 ${
                isSidebarMinimized ? "w-full justify-center" : ""
              }`}
              title={isSidebarMinimized ? "Maximize Sidebar" : "Minimize Sidebar"}
            >
              {isSidebarMinimized ? (
                <PanelLeftOpen size={18} className="text-blue-600" />
              ) : (
                <>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Minimize</span>
                  <PanelLeftClose size={16} />
                </>
              )}
            </button>
          </div>

          <div className="flex-1 p-3 space-y-1 overflow-y-auto">
            {sidebarItems.map((item, index) => {
              const Icon = item.icon
              const isActive = location.pathname.replace(/\/$/, '') === item.path.replace(/\/$/, '') || (item.path === '/admin' && (location.pathname === '/admin' || location.pathname === '/admin/'))
              return (
                <div
                  key={item.path}
                  draggable={isCustomizing && !isSidebarMinimized}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`relative ${isCustomizing && !isSidebarMinimized ? "cursor-move animate-pulse border border-dashed border-slate-300 rounded-xl" : ""}`}
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
                    title={item.label}
                    className={`flex items-center ${isSidebarMinimized ? "justify-center p-3" : "gap-3 px-3.5 py-2.5"} rounded-xl font-bold text-xs admin-sidebar-link transition-all ${
                      !isCustomizing && isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {isCustomizing && !isSidebarMinimized && <GripVertical size={14} className="text-slate-400 shrink-0" />}
                    <div className="relative flex items-center justify-center shrink-0">
                      <Icon className={`w-4 h-4 ${!isCustomizing && isActive ? 'text-white' : 'text-slate-450'}`} />
                      {isSidebarMinimized && unreadCount > 0 && (item.path.includes("notifications") || item.label.includes("Notification") || item.label.includes("Message")) && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                      )}
                    </div>
                    {!isSidebarMinimized && <span>{item.label}</span>}
                    {!isSidebarMinimized && unreadCount > 0 && (item.path.includes("notifications") || item.label.includes("Notification") || item.label.includes("Message")) && (
                      <span className="ml-auto bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs ring-2 ring-white animate-pulse">
                        🔴 {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Link>
                </div>
              )
            })}
            {!isSidebarMinimized && (
              <div className="pt-2">
                {isCustomizing ? (
                  <div className="pt-2 border-t border-slate-200 space-y-1.5 px-1">
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
                      className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition cursor-pointer"
                    >
                      Reset Default
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsCustomizing(true)}
                    className="w-full py-2 px-3 border border-dashed border-slate-300 hover:border-slate-400 text-slate-500 hover:text-slate-800 rounded-xl text-[10px] font-black tracking-wider uppercase transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>⚙️ Customize Sidebar</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area - Scrollable */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto h-full bg-[#F7F9FC]">
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

          <div 
            onKeyDown={handleProfileKeyDown}
            className="w-full max-w-2xl bg-slate-50 h-full overflow-y-auto flex flex-col shadow-2xl border-l border-slate-200 animate-slideLeft"
          >
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <UserCircle size={20} className="text-blue-600" />
                <h2 className="text-base font-black text-slate-900">Admin Profile</h2>
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
                      className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-blue-600 text-white cursor-pointer hover:bg-blue-700 transition flex items-center gap-1"
                      title="Click or press Enter to choose save action"
                    >
                      <Save size={13} /> Done
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditMode(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-blue-600 text-white cursor-pointer hover:bg-blue-700 transition flex items-center gap-1"
                  >
                    <Pencil size={13} /> Edit Profile
                  </button>
                )}
                <button
                  type="button"
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
                    <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
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
                        {(doc.status === "uploaded" || doc.status === "approved") && (
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            className="text-xs font-extrabold px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-300 cursor-pointer flex items-center gap-1 hover:bg-blue-100 transition"
                          >
                            <Eye size={12} /> View
                          </button>
                        )}
                        {doc.status !== "approved" && (
                          <button
                            onClick={() => document.getElementById(`ad_doc_${doc.id}`)?.click()}
                            className="text-xs font-extrabold px-2.5 py-1.5 rounded-xl bg-slate-900 text-white cursor-pointer flex items-center gap-1 hover:bg-slate-700 transition"
                          >
                            <Upload size={12} /> {doc.status === "uploaded" ? "Re-upload" : "Upload"}
                          </button>
                        )}
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
                Save &amp; Exit
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

      {/* Full-Screen Photo Lightbox */}
      {showExpandedHeaderPhoto && (
        <PhotoLightboxModal
          photoUrl={profilePhoto}
          name={currentUser.name || 'Admin'}
          role={currentUser.role || 'Admin'}
          onClose={() => setShowExpandedHeaderPhoto(false)}
        />
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
          className={`text-sm font-semibold text-slate-900 border-b border-[#123A8C] focus:outline-none bg-transparent w-full ${
            readOnly ? "opacity-60 cursor-not-allowed border-dashed border-slate-300" : ""
          }`}
        />
      ) : (
        <span className="text-sm font-semibold text-slate-900">{value || "—"}</span>
      )}
    </div>
  );
};

export default AdminLayout
