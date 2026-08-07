import React, { useState, useEffect } from 'react'
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
} from 'lucide-react'
import TwiteConnectLogo from '../../common/TwiteConnectLogo.jsx'
import useCurrentUser from '../../hooks/useCurrentUser.js'
import { clearUserCache } from '../../utils/userScope.js'

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
  reportingManager: 'Regional Sales Director (MD)',
  // Personal
  dob: '',
  maritalStatus: 'Married',
  bloodGroup: 'O+',
  panId: '',
  personalEmail: '',
  alternateContact: '',
  currentAddress: '',
  permanentAddress: '',
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
  const [previewDoc, setPreviewDoc] = useState(null)

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

  useEffect(() => {
    if (!myProfileOpen) return
    setProfile((p) => ({
      ...p,
      fullName: p.fullName || managerName,
      officialEmail: p.officialEmail || managerEmail,
      employeeId: p.employeeId || empCode,
      role: p.role || managerRole,
    }))
  }, [myProfileOpen])

  const saveProfile = () => {
    try { localStorage.setItem('tc_manager_profile', JSON.stringify(profile)) } catch (e) { }
    setEditMode(false)
    showToast('Profile saved successfully!', 'success')
  }

  const fp = (field) => editMode
    ? <input value={profile[field] || ''} onChange={(e) => setProfile(p => ({ ...p, [field]: e.target.value }))}
      className="text-sm font-semibold text-slate-900 border-b border-amber-400 focus:outline-none bg-transparent w-full" />
    : <span className="text-sm font-semibold text-slate-900">{profile[field] || '—'}</span>

  // ── Documents State ────────────────────────────────────────────────────────
  const [documentsList, setDocumentsList] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('tc_manager_documents') || '[]')
    return saved.length > 0 ? saved : DOCUMENT_DEFAULTS
  })

  useEffect(() => {
    try { localStorage.setItem('tc_manager_documents', JSON.stringify(documentsList)) } catch (e) { }
  }, [documentsList])

  const handleLogout = () => {
    clearUserCache()
    showToast('Logged out successfully', 'info')
    window.location.href = '/'
  }

  const Section = ({ icon: Icon, title, color = 'amber', children }) => (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <Icon size={16} className={`text-${color}-600`} />
        <h3 className="font-black text-slate-900 text-sm">{title}</h3>
      </div>
      {children}
    </div>
  )

  const Field = ({ label, field }) => (
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      {fp(field)}
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans relative overflow-x-hidden">

      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
            aria-label="Toggle Navigation Sidebar"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <Link to="/manager" className="flex items-center gap-2.5">
            <TwiteConnectLogo className="w-9 h-9" />
          </Link>
        </div>

        {/* Top-Right Area */}
        <div className="flex items-center gap-3">

          {/* MY PROFILE BUTTON */}
          <button
            onClick={() => { setMyProfileOpen(true); setProfileOpen(false); setEditMode(false) }}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0c4160] hover:bg-[#082d43] text-white text-xs font-black shadow-md transition cursor-pointer"
          >
            <UserCircle size={15} /> My Profile
          </button>

          {/* Avatar + Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-amber-50 transition cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center text-white font-black text-sm shadow-xs ring-2 ring-amber-500/20 shrink-0">
                {profilePhoto
                  ? <img src={profilePhoto} alt="avatar" className="w-full h-full object-cover" />
                  : managerInitials
                }
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="font-extrabold text-xs text-slate-800 leading-tight flex items-center gap-1">
                  {managerName} <ChevronDown size={13} className="text-slate-400" />
                </span>
                <span className="text-[10px] text-amber-800 font-extrabold leading-tight truncate max-w-[140px]">{managerRole}</span>
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
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-600 to-amber-700 rounded-xl text-white mb-2 shadow-sm">
                    <div className="w-11 h-11 rounded-full overflow-hidden bg-white text-amber-800 flex items-center justify-center text-base font-black shadow-md border-2 border-white/40 shrink-0">
                      {profilePhoto
                        ? <img src={profilePhoto} alt="avatar" className="w-full h-full object-cover" />
                        : managerInitials
                      }
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-sm truncate leading-tight">{managerName}</h4>
                      <p className="text-[11px] opacity-90 truncate leading-tight mt-0.5">{managerEmail}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-white/20 text-[9px] font-bold tracking-wider uppercase">{managerRole}</span>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <Link
                      to="/manager/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#fffdf5] hover:text-amber-900 text-slate-700 font-bold text-xs transition"
                    >
                      <Settings size={15} className="text-[#b45309]" /> Account & Security Settings
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
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold text-xs transition cursor-pointer"
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

        <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static pt-16 lg:pt-0 shrink-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-4rem)]">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl font-semibold text-sm transition ${
                    isActive
                      ? 'bg-[#0b3c5d] text-white shadow-md shadow-blue-900/25 border-l-4 border-[#f5ab27]'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-[#0b3c5d]'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#f5ab27]' : 'text-[#0b3c5d]'}`} />
                  <span className="truncate tracking-tight">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </aside>

        <main className="flex-1 p-4 lg:p-6 min-w-0 overflow-y-auto w-full pb-20 lg:pb-6">
          <Outlet />
        </main>

        {/* ── Mobile Bottom Navigation Dock ────────────────────────── */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 px-2 py-1.5 flex items-center justify-around shadow-lg">
          <NavLink to="/manager/dashboard" className={({ isActive }) => `flex flex-col items-center gap-0.5 p-1 rounded-xl font-black text-[10px] transition ${isActive ? 'text-[#0b3c5d]' : 'text-slate-500'}`}>
            <LayoutDashboard size={18} />
            <span>Home</span>
          </NavLink>
          <NavLink to="/manager/map" className={({ isActive }) => `flex flex-col items-center gap-0.5 p-1 rounded-xl font-black text-[10px] transition ${isActive ? 'text-[#0b3c5d]' : 'text-slate-500'}`}>
            <MapPin size={18} />
            <span>Map</span>
          </NavLink>
          <NavLink to="/manager/attendance" className={({ isActive }) => `flex flex-col items-center gap-0.5 p-1 rounded-xl font-black text-[10px] transition ${isActive ? 'text-[#0b3c5d]' : 'text-slate-500'}`}>
            <UserCheck size={18} />
            <span>Attendance</span>
          </NavLink>
          <NavLink to="/manager/leads" className={({ isActive }) => `flex flex-col items-center gap-0.5 p-1 rounded-xl font-black text-[10px] transition ${isActive ? 'text-[#0b3c5d]' : 'text-slate-500'}`}>
            <Users size={18} />
            <span>Leads</span>
          </NavLink>
          <NavLink to="/manager/hrms" className={({ isActive }) => `flex flex-col items-center gap-0.5 p-1 rounded-xl font-black text-[10px] transition ${isActive ? 'text-[#0b3c5d]' : 'text-slate-500'}`}>
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
          <div className="flex-1 bg-slate-900/60 backdrop-blur-xs" onClick={() => { setMyProfileOpen(false); setEditMode(false) }} />

          {/* Panel */}
          <div className="w-full max-w-2xl bg-slate-50 h-full overflow-y-auto flex flex-col shadow-2xl border-l border-slate-200">

            {/* PANEL HEADER */}
            <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <UserCircle size={20} className="text-amber-600" />
                <h2 className="text-base font-black text-slate-900">My Profile</h2>
              </div>
              <div className="flex items-center gap-2">
                {editMode ? (
                  <>
                    <button onClick={() => setEditMode(false)} className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-slate-100 text-slate-600 cursor-pointer hover:bg-slate-200 transition flex items-center gap-1">
                      <X size={13} /> Cancel
                    </button>
                    <button onClick={saveProfile} className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700 transition flex items-center gap-1">
                      <Save size={13} /> Save Profile
                    </button>
                  </>
                ) : (
                  <button onClick={() => setEditMode(true)} className="px-3 py-1.5 rounded-xl text-xs font-black bg-[#ca8a04] hover:bg-[#a16207] text-white cursor-pointer transition flex items-center gap-1 shadow-md shadow-yellow-600/20">
                    <Pencil size={13} /> Edit Profile
                  </button>
                )}
                <button onClick={() => { setMyProfileOpen(false); setEditMode(false) }} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* PROFILE AVATAR CARD */}
            <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-center gap-5">

              {/* Avatar with Camera Upload Overlay */}
              <div className="relative shrink-0 group">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-black text-3xl shadow-xl ring-4 ring-amber-400/20">
                  {profilePhoto
                    ? <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                    : managerInitials
                  }
                </div>

                {/* Camera Overlay Button */}
                <label
                  htmlFor="manager_profile_photo"
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
                  id="manager_profile_photo"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handlePhotoUpload}
                />

                {/* Remove photo X badge — shown only when photo exists */}
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
                    className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-lg cursor-pointer transition"
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
                  <Field label="Full Name" field="fullName" />
                  <Field label="Employee ID" field="employeeId" />
                  <Field label="Official Email" field="officialEmail" />
                  <Field label="Phone Number" field="phone" />
                  <Field label="Role" field="role" />
                  <Field label="Team" field="team" />
                  <Field label="Designation" field="designation" />
                  <Field label="Gender" field="gender" />
                  <Field label="Employment Type" field="employmentType" />
                  <Field label="Employment Status" field="employmentStatus" />
                  <Field label="Join Date" field="joinDate" />
                  <Field label="Work Mode" field="workMode" />
                  <Field label="Work Location" field="workLocation" />
                  <Field label="Reporting Manager" field="reportingManager" />
                </div>
              </Section>

              {/* Personal Details */}
              <Section icon={HeartPulse} title="Personal Details">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="Date of Birth" field="dob" />
                  <Field label="Marital Status" field="maritalStatus" />
                  <Field label="Blood Group" field="bloodGroup" />
                  <Field label="PAN ID" field="panId" />
                  <Field label="Personal Email" field="personalEmail" />
                  <Field label="Alternate Contact" field="alternateContact" />
                </div>
                <div className="grid grid-cols-1 gap-4 mt-2">
                  <Field label="Current Address" field="currentAddress" />
                  <Field label="Permanent Address" field="permanentAddress" />
                </div>
              </Section>

              {/* Skills & Technologies */}
              <Section icon={Code2} title="Skills & Technologies">
                <div className="grid grid-cols-1 gap-4">
                  <Field label="Primary Skills" field="primarySkills" />
                  <Field label="Secondary Skills" field="secondarySkills" />
                  <Field label="Tools & Technologies" field="tools" />
                </div>
              </Section>

              {/* Emergency Contact */}
              <Section icon={AlertCircle} title="Emergency Contact" color="rose">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="Name" field="emergencyName" />
                  <Field label="Relationship" field="emergencyRelationship" />
                  <Field label="Contact Number" field="emergencyContact" />
                </div>
              </Section>

              {/* Bank Details */}
              <Section icon={CreditCard} title="Bank Details" color="emerald">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="Account Holder" field="accountHolder" />
                  <Field label="Bank Name" field="bankName" />
                  <Field label="Account Number" field="accountNumber" />
                  <Field label="IFSC Code" field="ifsc" />
                  <Field label="Branch" field="branch" />
                </div>
              </Section>

              {/* ── MY DOCUMENTS ─────────────────────────────────────────── */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <FileUp size={16} className="text-amber-600" />
                  <h3 className="font-black text-slate-900 text-sm">My Documents</h3>
                </div>

                <div className="divide-y divide-slate-100">
                  {documentsList.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-extrabold text-slate-900">{doc.name}</p>
                        <p className={`text-[11px] font-semibold mt-0.5 ${doc.status === 'uploaded' ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {doc.status === 'uploaded' ? `✅ ${doc.fileName}` : '📄 Required — not uploaded yet'}
                        </p>
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
                        {doc.status === 'uploaded' && (
                          <button onClick={() => setPreviewDoc(doc)} className="text-xs font-extrabold px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-300 cursor-pointer flex items-center gap-1 hover:bg-amber-100 transition">
                            <Eye size={12} /> View
                          </button>
                        )}
                        <button
                          onClick={() => document.getElementById(`profile_doc_${doc.id}`)?.click()}
                          className="text-xs font-extrabold px-2.5 py-1.5 rounded-xl bg-slate-900 text-white cursor-pointer flex items-center gap-1 hover:bg-slate-700 transition"
                        >
                          <Upload size={12} /> {doc.status === 'uploaded' ? 'Re-upload' : 'Upload'}
                        </button>
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
                  className="border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/30 hover:bg-amber-50/60 rounded-2xl p-6 text-center transition cursor-pointer group"
                >
                  <FileUp size={28} className="text-amber-600 group-hover:scale-110 transition mx-auto mb-2" />
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
              <button onClick={() => setPreviewDoc(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"><X size={20} /></button>
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

    </div>
  )
}
