import { useState, useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Users,
  Search,
  Plus,
  ShieldCheck,
  Mail,
  Phone,
  Building,
  UserCheck,
  UserX,
  Key,
  Camera,
  VideoOff,
  Edit3,
  Trash2,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Info,
  Layers,
  Network,
  UserPlus,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Briefcase,
  HeartPulse,
  Code2,
  AlertCircle,
  CreditCard,
  FileText,
} from 'lucide-react'
import { hrmsAPI, userAPI, settingsAPI, attendanceAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'
import { normalizePhoneNumber } from '../../utils/formatUtils.js'
import { FaceLivenessEngine, LIVENESS_CHALLENGES } from '../sales/FaceLivenessEngine.js'

const EmployeeProfileModal = ({ employee, onClose }) => {
  const [previewDoc, setPreviewDoc] = useState(null);
  const [fullProfile, setFullProfile] = useState(employee || {});

  useEffect(() => {
    let isMounted = true;
    const empId = employee?.employee_id || employee?.id || employee?.auth_user_id;
    if (empId) {
      hrmsAPI.getEmployee(empId)
        .then(res => {
          if (isMounted && res && res.data) {
            setFullProfile(prev => ({ ...prev, ...res.data }));
          }
        })
        .catch(() => {});
    }
    return () => { isMounted = false; };
  }, [employee]);

  if (!employee) return null;
  const empData = fullProfile || employee;

  const parsedDocs = (() => {
    if (!empData.documents) return [];
    try {
      return typeof empData.documents === "string" ? JSON.parse(empData.documents) : empData.documents;
    } catch {
      return [];
    }
  })();

  const Section = ({ icon: Icon, title, color = "blue", children }) => (
    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <Icon size={15} className={`text-${color}-600`} />
        <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">{title}</h4>
      </div>
      {children}
    </div>
  );

  const InfoRow = ({ label, value }) => (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-xs font-semibold text-slate-850">{value || "—"}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5 border border-slate-200 shadow-2xl relative text-left">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          ✕
        </button>

        <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 border-2 border-blue-500 shrink-0 flex items-center justify-center font-bold text-slate-700 text-xl">
            {empData.profile_photo ? (
              <img src={empData.profile_photo} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              (empData.name || "E").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg">{empData.name}</h3>
            <p className="text-xs text-slate-500 font-semibold">
              {empData.employee_code || empData.employee_id || "N/A"} · {empData.department || empData.dept || "Sales"} · {empData.designation || empData.role || "Sales Executive"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Section icon={Briefcase} title="Work Details" color="blue">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <InfoRow label="Official Email" value={empData.email} />
              <InfoRow label="Phone Number" value={empData.phone} />
              <InfoRow label="Employment Type" value={empData.employment_type || "Full Time"} />
              <InfoRow label="Work Mode" value={empData.work_mode || "On-Site"} />
              <InfoRow label="Work Location" value={empData.work_location || "Headquarters"} />
              <InfoRow label="Status" value={empData.status || "Active"} />
            </div>
          </Section>

          <Section icon={HeartPulse} title="Personal Details" color="rose">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <InfoRow label="Date of Birth" value={empData.date_of_birth ? formatDate(empData.date_of_birth) : "—"} />
              <InfoRow label="Marital Status" value={empData.marital_status} />
              <InfoRow label="Blood Group" value={empData.blood_group} />
              <InfoRow label="PAN ID" value={empData.pan_id} />
              <InfoRow label="Personal Email" value={empData.personal_email} />
              <InfoRow label="Alternate Contact" value={empData.alternate_contact} />
              <InfoRow label="City" value={empData.city} />
              <InfoRow label="State" value={empData.state} />
              <InfoRow label="Country" value={empData.country || "India"} />
              <InfoRow label="Postal Code" value={empData.postal_code} />
            </div>
            <div className="mt-2 text-xs space-y-2 border-t border-slate-100 pt-2">
              <InfoRow label="Current Address" value={empData.current_address} />
              <InfoRow label="Permanent Address" value={empData.permanent_address} />
            </div>
          </Section>

          <Section icon={Code2} title="Skills & Tech" color="indigo">
            <div className="space-y-2 text-xs">
              <InfoRow label="Primary Skills" value={empData.primary_skills} />
              <InfoRow label="Secondary Skills" value={empData.secondary_skills} />
              <InfoRow label="Tools & Tech" value={empData.tools} />
            </div>
          </Section>

          <Section icon={AlertCircle} title="Emergency Contact" color="rose">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <InfoRow label="Contact Name" value={empData.emergency_name} />
              <InfoRow label="Relationship" value={empData.emergency_relationship} />
              <InfoRow label="Contact Number" value={empData.emergency_contact} />
            </div>
          </Section>

          <Section icon={CreditCard} title="Bank Details" color="emerald">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <InfoRow label="Account Holder" value={employee.account_holder} />
              <InfoRow label="Bank Name" value={employee.bank_name} />
              <InfoRow label="Account Number" value={employee.account_number} />
              <InfoRow label="IFSC Code" value={employee.ifsc} />
              <InfoRow label="Branch" value={employee.branch} />
            </div>
          </Section>

          <Section icon={FileText} title="Employee Documents" color="teal">
            <div className="space-y-1.5 text-xs">
              {parsedDocs.length === 0 ? (
                <p className="text-slate-400 text-xs italic">No documents uploaded yet.</p>
              ) : (
                parsedDocs.map((doc, idx) => {
                  const docUrl = doc.fileUrl || doc.url || doc.file_url || doc.file || doc.preview || doc.data || null;
                  return (
                    <div key={doc.id || idx} className="flex items-center justify-between border-b border-slate-100 pb-1.5 last:border-b-0">
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-slate-800 truncate">{doc.name}</p>
                        <p className="text-[10px] text-emerald-600 font-medium truncate">✅ {doc.fileName || 'Uploaded'}</p>
                      </div>
                      {docUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({ ...doc, fileUrl: docUrl })}
                          className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 font-extrabold text-[11px] rounded-lg transition cursor-pointer flex-shrink-0 shadow-2xs"
                        >
                          View File
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Section>
        </div>

        {/* In-App Document Preview Modal */}
        {previewDoc && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0">
                <div className="min-w-0 pr-4">
                  <h3 className="font-black text-slate-900 text-sm truncate">{previewDoc.name}</h3>
                  <p className="text-[11px] text-slate-400 font-semibold truncate">{previewDoc.fileName || "Document File"}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {previewDoc.fileUrl && (
                    <a
                      href={previewDoc.fileUrl}
                      download={previewDoc.fileName || `${previewDoc.name}.png`}
                      className="p-2 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition cursor-pointer"
                      title="Download File"
                    >
                      <Download size={18} />
                    </a>
                  )}
                  <button
                    onClick={() => setPreviewDoc(null)}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-50 rounded-2xl p-3 min-h-[320px] border border-slate-100">
                {previewDoc.fileUrl?.startsWith('data:image') || previewDoc.fileUrl?.match(/\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i) || previewDoc.fileName?.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) ? (
                  <img
                    src={previewDoc.fileUrl}
                    alt={previewDoc.name}
                    className="max-w-full max-h-[62vh] object-contain rounded-xl shadow-xs border border-slate-200"
                  />
                ) : previewDoc.fileUrl?.startsWith('data:application/pdf') || previewDoc.fileUrl?.match(/\.pdf($|\?)/i) || previewDoc.fileName?.match(/\.pdf$/i) ? (
                  <iframe
                    src={previewDoc.fileUrl}
                    title={previewDoc.name}
                    className="w-full h-[62vh] rounded-xl border border-slate-200"
                  />
                ) : (
                  <div className="text-center py-12 space-y-3">
                    <FileText size={48} className="mx-auto text-slate-400" />
                    <p className="text-xs font-bold text-slate-600">Preview not supported for this file format.</p>
                    {previewDoc.fileUrl && (
                      <a
                        href={previewDoc.fileUrl}
                        download={previewDoc.fileName || 'document'}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition"
                      >
                        <Download size={14} /> Download File
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ROLE_BADGE_CLASSES = {
  'Super Admin': 'bg-rose-50 text-rose-700 border-rose-200',
  'CEO / Founder': 'bg-purple-50 text-purple-700 border-purple-200',
  'Sales Manager': 'bg-blue-50 text-blue-700 border-blue-200',
  'Team Lead': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Sales Executive': 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

const isProtectedRole = (roleName) => {
  return roleName === 'CEO / Founder' || roleName === 'Super Admin'
}

// ======================================================
// UserDirectoryTable — simple expandable row table
// ======================================================
function UserDirectoryTable({
  filteredUsers, isProtectedRole, ROLE_BADGE_CLASSES,
  toggleUserStatus, handleOpenEditModal, handleDeleteUser,
  handleOpenReassignModal, setSelectedEnrollUser,
  setDuplicateErrorUser, setShowEnrollFaceModal,
  setSelectedEmployeeProfile, setShowCredentialsModal,
}) {
  const [expandedId, setExpandedId] = useState(null)

  if (filteredUsers.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-14 text-center">
        <Users className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-extrabold text-slate-600">No accounts found</p>
        <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Emp ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Assignment</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => {
              const isProtected = isProtectedRole(user.role)
              const isExpanded = expandedId === user.id
              const roleBadge = ROLE_BADGE_CLASSES[user.role] || 'bg-slate-100 text-slate-700 border-slate-200'
              const initials = (user.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
              const isAssigned = !!user.reporting_manager_name

              return (
                <>
                  {/* Main Row */}
                  <tr
                    key={user.id}
                    className={`border-b border-slate-100 hover:bg-slate-50/60 transition ${
                      isExpanded ? 'bg-slate-50/60' : ''
                    }`}
                  >
                    {/* Emp ID */}
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500 font-semibold">
                      {user.employee_code || user.employee_id || '—'}
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0B2545] to-[#1E88E5] text-white font-black text-[10px] flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-900 text-xs truncate flex items-center gap-1">
                            {user.name}
                            {isProtected && <Lock className="w-2.5 h-2.5 text-amber-500" />}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[9px] font-extrabold uppercase tracking-wider ${roleBadge}`}>
                        {user.role}
                      </span>
                    </td>

                    {/* Assignment */}
                    <td className="px-4 py-3">
                      {isAssigned ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[9px] font-extrabold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Assigned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-[9px] font-extrabold">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Unassigned
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : user.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                          isExpanded
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        {isExpanded ? 'Close' : 'View'}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <tr key={`${user.id}-expanded`} className="bg-slate-50/50">
                      <td colSpan={5} className="px-6 py-4">
                        <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">

                          {/* Panel Header */}
                          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0B2545] to-[#1E88E5] text-white font-black text-[11px] flex items-center justify-center">
                                {initials}
                              </div>
                              <div>
                                <p className="font-extrabold text-slate-900 text-xs">{user.name}</p>
                                <p className="text-[10px] text-slate-400">{user.email}</p>
                              </div>
                            </div>
                            {/* Status toggle */}
                            <button
                              onClick={() => toggleUserStatus(user.id)}
                              disabled={isProtected}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-extrabold transition cursor-pointer ${
                                user.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                              } ${isProtected ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${ user.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500' }`} />
                              {user.status === 'Active' ? 'Active — click to deactivate' : 'Inactive — click to activate'}
                            </button>
                          </div>

                          {/* Info Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-y divide-slate-100">
                            <div className="px-4 py-3">
                              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Department</p>
                              <p className="text-xs font-semibold text-slate-800">{user.dept || '—'}</p>
                            </div>
                            <div className="px-4 py-3">
                              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Reporting Manager</p>
                              <p className="text-xs font-semibold text-slate-800">{user.reporting_manager_name || 'Unassigned'}</p>
                              {user.reporting_manager_email && (
                                <p className="text-[10px] text-slate-400">{user.reporting_manager_email}</p>
                              )}
                            </div>
                            <div className="px-4 py-3">
                              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Phone</p>
                              <p className="text-xs font-semibold text-slate-800">{user.phone || '—'}</p>
                            </div>
                            <div className="px-4 py-3">
                              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Emp ID</p>
                              <p className="text-xs font-mono font-semibold text-slate-800">{user.employee_code || user.employee_id || '—'}</p>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          {isProtected ? (
                            <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-2">
                              <Lock className="w-3.5 h-3.5 text-amber-500" />
                              <span className="text-xs font-bold text-slate-500">Protected account — actions restricted</span>
                            </div>
                          ) : (
                            <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                              <button
                                onClick={() => { setDuplicateErrorUser(null); setSelectedEnrollUser(user); setShowEnrollFaceModal(true) }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-[11px] font-bold transition cursor-pointer"
                              >
                                <Camera className="w-3.5 h-3.5" /> Biometric
                              </button>
                              <button
                                onClick={() => setSelectedEmployeeProfile(user)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 rounded-lg text-[11px] font-bold transition cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" /> View Profile
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(user)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-[11px] font-bold transition cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" /> Edit
                              </button>
                              <button
                                onClick={() => handleOpenReassignModal(user)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-[11px] font-bold transition cursor-pointer"
                              >
                                <ArrowRight className="w-3.5 h-3.5" /> Reassign
                              </button>
                              <button
                                onClick={() => setShowCredentialsModal(user)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-[11px] font-bold transition cursor-pointer"
                              >
                                <Key className="w-3.5 h-3.5" /> Access Keys
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-[11px] font-bold transition cursor-pointer ml-auto"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function UserManagement() {
  const { showToast } = useToast()
  const location = useLocation()
  const searchInputRef = useRef(null)
  const [users, setUsers] = useState([])
  const [activeTab, setActiveTab] = useState('hierarchy') // 'hierarchy' | 'password-resets'
  const [showDirectoryModal, setShowDirectoryModal] = useState(false)
  const [departmentsList, setDepartmentsList] = useState([])

  useEffect(() => {
    async function fetchDepartments() {
      try {
        const res = await settingsAPI.getSettings()
        if (res?.data?.departments) {
          const activeDepts = res.data.departments
            .filter(d => d.status === 'Active' || d.status === undefined)
            .map(d => d.name)
          setDepartmentsList(activeDepts)
        }
      } catch (err) {
        console.warn('Failed to load company departments:', err)
      }
    }
    fetchDepartments()
  }, [])

  const defaultDepts = [
    'Sales & Business Development',
    'Inside Sales',
    'Field Sales',
    'IT & System Admin'
  ]
  const deptOptions = departmentsList.length > 0 ? departmentsList : defaultDepts

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState('ALL')
  const [showAddModal, setShowAddModal] = useState(false)

  // Auto-open modal or focus search if requested via navigation state (e.g. from Admin Dashboard Quick Action)
  useEffect(() => {
    if (location.state?.openAddModal) {
      setShowAddModal(true)
    } else if (location.state?.focusSearch) {
      setActiveTab('table')
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }, [location])

  // Password visibility states
  const [showAddPassword, setShowAddPassword] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)

  // Credentials Generated Modal
  const [createdCredentialsModal, setCreatedCredentialsModal] = useState(null)

  const [newUser, setNewUser] = useState({
    first_name: '',
    last_name: '',
    name: '',
    gender: 'Male',
    date_of_birth: '',
    email: '',
    phone: '',
    emergency_contact: '',
    password: '',
    role: 'Sales Executive',
    dept: deptOptions[0] || 'Sales & Business Development',
    status: 'Active',
    reporting_manager_id: '',
    reporting_manager_name: '',
    reporting_manager_email: '',
  })

  // Biometric face enrollment states
  const [enrollFaceUrl, setEnrollFaceUrl] = useState(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [selectedEnrollUser, setSelectedEnrollUser] = useState(null)
  const [showEnrollFaceModal, setShowEnrollFaceModal] = useState(false)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [duplicateErrorUser, setDuplicateErrorUser] = useState(null)
  
  // Liveness engine states
  const [livenessStatus, setLivenessStatus] = useState('PENDING') // PENDING | VERIFYING | PASSED
  const [isFaceAligned, setIsFaceAligned] = useState(false)
  const [blinkCount, setBlinkCount] = useState(0)
  const [livenessProgress, setLivenessProgress] = useState(0)
  
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const canvasRef = useRef(null)
  const engineRef = useRef(new FaceLivenessEngine())

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: "user" } })
      streamRef.current = stream
      setCameraActive(true)
      setLivenessStatus("VERIFYING")
      setBlinkCount(0)
      setLivenessProgress(10)
      setIsFaceAligned(false)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      }, 100)
    } catch (err) {
      showToast('Could not access camera. Please allow permissions.', 'error')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setEnrollFaceUrl(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // Real-time face alignment loop for Admin Create Modal
  useEffect(() => {
    let animId
    const analyzeFrame = () => {
      if (cameraActive && videoRef.current && canvasRef.current) {
        const evalResult = engineRef.current.evaluateAlignment(videoRef.current, canvasRef.current)
        setIsFaceAligned(evalResult.isAligned)
      }
      animId = requestAnimationFrame(analyzeFrame)
    }
    if (cameraActive) {
      animId = requestAnimationFrame(analyzeFrame)
    }
    return () => cancelAnimationFrame(animId)
  }, [cameraActive])

  const handleVerifyLiveness = async () => {
    if (videoRef.current && canvasRef.current) {
      try {
        setIsEnrolling(true)
        setLivenessProgress(30)
        const video = videoRef.current
        const canvas = canvasRef.current
        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 480
        const ctx = canvas.getContext('2d')
        ctx.translate(canvas.width, 0)
        ctx.scale(-1, 1)
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
        setLivenessProgress(60)
        
        const res = await attendanceAPI.verifyLiveness({
          challenge_type: "blink",
          face_data_url: dataUrl
        })
        
        setLivenessProgress(100)
        setIsEnrolling(false)
        if (res && res.data && res.data.liveness_verified) {
          setLivenessStatus("PASSED")
          showToast("Liveness verification passed ✓", "success")
        } else {
          setLivenessStatus("PENDING")
          showToast(res.data?.message || "Liveness verification failed on server.", "error")
        }
      } catch (err) {
        setIsEnrolling(false)
        setLivenessStatus("PENDING")
        console.error("Liveness verification error:", err)
        const errMsg = err?.detail || err?.message || err?.error || (typeof err === 'string' ? err : 'Biometric service error')
        showToast(`Liveness verification failed: ${errMsg}`, 'error')
      }
    }
  }

  const handleEnrollClick = async () => {
    if (videoRef.current && canvasRef.current) {
      try {
        const video = videoRef.current
        const canvas = canvasRef.current
        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 480
        const ctx = canvas.getContext('2d')
        ctx.translate(canvas.width, 0)
        ctx.scale(-1, 1)
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
        stopCamera()
        setIsEnrolling(true)
        
        if (selectedEnrollUser) {
          // Call backend enrollment API immediately using correct, fetched employee code
          await attendanceAPI.enroll({
            employee_id: selectedEnrollUser.employee_code || selectedEnrollUser.employee_id,
            employee_name: selectedEnrollUser.name,
            face_data_url: dataUrl
          })
          setEnrollFaceUrl(dataUrl)
          showToast("Enrolled successfully ✓", "success")
          setTimeout(() => {
            setShowEnrollFaceModal(false)
            setSelectedEnrollUser(null)
            setEnrollFaceUrl(null)
            setIsEnrolling(false)
          }, 1000)
        } else {
          setEnrollFaceUrl(dataUrl)
          showToast("Face template captured successfully ✓", "success")
          setIsEnrolling(false)
        }
      } catch (err) {
        setIsEnrolling(false)
        const errMsg = err?.detail || err?.message || err?.error || (typeof err === 'string' ? err : 'Biometric service error')
        const match = typeof errMsg === 'string' && errMsg.match(/This face is already enrolled for (.+?) \/ (.+?)\./)
        if (match) {
          setDuplicateErrorUser({
            name: match[1].trim(),
            code: match[2].trim()
          })
        } else {
          showToast(`Face Biometrics Enrollment failed: ${errMsg}`, 'error')
        }
      }
    }
  }

  useEffect(() => {
    if (!showAddModal && !showEnrollFaceModal) {
      stopCamera()
      setEnrollFaceUrl(null)
    }
  }, [showAddModal, showEnrollFaceModal])

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [showCredentialsModal, setShowCredentialsModal] = useState(null)
  const [selectedEmployeeProfile, setSelectedEmployeeProfile] = useState(null)

  // Sales Executive Assignment Modal State
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedManagerId, setSelectedManagerId] = useState('')
  const [selectedExecIds, setSelectedExecIds] = useState([])
  const [assigning, setAssigning] = useState(false)

  // New hierarchy search & assignment states
  const [unassignedSearchQuery, setUnassignedSearchQuery] = useState('')
  const [selectedUnassignedExec, setSelectedUnassignedExec] = useState(null)
  const [showAssignToManagerModal, setShowAssignToManagerModal] = useState(false)
  const [assigningToManager, setAssigningToManager] = useState(false)

  // Reassign Manager Modal State
  const [showReassignModal, setShowReassignModal] = useState(false)
  const [reassignUser, setReassignUser] = useState(null)
  const [selectedNewManagerId, setSelectedNewManagerId] = useState('')
  const [reassigning, setReassigning] = useState(false)

  // Derived lists
  const salesManagers = useMemo(() => {
    return users.filter((u) => {
      const r = (u.role || '').toLowerCase()
      return r.includes('manager') || r.includes('admin') || r.includes('ceo') || r.includes('team lead') || r.includes('tl')
    })
  }, [users])

  const salesExecutives = useMemo(() => {
    return users.filter((u) => {
      const r = (u.role || '').toLowerCase()
      const isManagerOrAdmin = r.includes('manager') || r.includes('admin') || r.includes('ceo') || r.includes('team lead') || r.includes('tl')
      return !isManagerOrAdmin
    })
  }, [users])

  const hierarchyManagers = useMemo(() => {
    return users.filter((u) => {
      const r = (u.role || '').toLowerCase().trim()
      return r === 'sales manager' || r === 'team lead' || r === 'tl'
    })
  }, [users])

  const hierarchyExecutives = useMemo(() => {
    return users.filter((u) => (u.role || '').toLowerCase().trim() === 'sales executive')
  }, [users])

  // Potential Reporting Managers (CEO, Admin, Managers, and Team Leads)
  const potentialReportingManagers = useMemo(() => {
    return users.filter((u) => {
      const r = (u.role || '').toLowerCase()
      return r.includes('manager') || r.includes('admin') || r.includes('ceo') || r.includes('founder') || r.includes('team lead') || r.includes('tl')
    })
  }, [users])

  // Manager -> Assigned Executives Hierarchy Data
  const managerHierarchy = useMemo(() => {
    return hierarchyManagers.map((mgr) => {
      const mId = String(mgr.id || mgr.employee_id || '').toLowerCase().trim()
      const mCode = String(mgr.employee_code || '').toLowerCase().trim()
      const mEmail = String(mgr.email || '').toLowerCase().trim()
      const mName = String(mgr.name || '').toLowerCase().trim()

      const assigned = hierarchyExecutives.filter((e) => {
        const rId = String(e.reporting_manager_id || '').toLowerCase().trim()
        const rEmail = String(e.reporting_manager_email || '').toLowerCase().trim()
        const rName = String(e.reporting_manager_name || '').toLowerCase().trim()

        return (
          (mId && rId === mId) ||
          (mCode && rId === mCode) ||
          (mEmail && rEmail === mEmail) ||
          (mName && rName === mName)
        )
      })

      return {
        manager: mgr,
        assignedExecutives: assigned,
        count: assigned.length,
      }
    })
  }, [hierarchyManagers, hierarchyExecutives])

  // Unassigned Executives Pool
  const unassignedExecutives = useMemo(() => {
    return hierarchyExecutives.filter((e) => {
      const rId = e.reporting_manager_id
      const rName = e.reporting_manager_name
      const rEmail = e.reporting_manager_email
      return !rId && !rName && !rEmail
    })
  }, [hierarchyExecutives])

  // Filtered unassigned pool for search/filter input
  const filteredUnassignedPool = useMemo(() => {
    return unassignedExecutives.filter((exec) => {
      const q = unassignedSearchQuery.toLowerCase()
      return (
        (exec.name || '').toLowerCase().includes(q) ||
        (exec.email || '').toLowerCase().includes(q)
      )
    })
  }, [unassignedExecutives, unassignedSearchQuery])

  const handleManagerSelect = (mId) => {
    setSelectedManagerId(mId)
    const targetManager = users.find((u) => String(u.id) === String(mId))
    if (targetManager) {
      const mEmail = (targetManager.email || '').toLowerCase()
      const mCode = (targetManager.employee_code || targetManager.id || '').toLowerCase()
      const currentlyAssigned = salesExecutives
        .filter((e) => {
          const rEmail = (e.reporting_manager_email || '').toLowerCase()
          const rId = String(e.reporting_manager_id || '').toLowerCase()
          return rEmail === mEmail || rId === mCode || rId === String(mId).toLowerCase()
        })
        .map((e) => String(e.id))
      setSelectedExecIds(currentlyAssigned)
    } else {
      setSelectedExecIds([])
    }
  }

  const handleOpenAssignModalForManager = (mId) => {
    handleManagerSelect(mId)
    setShowAssignModal(true)
  }

  const handleToggleExecSelection = (execId) => {
    const strId = String(execId)
    if (selectedExecIds.includes(strId)) {
      setSelectedExecIds((prev) => prev.filter((id) => id !== strId))
    } else {
      setSelectedExecIds((prev) => [...prev, strId])
    }
  }

  const handleAssignToManager = async (managerId) => {
    if (!selectedUnassignedExec) return
    setAssigningToManager(true)
    const mgr = users.find(u => String(u.id) === String(managerId) || String(u.employee_id) === String(managerId))
    const mName = mgr?.name || 'Sales Manager'
    const mEmail = mgr?.email || ''
    const mId = mgr?.id || mgr?.employee_id || managerId

    try {
      await userAPI.updateUser(selectedUnassignedExec.id, {
        name: selectedUnassignedExec.name,
        email: selectedUnassignedExec.email,
        reporting_manager_id: mId,
        reporting_manager_name: mName,
        reporting_manager_email: mEmail
      })
      showToast(`Assigned ${selectedUnassignedExec.name} to ${mName} successfully!`, 'success')
      setShowAssignToManagerModal(false)
      setSelectedUnassignedExec(null)
      
      // Refresh list from database
      const freshRes = await userAPI.getUsers()
      if (freshRes && freshRes.data) {
        setUsers(Array.isArray(freshRes.data) ? freshRes.data : [])
      }
    } catch (err) {
      showToast(err?.message || 'Failed to update manager assignment', 'error')
    } finally {
      setAssigningToManager(false)
    }
  }

  const handleOpenReassignModal = (user) => {
    setReassignUser(user)
    setSelectedNewManagerId(user.reporting_manager_id || user.reporting_manager || '')
    setShowReassignModal(true)
  }

  const handleSaveReassignment = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (!reassignUser) return
    setReassigning(true)

    const targetManager = selectedNewManagerId ? users.find(u => String(u.id) === String(selectedNewManagerId) || String(u.employee_id) === String(selectedNewManagerId)) : null
    const mName = targetManager ? targetManager.name : null
    const mEmail = targetManager ? targetManager.email : null
    const mId = targetManager ? (targetManager.id || targetManager.employee_id) : null

    try {
      await userAPI.updateUser(reassignUser.id, {
        name: reassignUser.name,
        email: reassignUser.email,
        reporting_manager_id: mId,
        reporting_manager_name: mName,
        reporting_manager_email: mEmail,
      })

      setUsers(prev => prev.map(u => {
        if (String(u.id) === String(reassignUser.id)) {
          return {
            ...u,
            reporting_manager_id: mId,
            reporting_manager_name: mName,
            reporting_manager_email: mEmail,
          }
        }
        return u
      }))

      if (targetManager) {
        showToast(`Reassigned ${reassignUser.name} to ${mName} successfully!`, 'success')
      } else {
        showToast(`Unassigned Reporting Manager for ${reassignUser.name}.`, 'info')
      }

      setShowReassignModal(false)
      setReassignUser(null)

      const freshRes = await userAPI.getUsers()
      if (freshRes && freshRes.data) {
        setUsers(Array.isArray(freshRes.data) ? freshRes.data : [])
      }
    } catch (err) {
      showToast(err?.message || 'Failed to reassign reporting manager', 'error')
    } finally {
      setReassigning(false)
    }
  }

  const handleUnassignExecutive = async (execId, execName, managerName) => {
    if (!window.confirm(`Are you sure you want to remove ${execName} from ${managerName}'s team?`)) {
      return
    }

    const execObj = users.find(u => String(u.id) === String(execId) || String(u.employee_id) === String(execId))

    try {
      await userAPI.updateUser(execId, {
        name: execObj?.name || execName,
        email: execObj?.email || '',
        reporting_manager_id: null,
        reporting_manager_name: null,
        reporting_manager_email: null
      })
      showToast(`Removed ${execName} from ${managerName}'s team.`, 'info')
      
      // Refresh list from database
      const freshRes = await userAPI.getUsers()
      if (freshRes && freshRes.data) {
        setUsers(Array.isArray(freshRes.data) ? freshRes.data : [])
      }
    } catch (err) {
      showToast(err?.message || 'Failed to remove manager assignment', 'error')
    }
  }

  const handleSaveAssignments = async (e) => {
    e.preventDefault()
    if (!selectedManagerId) {
      showToast('Please select a Sales Manager first!', 'error')
      return
    }

    setAssigning(true)
    const managerObj = users.find((u) => String(u.id) === String(selectedManagerId))
    const mName = managerObj?.name || 'Sales Manager'
    const mEmail = managerObj?.email || ''
    const mId = managerObj?.id || selectedManagerId

    try {
      await userAPI.assignManager({
        manager_id: selectedManagerId,
        executive_ids: selectedExecIds,
      })

      // Update local state reactively
      setUsers((prev) =>
        prev.map((u) => {
          if (selectedExecIds.includes(String(u.id))) {
            return {
              ...u,
              reporting_manager_id: mId,
              reporting_manager_name: mName,
              reporting_manager_email: mEmail,
            }
          } else if (u.reporting_manager_id === mId || u.reporting_manager_email === mEmail) {
            return {
              ...u,
              reporting_manager_id: null,
              reporting_manager_name: null,
              reporting_manager_email: null,
            }
          }
          return u
        })
      )

      try {
        const assignMap = JSON.parse(localStorage.getItem('tc_manager_assignments') || '{}')
        assignMap[mId] = selectedExecIds
        localStorage.setItem('tc_manager_assignments', JSON.stringify(assignMap))
      } catch (err) {}

      showToast(`Assigned ${selectedExecIds.length} Sales Executives to ${mName}!`, 'success')
      setShowAssignModal(false)
    } catch (err) {
      showToast(err?.message || 'Failed to save assignments on backend', 'error')
    } finally {
      setAssigning(false)
    }
  }

  // Fetch users from backend / Supabase and sync with localStorage
  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await userAPI.getUsers()
        if (res && res.data) {
          setUsers(Array.isArray(res.data) ? res.data : [])
        }
      } catch (err) {
        const saved = localStorage.getItem('tc_app_users')
        if (saved) {
          try {
            setUsers(JSON.parse(saved))
          } catch (e) {}
        }
      }
    }
    loadUsers()
  }, [])

  // Auto-select first Sales Manager for hierarchy view when list updates
  useEffect(() => {
    const firstMgr = users.find(u => (u.role || '').toLowerCase().trim() === 'sales manager')
    if (firstMgr && !selectedManagerId) {
      setSelectedManagerId(firstMgr.id)
    }
  }, [users, selectedManagerId])

  // Sync users list to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tc_app_users', JSON.stringify(users))
    } catch (e) {}
  }, [users])

  const handleOpenEditModal = async (user) => {
    const saved = localStorage.getItem(`tc_leaves_${user.email.toLowerCase().trim()}`)
    const leaveAllocation = saved ? JSON.parse(saved) : { annualLeaves: 12, sickLeaves: 10, otherLeaves: 10, halfDayPermissions: 6, shortPermissions: 2 }
    
    // Load from database properties first, fallback to localStorage/defaults
    const annualLeaves = user.annual_leaves ?? user.annualLeaves ?? leaveAllocation.annualLeaves;
    const sickLeaves = user.sick_leaves ?? user.sickLeaves ?? leaveAllocation.sickLeaves ?? 10;
    const otherLeaves = user.other_leaves ?? user.otherLeaves ?? leaveAllocation.otherLeaves ?? 10;
    const halfDayPermissions = user.half_day_permissions ?? user.halfDayPermissions ?? leaveAllocation.halfDayPermissions;
    const shortPermissions = user.short_permissions ?? user.shortPermissions ?? leaveAllocation.shortPermissions;

    let salaryVal = 35000;
    try {
      const salRes = await hrmsAPI.getSalaryByEmployeeId(user.employee_id || user.id);
      if (salRes && salRes.data) {
        salaryVal = salRes.data.monthly_salary || 0;
      }
    } catch (e) {
      console.warn("Failed to load salary details:", e);
    }

    setEditingUser({
      ...user,
      annualLeaves,
      sickLeaves,
      otherLeaves,
      halfDayPermissions,
      shortPermissions,
      monthlySalary: salaryVal
    })
    setShowEditModal(true)
  }

  // Set default reporting manager when role is changed to Sales Manager / Team Lead in Add form
  const handleAddRoleChange = (selectedRole) => {
    let extra = {}
    if (selectedRole === 'Sales Manager' || selectedRole === 'Team Lead') {
      const ceo = users.find(u => {
        const emailLower = (u.email || '').toLowerCase()
        const roleLower = (u.role || '').toLowerCase()
        return emailLower === 'ceo@tconnect.com' || roleLower.includes('ceo') || roleLower.includes('founder')
      })
      if (ceo) {
        extra = {
          reporting_manager_id: ceo.id,
          reporting_manager_name: ceo.name,
          reporting_manager_email: ceo.email,
        }
      } else {
        extra = {
          reporting_manager_id: 'EMP000001',
          reporting_manager_name: 'Dr. Twite Executive',
          reporting_manager_email: 'ceo@tconnect.com',
        }
      }
    } else {
      extra = {
        reporting_manager_id: '',
        reporting_manager_name: '',
        reporting_manager_email: '',
      }
    }
    setNewUser({ ...newUser, role: selectedRole, ...extra })
  }

  // Set default reporting manager when role is changed to Sales Manager / Team Lead in Edit form
  const handleEditRoleChange = (selectedRole) => {
    let extra = {}
    if (selectedRole === 'Sales Manager' || selectedRole === 'Team Lead') {
      const ceo = users.find(u => {
        const emailLower = (u.email || '').toLowerCase()
        const roleLower = (u.role || '').toLowerCase()
        return emailLower === 'ceo@tconnect.com' || roleLower.includes('ceo') || roleLower.includes('founder')
      })
      if (ceo) {
        extra = {
          reporting_manager_id: ceo.id,
          reporting_manager_name: ceo.name,
          reporting_manager_email: ceo.email,
        }
      } else {
        extra = {
          reporting_manager_id: 'EMP000001',
          reporting_manager_name: 'Dr. Twite Executive',
          reporting_manager_email: 'ceo@tconnect.com',
        }
      }
    }
    setEditingUser({ ...editingUser, role: selectedRole, ...extra })
  }

  // Save Edited User Details & Password
  const handleSaveEditedUser = async (e) => {
    e.preventDefault()
    if (!editingUser || !editingUser.name || !editingUser.email) return

    // Save leave allocation to localStorage
    const leaveAllocation = {
      annualLeaves: Number(editingUser.annualLeaves || 12),
      halfDayPermissions: Number(editingUser.halfDayPermissions || 6),
      shortPermissions: Number(editingUser.shortPermissions || 2)
    }
    localStorage.setItem(`tc_leaves_${editingUser.email.toLowerCase().trim()}`, JSON.stringify(leaveAllocation));

    setUsers((prev) =>
      prev.map((u) => (u.id === editingUser.id ? { ...editingUser } : u))
    )
    setShowEditModal(false)

    try {
      await userAPI.updateUser(editingUser.id, {
        name: editingUser.name,
        email: editingUser.email,
        phone: editingUser.phone,
        role: editingUser.role,
        dept: editingUser.dept,
        status: editingUser.status,
        accessPassword: editingUser.accessPassword,
        reporting_manager_id: editingUser.reporting_manager_id || null,
        reporting_manager_name: editingUser.reporting_manager_name || null,
        reporting_manager_email: editingUser.reporting_manager_email || null,
        annual_leaves: Number(editingUser.annualLeaves || 12),
        half_day_permissions: Number(editingUser.halfDayPermissions || 6),
        short_permissions: Number(editingUser.shortPermissions || 2),
      })

      // Update leaves directly in hrms.employees
      await hrmsAPI.updateEmployee(editingUser.employee_id || editingUser.id, {
        annual_leaves: Number(editingUser.annualLeaves || 12),
        sick_leaves: Number(editingUser.sickLeaves || 10),
        other_leaves: Number(editingUser.otherLeaves || 10),
        half_day_permissions: Number(editingUser.halfDayPermissions || 6),
        short_permissions: Number(editingUser.shortPermissions || 2),
      })

      // Update salary directly in hrms.salaries
      if (editingUser.monthlySalary !== undefined) {
        await hrmsAPI.updateSalary(editingUser.employee_id || editingUser.id, {
          monthly_salary: Number(editingUser.monthlySalary || 0)
        })
      }

      showToast(`User profile and access credentials updated!`, 'success')
    } catch (err) {
      showToast(`User profile updated locally`, 'info')
    } finally {
      setEditingUser(null)
    }
  }

  // Add User Handler (Creates Access Email & Password for Employee Portal Login)
  const handleAddUser = async (e) => {
    e.preventDefault()
    const fullName = newUser.name || `${newUser.first_name} ${newUser.last_name}`.trim()
    if (!fullName || !newUser.email || !newUser.password) {
      showToast('Please provide Name, Access Email, and Portal Password!', 'error')
      return
    }

    const created = {
      id: `usr_${Date.now()}`,
      first_name: newUser.first_name || fullName.split(' ')[0],
      last_name: newUser.last_name || fullName.split(' ').slice(1).join(' '),
      name: fullName,
      gender: newUser.gender || 'Male',
      date_of_birth: newUser.date_of_birth,
      email: newUser.email,
      phone: newUser.phone || '+91 99999 99999',
      emergency_contact: newUser.emergency_contact,
      role: newUser.role,
      dept: newUser.dept,
      status: newUser.status,
      lastLogin: 'Just now',
      accessPassword: newUser.password,
      annualLeaves: Number(newUser.annualLeaves || 12),
      halfDayPermissions: Number(newUser.halfDayPermissions || 6),
      shortPermissions: Number(newUser.shortPermissions || 2)
    }

    // Save leave allocation to localStorage
    const leaveAllocation = {
      annualLeaves: Number(newUser.annualLeaves || 12),
      halfDayPermissions: Number(newUser.halfDayPermissions || 6),
      shortPermissions: Number(newUser.shortPermissions || 2)
    }
    localStorage.setItem(`tc_leaves_${newUser.email.toLowerCase().trim()}`, JSON.stringify(leaveAllocation));

    setUsers([created, ...users])
    setShowAddModal(false)

    // Show Access Credentials Confirmation Modal for Admin
    setCreatedCredentialsModal(created)

    setNewUser({
      first_name: '',
      last_name: '',
      name: '',
      gender: 'Male',
      date_of_birth: '',
      email: '',
      phone: '',
      emergency_contact: '',
      password: '',
      role: 'Sales Executive',
      dept: deptOptions[0] || 'Sales & Business Development',
      status: 'Active',
      reporting_manager_id: '',
      reporting_manager_name: '',
      reporting_manager_email: '',
      annualLeaves: 12,
      halfDayPermissions: 6,
      shortPermissions: 2
    })

    const autoEmpId = `EMP${String(users.length + 1).padStart(6, '0')}`

    try {
      const res = await userAPI.createUser({
        employee_code: autoEmpId,
        first_name: created.first_name,
        last_name: created.last_name,
        name: created.name,
        gender: created.gender,
        date_of_birth: created.date_of_birth,
        email: created.email,
        phone: created.phone,
        emergency_contact: created.emergency_contact,
        password: created.accessPassword,
        role: created.role,
        dept: created.dept,
        reporting_manager_id: newUser.reporting_manager_id || null,
        reporting_manager_name: newUser.reporting_manager_name || null,
        reporting_manager_email: newUser.reporting_manager_email || null,
        annual_leaves: created.annualLeaves,
        half_day_permissions: created.halfDayPermissions,
        short_permissions: created.shortPermissions,
      })
      showToast('User Created Successfully: ✓ Auth Account Created | ✓ Employee Profile Created | ✓ Added to HRMS', 'success')


      // Fetch fresh users list from backend API
      const freshRes = await userAPI.getUsers()
      if (freshRes && freshRes.data && freshRes.data.length > 0) {
        setUsers(freshRes.data)
      }
    } catch (err) {
      showToast('User portal account created locally', 'info')
    }
  }

  // Toggle User Status (Active / Inactive)
  const toggleUserStatus = async (userId) => {
    const target = users.find((u) => u.id === userId)
    if (target && isProtectedRole(target.role)) {
      showToast('Protected Account: Executive Board and Super Admin accounts cannot be deactivated.', 'error')
      return
    }

    const newStatus = target.status === 'Active' ? 'Inactive' : 'Active'
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
    )

    try {
      await userAPI.updateUser(userId, { status: newStatus })
      showToast(`User status changed to ${newStatus}`, 'info')
    } catch (err) {
      showToast(`User status updated to ${newStatus}`, 'info')
    }
  }

  // Delete User Account
  const handleDeleteUser = async (userId) => {
    const target = users.find((u) => u.id === userId)
    if (target && isProtectedRole(target.role)) {
      showToast('Protected Account: Executive Board and Super Admin accounts cannot be deleted.', 'error')
      return
    }

    if (window.confirm(`Are you sure you want to permanently delete account '${target?.name}'?`)) {
      setUsers((prev) => prev.filter((u) => u.id !== userId))
      try {
        await userAPI.deleteUser(userId)
        showToast('User account deleted from system', 'warning')
      } catch (err) {
        showToast('User account removed', 'warning')
      }
    }
  }

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text)
    showToast(`${label} copied to clipboard!`, 'success')
  }

  // Filter Users List
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.dept.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesRole = selectedRole === 'ALL' || u.role === selectedRole
    const matchesStatus = selectedStatus === 'ALL' || u.status === selectedStatus

    return matchesSearch && matchesRole && matchesStatus
  })

  // Role Statistics
  const activeCount = users.filter((u) => u.status === 'Active').length
  const inactiveCount = users.filter((u) => u.status === 'Inactive').length
  const salesManagersCount = users.filter((u) => u.role === 'Sales Manager' || u.role === 'Team Lead').length
  const executivesCount = users.filter((u) => u.role === 'Sales Executive').length

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 font-sans">
      <canvas ref={canvasRef} className="hidden" />
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" /> Employee & User Account Management
          </h1>

        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAssignModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <UserCheck className="w-4 h-4" /> Assign Sales Executives
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create New Employee Account
          </button>
        </div>
      </div>

      {/* KPI Stats Panel (Interactive Cards -> Click to open Users Directory Modal) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => {
            setSelectedRole('ALL')
            setSelectedStatus('ALL')
            setShowDirectoryModal(true)
          }}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-400 transition-all flex items-center gap-3 cursor-pointer text-left group"
          title="Click to view total users directory modal"
        >
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 group-hover:scale-105 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-blue-600 transition-colors">Total Users</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-2xl font-extrabold text-slate-900">{users.length}</p>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">View ↗</span>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedRole('Sales Manager')
            setSelectedStatus('ALL')
            setShowDirectoryModal(true)
          }}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-indigo-400 transition-all flex items-center gap-3 cursor-pointer text-left group"
          title="Click to view Sales Managers in directory modal"
        >
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">Sales Managers</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-2xl font-extrabold text-slate-900">{salesManagers.length}</p>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">View ↗</span>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedRole('Sales Executive')
            setSelectedStatus('ALL')
            setShowDirectoryModal(true)
          }}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-emerald-400 transition-all flex items-center gap-3 cursor-pointer text-left group"
          title="Click to view Sales Executives in directory modal"
        >
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 group-hover:scale-105 transition-transform">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-emerald-600 transition-colors">Assigned Subordinates</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-2xl font-extrabold text-slate-900">{salesExecutives.length - unassignedExecutives.length}</p>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">View ↗</span>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedRole('ALL')
            setSelectedStatus('ALL')
            setShowDirectoryModal(true)
          }}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-amber-400 transition-all flex items-center gap-3 cursor-pointer text-left group"
          title="Click to view Unassigned Executives in directory modal"
        >
          <div className={`p-3 rounded-xl border group-hover:scale-105 transition-transform ${unassignedExecutives.length > 0 ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-amber-600 transition-colors">Unassigned Pool</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className={`text-2xl font-extrabold ${unassignedExecutives.length > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{unassignedExecutives.length}</p>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">View ↗</span>
            </div>
          </div>
        </button>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedRole('ALL')
              setSelectedStatus('ALL')
              setShowDirectoryModal(true)
            }}
            className="px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
          >
            <Layers className="w-4 h-4" /> All Users Directory ({users.length}) ↗
          </button>
          <button
            onClick={() => setActiveTab('hierarchy')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'hierarchy'
                ? 'bg-[#061A4D] text-white shadow-md shadow-[#061A4D]/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Network className="w-4 h-4" /> Manager & Executive Team Hierarchy ({hierarchyManagers.length} Managers)
          </button>
          <button
            onClick={() => setActiveTab('password-resets')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer relative ${
              activeTab === 'password-resets'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Key className="w-4 h-4" /> Password Requests
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* VIEW 3: PASSWORD RESET REQUESTS                          */}
      {/* ======================================================== */}
      {activeTab === 'password-resets' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <PasswordResetRequestsPanel />
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 1: MANAGER & EXECUTIVE HIERARCHY                    */}
      {/* ======================================================== */}
      {activeTab === 'hierarchy' && (

        <div className="space-y-6">
          {/* Header Info Note */}
          <div className="bg-white border border-[#DCE3EF] p-5 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#061A4D] text-white rounded-xl shadow-inner">
                <Network className="w-5 h-5 text-[#F2C76E]" />
              </div>
              <div>
                <h4 className="font-extrabold text-[#071A45] text-sm">Manager-to-Executive Team Hierarchy</h4>
                <p className="text-[11px] text-[#64748B] font-medium mt-0.5">
                  Select a Sales Manager in the left panel to manage their assigned executive team subordinates.
                </p>
              </div>
            </div>
          </div>

          {/* Two-panel layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left Panel: Sales Managers List */}
            <div className="md:col-span-5 bg-white border border-[#DCE3EF] p-5 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="font-extrabold text-[#071A45] text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#123A8C]" /> Sales Managers ({hierarchyManagers.length})
                </h3>
              </div>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {hierarchyManagers.length === 0 ? (
                  <p className="text-xs text-[#64748B] font-semibold text-center py-8 bg-slate-50/50 border border-dashed border-[#DCE3EF] rounded-xl">
                    No Sales Managers found in database.
                  </p>
                ) : (
                  hierarchyManagers.map((mgr) => {
                    const isSelected = String(selectedManagerId) === String(mgr.id)
                    const relationship = managerHierarchy.find(h => String(h.manager.id) === String(mgr.id))
                    const count = relationship ? relationship.count : 0
                    return (
                      <div
                        key={mgr.id}
                        onClick={() => setSelectedManagerId(mgr.id)}
                        className={`p-4 rounded-xl border transition cursor-pointer relative flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#123A8C] bg-blue-50/20 shadow-xs ring-2 ring-[#123A8C]/15'
                            : 'border-[#DCE3EF] bg-slate-50/30 hover:bg-slate-50 hover:border-slate-350'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#D9A441] rounded-l-xl" />
                        )}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#061A4D] to-[#123A8C] text-white flex items-center justify-center font-black text-xs shadow-sm uppercase border border-white">
                              {(mgr.name || '').split(' ').map((n) => n[0]).join('')}
                            </div>
                            <div>
                              <h4 className="font-extrabold text-xs text-[#071A45]">{mgr.name}</h4>
                              <p className="text-[10px] text-[#64748B] font-semibold mt-0.5">{mgr.email}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border transition ${
                            mgr.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                          }`}>
                            {mgr.status || 'Active'}
                          </span>
                        </div>
                        <div className="mt-3 pt-2.5 border-t border-slate-200/50 flex items-center justify-between text-[11px] text-[#64748B] font-bold">
                          <span>Subordinates</span>
                          <span className="text-[#123A8C] font-extrabold">{count} {count === 1 ? 'Executive' : 'Executives'}</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Right Panel: Selected Manager's Team Subordinates */}
            <div className="md:col-span-7 bg-white border border-[#DCE3EF] p-5 rounded-2xl shadow-xs space-y-6">
              {(() => {
                const mgrObj = hierarchyManagers.find(m => String(m.id) === String(selectedManagerId))
                const relationship = managerHierarchy.find(h => String(h.manager.id) === String(selectedManagerId))
                const assigned = relationship ? relationship.assignedExecutives : []
                const count = relationship ? relationship.count : 0

                if (!mgrObj) {
                  return (
                    <div className="py-20 text-center text-xs text-slate-500 font-semibold border border-dashed border-[#DCE3EF] rounded-xl bg-slate-50/40">
                      Please select a Sales Manager from the list to view their team hierarchy.
                    </div>
                  )
                }

                return (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-[#071A45] text-base">{mgrObj.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border transition ${
                            mgrObj.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                          }`}>
                            {mgrObj.status || 'Active'}
                          </span>
                        </div>
                        <p className="text-xs text-[#64748B] font-semibold mt-1">
                          Sales Manager &middot; {mgrObj.email}
                        </p>
                      </div>
                    </div>

                    {/* Assigned Executives Subordinates List */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-[#64748B]">
                        Assigned Executives ({count})
                      </h4>

                      {assigned.length === 0 ? (
                        <div className="py-12 text-center border border-dashed border-[#DCE3EF] rounded-xl bg-slate-50/40 space-y-2.5">
                          <p className="text-xs text-slate-500 font-semibold">No Sales Executives reporting to this manager yet.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1">
                          {assigned.map((exec) => (
                             <div
                              key={exec.id}
                              className="bg-[#F7F9FC]/40 border border-[#DCE3EF] rounded-xl p-3 flex flex-col xs:flex-row xs:items-center justify-between gap-3 hover:border-slate-350 transition"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#123A8C] font-extrabold text-xs flex items-center justify-center border border-blue-100 shrink-0">
                                  {(exec.name || '').split(' ').map((n) => n[0]).join('')}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-extrabold text-xs text-slate-900 truncate flex items-center gap-1.5">
                                    {exec.name}
                                  </p>
                                  <p className="text-[10px] text-[#64748B] truncate mt-0.5">{exec.email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap xs:flex-nowrap justify-start xs:justify-end shrink-0">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border transition ${
                                  exec.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                                }`}>
                                  {exec.status || 'Active'}
                                </span>
                                <button
                                  onClick={() => handleOpenReassignModal(exec)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 text-[10px] font-bold px-1.5 flex items-center gap-1 cursor-pointer transition"
                                  title="Transfer / Reassign Manager"
                                >
                                  🔄 Reassign
                                </button>
                                <button
                                  onClick={() => handleUnassignExecutive(exec.id, exec.name, mgrObj.name)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                  title="Remove from Manager's Team"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>

          {/* Unassigned Executives Pool Section */}
          <div className="bg-white border border-[#DCE3EF] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-50 text-[#D99A18] rounded-xl border border-amber-100">
                  <UserX className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-[#071A45]">Unassigned Executives Pool ({unassignedExecutives.length})</h3>
                  <p className="text-[11px] text-[#64748B] font-medium mt-0.5">Sales Executives who do not currently report to any manager.</p>
                </div>
              </div>
              
              {/* Unassigned search input */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search unassigned pool..."
                  value={unassignedSearchQuery}
                  onChange={(e) => setUnassignedSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-900 focus:outline-none focus:border-[#123A8C] font-semibold"
                />
              </div>
            </div>

            {filteredUnassignedPool.length === 0 ? (
              <p className="text-xs text-slate-500 font-semibold py-8 text-center bg-slate-50/50 border border-dashed border-[#DCE3EF] rounded-xl">
                {unassignedSearchQuery ? 'No unassigned pool matches search query.' : 'Unassigned executives pool is currently empty.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredUnassignedPool.map((exec) => (
                  <div
                    key={exec.id}
                    className="p-3 bg-slate-50/40 border border-[#DCE3EF] rounded-xl flex items-center justify-between gap-3 hover:border-slate-350 transition"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 font-extrabold text-[10px] flex items-center justify-center border border-amber-100 shrink-0">
                        {(exec.name || '').split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-[11px] text-slate-900 truncate">{exec.name}</p>
                        <p className="text-[9px] text-[#64748B] truncate mt-0.5">{exec.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-1.5 py-0.2 rounded-md text-[8px] font-black border transition ${
                        exec.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>
                        {exec.status || 'Active'}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedUnassignedExec(exec)
                          setShowAssignToManagerModal(true)
                        }}
                        className="px-2.5 py-1 bg-[#061A4D] hover:bg-[#123A8C] text-white font-extrabold text-[10px] rounded-lg shadow-2xs cursor-pointer transition shrink-0"
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: ALL USERS DIRECTORY — CARD GRID               */}
      {/* ======================================================== */}
      {/* VIEW 2: ALL USERS DIRECTORY — TABLE                    */}
      {/* ======================================================== */}
      {/* ======================================================== */}
      {/* ALL USERS DIRECTORY — POPUP MODAL TABLE                   */}
      {/* ======================================================== */}
      {showDirectoryModal && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-6xl w-full flex flex-col border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] text-left text-xs font-semibold text-slate-800">
            
            {/* Modal Header */}
            <div className="bg-[#061A4D] text-white p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
                    All Users Directory
                    <span className="text-xs bg-blue-500/30 border border-blue-400/40 text-blue-200 px-2.5 py-0.5 rounded-full font-bold">
                      {filteredUsers.length} Users Found
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                    Full system database directory. Filter by Role/Status or Search by Name/Email.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDirectoryModal(false)}
                className="text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <span>✕ Close</span>
              </button>
            </div>

            {/* Search & Filter Bar inside Modal */}
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search name, email, department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-250 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-bold shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="px-3.5 py-2 bg-white border border-slate-250 rounded-xl text-xs font-extrabold text-slate-700 focus:outline-none cursor-pointer shadow-2xs"
                >
                  <option value="ALL">All Roles</option>
                  <option value="Super Admin">Super Admin</option>
                  <option value="Sales Manager">Sales Manager</option>
                  <option value="Sales Executive">Sales Executive</option>
                </select>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3.5 py-2 bg-white border border-slate-250 rounded-xl text-xs font-extrabold text-slate-700 focus:outline-none cursor-pointer shadow-2xs"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedRole('ALL')
                    setSelectedStatus('ALL')
                  }}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            </div>

            {/* Table Body */}
            <div className="flex-1 overflow-y-auto p-4">
              <UserDirectoryTable
                filteredUsers={filteredUsers}
                isProtectedRole={isProtectedRole}
                ROLE_BADGE_CLASSES={ROLE_BADGE_CLASSES}
                toggleUserStatus={toggleUserStatus}
                handleOpenEditModal={handleOpenEditModal}
                handleDeleteUser={handleDeleteUser}
                handleOpenReassignModal={handleOpenReassignModal}
                setSelectedEnrollUser={setSelectedEnrollUser}
                setDuplicateErrorUser={setDuplicateErrorUser}
                setShowEnrollFaceModal={setShowEnrollFaceModal}
                setSelectedEmployeeProfile={setSelectedEmployeeProfile}
                setShowCredentialsModal={setShowCredentialsModal}
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600 shrink-0">
              <span>Showing {filteredUsers.length} of {users.length} total records</span>
              <button
                type="button"
                onClick={() => setShowDirectoryModal(false)}
                className="px-5 py-2 bg-[#061A4D] hover:bg-[#123A8C] text-white rounded-xl font-extrabold shadow-sm transition cursor-pointer"
              >
                Close Modal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal (Admin Creates Access Email & Password) */}
      {/* Add User Modal (Admin Creates Access Email & Password) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 border border-slate-200 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" /> Create Portal Access Account
              </span>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer">
                ✕
              </button>
            </h3>

            <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-[11px] font-semibold text-blue-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Enter the employee's <strong>Access Email</strong> and assign a <strong>Portal Access Password</strong>. The employee will use these exact credentials to log in to their Sales Manager or Executive portal.
              </span>
            </div>

            <form onSubmit={handleAddUser} autoComplete="off" className="space-y-4 text-xs">
              {/* Fake hidden input traps to block browser autofill */}
              <input type="text" name="fake_usernamenotremembered" style={{ display: 'none' }} tabIndex={-1} />
              <input type="password" name="fake_passwordnotremembered" style={{ display: 'none' }} tabIndex={-1} />

              {/* Account Access Fields Group */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Employee ID (Auto-Generated)</label>
                  <input
                    type="text"
                    value={`EMP${String(users.length + 1).padStart(6, '0')}`}
                    disabled
                    className="w-full h-10 border border-slate-200 bg-slate-50/50 rounded-xl px-3 text-slate-700 font-extrabold cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Access Email Address (Portal Login Email)</label>
                  <input
                    type="email"
                    name="new_user_login_email"
                    id="new_user_login_email"
                    placeholder="e.g. employee.name@company.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value, name: `${newUser.first_name} ${newUser.last_name}`.trim() })}
                    className="w-full h-10 border border-slate-350 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 bg-white"
                    autoComplete="off"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Portal Access Password</label>
                  <div className="relative">
                    <input
                      type={showAddPassword ? 'text' : 'password'}
                      name="new_user_login_password"
                      id="new_user_login_password"
                      placeholder="Assign login password (e.g. Sales2026#)"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="w-full h-10 border border-slate-350 rounded-xl pl-3 pr-10 text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 bg-white"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddPassword(!showAddPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showAddPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Assigned Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => handleAddRoleChange(e.target.value)}
                    className="w-full h-10 border border-slate-350 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-blue-600 font-bold bg-white focus:ring-1 focus:ring-blue-100"
                  >
                    <option value="Sales Manager">Sales Manager</option>
                    <option value="Team Lead">Team Lead</option>
                    <option value="Sales Executive">Sales Executive</option>
                    <option value="System Admin">System Admin</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-100 my-2" />

              {/* Personal Details Group */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">First Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Arun"
                    value={newUser.first_name}
                    onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value, name: `${e.target.value} ${newUser.last_name}`.trim() })}
                    className="w-full h-10 border border-slate-355 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Last Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Kumar"
                    value={newUser.last_name}
                    onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value, name: `${newUser.first_name} ${e.target.value}`.trim() })}
                    className="w-full h-10 border border-slate-355 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Gender</label>
                  <select
                    value={newUser.gender}
                    onChange={(e) => setNewUser({ ...newUser, gender: e.target.value })}
                    className="w-full h-10 border border-slate-355 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600 bg-white focus:ring-1 focus:ring-blue-100"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={newUser.date_of_birth}
                    onChange={(e) => setNewUser({ ...newUser, date_of_birth: e.target.value })}
                    className="w-full h-10 border border-slate-355 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 bg-white"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 my-2" />

              {/* Contact and Reporting Group */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="10-digit number e.g. 9876543210"
                    value={newUser.phone}
                    maxLength={10}
                    onChange={(e) => setNewUser({ ...newUser, phone: normalizePhoneNumber(e.target.value) })}
                    className="w-full h-10 border border-slate-355 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Emergency Contact</label>
                  <input
                    type="tel"
                    placeholder="10-digit emergency contact"
                    value={newUser.emergency_contact}
                    maxLength={10}
                    onChange={(e) => setNewUser({ ...newUser, emergency_contact: normalizePhoneNumber(e.target.value) })}
                    className="w-full h-10 border border-slate-355 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Department</label>
                  <select
                    value={newUser.dept}
                    onChange={(e) => setNewUser({ ...newUser, dept: e.target.value })}
                    className="w-full h-10 border border-slate-355 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-blue-600 font-bold bg-white focus:ring-1 focus:ring-blue-100"
                  >
                    {deptOptions.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                {newUser.role !== 'System Admin' ? (
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Reporting Manager</label>
                    <select
                      value={newUser.reporting_manager_id || ''}
                      onChange={(e) => {
                        const selectedId = e.target.value
                        if (!selectedId) {
                          setNewUser({
                            ...newUser,
                            reporting_manager_id: '',
                            reporting_manager_name: '',
                            reporting_manager_email: '',
                          })
                        } else {
                          const mgr = users.find(u => String(u.id) === String(selectedId))
                          setNewUser({
                            ...newUser,
                            reporting_manager_id: selectedId,
                            reporting_manager_name: mgr?.name || '',
                            reporting_manager_email: mgr?.email || '',
                          })
                        }
                      }}
                      className="w-full h-10 border border-slate-355 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600 bg-white focus:ring-1 focus:ring-blue-100"
                    >
                      <option value="">-- No Reporting Manager Assigned --</option>
                      {potentialReportingManagers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.role})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-700 font-bold mb-1 opacity-50">Reporting Manager</label>
                    <input
                      type="text"
                      value="Not Applicable (System Admin)"
                      disabled
                      className="w-full h-10 border border-slate-200 bg-slate-100 rounded-xl px-3 text-slate-400 font-medium cursor-not-allowed"
                    />
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 my-2" />
              
              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider">Leave & Permission Allocation</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1 text-[10px]">Annual Leaves</label>
                    <input
                      type="number"
                      min={0}
                      value={newUser.annualLeaves || 12}
                      onChange={(e) => setNewUser({ ...newUser, annualLeaves: Number(e.target.value) })}
                      className="w-full h-10 border border-slate-355 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1 text-[10px]">Half-Day Slots</label>
                    <input
                      type="number"
                      min={0}
                      value={newUser.halfDayPermissions || 6}
                      onChange={(e) => setNewUser({ ...newUser, halfDayPermissions: Number(e.target.value) })}
                      className="w-full h-10 border border-slate-355 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1 text-[10px]">Short Perm (Hrs)</label>
                    <input
                      type="number"
                      min={0}
                      value={newUser.shortPermissions || 2}
                      onChange={(e) => setNewUser({ ...newUser, shortPermissions: Number(e.target.value) })}
                      className="w-full h-10 border border-slate-355 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 bg-white"
                    />
                  </div>
                </div>
              </div>



              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/10 cursor-pointer transition duration-150"
                >
                  Create Account & Generate Access Keys
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credentials Confirmation Modal */}
      {createdCredentialsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              Employee Credentials Created!
            </h3>
            <p className="text-xs text-slate-600">
              Share the following login credentials with <strong>{createdCredentialsModal.name}</strong> to access their {createdCredentialsModal.role} portal:
            </p>

            <div className="space-y-2 bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-bold text-slate-500">Access Email:</span>
                <span className="font-extrabold text-blue-700 flex items-center gap-1">
                  {createdCredentialsModal.email}
                  <button onClick={() => copyToClipboard(createdCredentialsModal.email, 'Email')} className="text-slate-400 hover:text-blue-600">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="font-bold text-slate-500">Access Password:</span>
                <span className="font-extrabold text-emerald-700 flex items-center gap-1 font-mono">
                  {createdCredentialsModal.accessPassword}
                  <button onClick={() => copyToClipboard(createdCredentialsModal.accessPassword, 'Password')} className="text-slate-400 hover:text-emerald-600">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </span>
              </div>
            </div>

            <button
              onClick={() => setCreatedCredentialsModal(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer"
            >
              Done & Close
            </button>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center justify-between">
              <span>Edit Employee Account</span>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer">
                ✕
              </button>
            </h3>
            <form onSubmit={handleSaveEditedUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Full Name</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Access Email Address</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Portal Access Password</label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editingUser.accessPassword || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, accessPassword: e.target.value })}
                    className="w-full h-10 border border-slate-300 rounded-xl pl-3 pr-10 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="10-digit number e.g. 9876543210"
                  value={editingUser.phone}
                  maxLength={10}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: normalizePhoneNumber(e.target.value) })}
                  className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Role</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => handleEditRoleChange(e.target.value)}
                    className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-blue-600"
                  >
                    <option value="Sales Manager">Sales Manager</option>
                    <option value="Team Lead">Team Lead</option>
                    <option value="Sales Executive">Sales Executive</option>
                    <option value="System Admin">System Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Department</label>
                  <select
                    value={editingUser.dept}
                    onChange={(e) => setEditingUser({ ...editingUser, dept: e.target.value })}
                    className="w-full h-10 border border-[#DCE3EF] rounded-xl px-3 text-slate-900 focus:outline-none focus:border-blue-600 font-bold bg-white focus:ring-1 focus:ring-blue-100"
                  >
                    {deptOptions.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(editingUser.role === 'Sales Manager' || editingUser.role === 'Sales Executive') && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Reporting Manager</label>
                  <select
                    value={editingUser.reporting_manager_id || ''}
                    onChange={(e) => {
                      const selectedId = e.target.value
                      if (!selectedId) {
                        setEditingUser({
                          ...editingUser,
                          reporting_manager_id: null,
                          reporting_manager_name: null,
                          reporting_manager_email: null,
                        })
                      } else {
                        const mgr = users.find(u => String(u.id) === String(selectedId))
                        setEditingUser({
                          ...editingUser,
                          reporting_manager_id: selectedId,
                          reporting_manager_name: mgr?.name || '',
                          reporting_manager_email: mgr?.email || '',
                        })
                      }
                    }}
                    className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                  >
                    <option value="">-- No Reporting Manager Assigned --</option>
                    {potentialReportingManagers
                      .filter(m => String(m.id) !== String(editingUser.id))
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.role})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="border-t border-slate-100 my-2" />
              
              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider">Leave & Permission Allocation</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1 text-[10px]">Annual Leaves</label>
                    <input
                      type="number"
                      min={0}
                      value={editingUser.annualLeaves || 12}
                      onChange={(e) => setEditingUser({ ...editingUser, annualLeaves: Number(e.target.value) })}
                      className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1 text-[10px]">Sick Leaves</label>
                    <input
                      type="number"
                      min={0}
                      value={editingUser.sickLeaves || 10}
                      onChange={(e) => setEditingUser({ ...editingUser, sickLeaves: Number(e.target.value) })}
                      className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1 text-[10px]">Other Leaves</label>
                    <input
                      type="number"
                      min={0}
                      value={editingUser.otherLeaves || 10}
                      onChange={(e) => setEditingUser({ ...editingUser, otherLeaves: Number(e.target.value) })}
                      className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1 text-[10px]">Half-Day Slots</label>
                    <input
                      type="number"
                      min={0}
                      value={editingUser.halfDayPermissions || 6}
                      onChange={(e) => setEditingUser({ ...editingUser, halfDayPermissions: Number(e.target.value) })}
                      className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1 text-[10px]">Short Perm (Hrs)</label>
                    <input
                      type="number"
                      min={0}
                      value={editingUser.shortPermissions || 2}
                      onChange={(e) => setEditingUser({ ...editingUser, shortPermissions: Number(e.target.value) })}
                      className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1 text-[10px]">Monthly Salary (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={editingUser.monthlySalary || 0}
                      onChange={(e) => setEditingUser({ ...editingUser, monthlySalary: Number(e.target.value) })}
                      className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600 bg-amber-50/55"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md mt-2 cursor-pointer"
              >
                Save Account & Password Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Show Credentials Inspection Modal */}
      {showCredentialsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" /> Portal Login Credentials
              </span>
              <button onClick={() => setShowCredentialsModal(null)} className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer">
                ✕
              </button>
            </h3>

            <div className="space-y-3 bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-bold text-slate-500">Employee Name:</span>
                <span className="font-extrabold text-slate-900">{showCredentialsModal.name}</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-bold text-slate-500">Access Email:</span>
                <span className="font-extrabold text-blue-700 flex items-center gap-1">
                  {showCredentialsModal.email}
                  <button onClick={() => copyToClipboard(showCredentialsModal.email, 'Email')} className="text-slate-400 hover:text-blue-600">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-500">Access Password:</span>
                <span className="font-extrabold text-emerald-700 flex items-center gap-1 font-mono">
                  {showCredentialsModal.accessPassword || 'TConnect2026#'}
                  <button onClick={() => copyToClipboard(showCredentialsModal.accessPassword || 'TConnect2026#', 'Password')} className="text-slate-400 hover:text-emerald-600">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowCredentialsModal(null)}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer"
            >
              Close Access Keys
            </button>
          </div>
        </div>
      )}

      {/* Assign Sales Executives to Sales Manager Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-emerald-600" /> Assign Sales Executives to Manager
                </h3>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                  Select a Sales Manager and check off the Sales Executives assigned to report to them.
                </p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAssignments} className="space-y-4 text-xs">
              {/* Select Sales Manager */}
              <div>
                <label className="block text-slate-800 font-extrabold mb-1.5">
                  1. Select Target Sales Manager <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedManagerId}
                  onChange={(e) => handleManagerSelect(e.target.value)}
                  className="w-full h-11 border border-slate-300 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-emerald-600 bg-slate-50"
                  required
                >
                  <option value="">-- Choose Sales Manager --</option>
                  {salesManagers.map((m) => (
                    <option key={m.id} value={m.id}>
                      👤 {m.name} ({m.email}) [{m.role}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Sales Executives Checklist */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-800 font-extrabold">
                    2. Select Assigned Sales Executives ({selectedExecIds.length} selected)
                  </label>
                  {salesExecutives.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedExecIds.length === salesExecutives.length) {
                          setSelectedExecIds([])
                        } else {
                          setSelectedExecIds(salesExecutives.map((e) => String(e.id)))
                        }
                      }}
                      className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer"
                    >
                      {selectedExecIds.length === salesExecutives.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1.5 bg-slate-50">
                  {salesExecutives.length === 0 ? (
                    <p className="text-slate-400 font-medium py-3 text-center">No Sales Executives available.</p>
                  ) : (
                    salesExecutives.map((exec) => {
                      const isChecked = selectedExecIds.includes(String(exec.id))
                      const currManager = exec.reporting_manager_name || 'Unassigned'
                      return (
                        <label
                          key={exec.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                            isChecked
                              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-xs'
                              : 'bg-white border-slate-200 hover:bg-slate-100/70 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleExecSelection(exec.id)}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-extrabold text-xs text-slate-900 truncate">{exec.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">{exec.email}</p>
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              currManager !== 'Unassigned'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {currManager !== 'Unassigned' ? `Reports to: ${currManager}` : 'Unassigned'}
                          </span>
                        </label>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning || !selectedManagerId}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {assigning ? 'Saving Assignment...' : 'Save Executive Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Single Executive to Manager Modal */}
      {showAssignToManagerModal && selectedUnassignedExec && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-[#123A8C]" /> Assign Executive
                </h3>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                  Select a Sales Manager to assign <strong>{selectedUnassignedExec.name}</strong> to.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAssignToManagerModal(false)
                  setSelectedUnassignedExec(null)
                }}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const val = document.getElementById('managerSelect').value
                if (val) {
                  handleAssignToManager(val)
                }
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-slate-800 font-extrabold mb-1.5">
                  Select Sales Manager
                </label>
                <select
                  id="managerSelect"
                  className="w-full h-11 border border-slate-300 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-[#123A8C] bg-slate-50"
                  required
                >
                  <option value="">-- Choose Manager --</option>
                  {hierarchyManagers.map((m) => (
                    <option key={m.id} value={m.id}>
                      👤 {m.name} ({m.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignToManagerModal(false)
                    setSelectedUnassignedExec(null)
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigningToManager}
                  className="px-5 py-2 bg-[#061A4D] hover:bg-[#123A8C] text-white font-extrabold rounded-xl text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {assigningToManager ? 'Assigning...' : 'Assign Manager'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Profile View Modal */}
      {selectedEmployeeProfile && (
        <EmployeeProfileModal
          employee={selectedEmployeeProfile}
          onClose={() => setSelectedEmployeeProfile(null)}
        />
      )}

      {/* Duplicate Face Error Modal */}
      {duplicateErrorUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-2xl space-y-5 max-w-sm w-full text-center relative animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500 border border-amber-100 animate-bounce">
              <AlertCircle className="w-6 h-6" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-base font-black text-slate-950">Face Already Registered</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                This face is already registered for:
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-1">
              <span className="block text-sm font-black text-slate-900">{duplicateErrorUser.name}</span>
              <span className="block text-[11px] font-mono font-bold text-slate-455">{duplicateErrorUser.code}</span>
            </div>

            <p className="text-[11px] text-slate-455 font-bold leading-normal">
              Please use the correct employee's face to continue enrollment.
            </p>

            <button
              onClick={() => {
                setDuplicateErrorUser(null)
                setLivenessStatus("PENDING")
                setEnrollFaceUrl(null)
              }}
              className="w-full py-2.5 px-4 rounded-full bg-slate-900 hover:bg-slate-950 text-white font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-md"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Enroll Face Biometrics Modal */}
      {showEnrollFaceModal && selectedEnrollUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-2xl space-y-6 max-w-md w-full relative">
            
            {/* Close Button */}
            <button 
              onClick={() => {
                if (isEnrolling) return
                setShowEnrollFaceModal(false)
                setSelectedEnrollUser(null)
                setEnrollFaceUrl(null)
                setDuplicateErrorUser(null)
                stopCamera()
              }} 
              disabled={isEnrolling}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 text-sm cursor-pointer font-bold p-1 hover:bg-slate-100 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ✕
            </button>

            <div className="text-center">
              <h2 className="text-sm font-black text-slate-900">Biometric Face Enrollment</h2>
              <span className="text-[10px] text-slate-455 font-bold block mt-1">Scan face to enroll employee biometrics.</span>
            </div>

            {/* Camera Section */}
            <div className="relative w-full aspect-[4/3] rounded-2xl bg-slate-950 overflow-hidden shadow-inner border border-slate-200 flex items-center justify-center">
              {cameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  
                  {/* Liveness HUD overlay */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-900/85 px-3.5 py-1 rounded-full text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg border border-slate-800 pointer-events-none select-none z-10">
                    <span>Liveness:</span>
                    <span className={`text-[10px] font-bold ${livenessStatus === "PASSED" ? "text-emerald-400" : "text-amber-400"}`}>
                      {livenessStatus}
                    </span>
                  </div>

                  {/* Face Guide oval frame */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className={`w-[180px] h-[240px] rounded-[50%] border-4 transition-all duration-300 shadow-[0_0_0_9999px_rgba(15,23,42,0.45)] ${
                      isFaceAligned ? "border-emerald-500" : "border-amber-500 animate-pulse"
                    }`} />
                  </div>

                  {/* Live instruction prompt */}
                  <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none z-10">
                    <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase shadow-lg border ${
                      isFaceAligned 
                        ? "bg-emerald-600/90 border-emerald-500 text-white animate-pulse" 
                        : "bg-amber-600/90 border-amber-500 text-white"
                    }`}>
                      {isFaceAligned 
                        ? (livenessStatus === "PASSED" ? "Liveness Passed — Ready to Enroll" : "Face Aligned — Click 'Verify Liveness'") 
                        : "Position face inside guide"}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-500 font-semibold text-xs">
                  <VideoOff size={32} />
                  <span>🔒 Biometrics Required</span>
                </div>
              )}
            </div>

            {/* Action Buttons Panel */}
            <div className="flex items-center gap-3.5 justify-center">
              {!cameraActive ? (
                <button
                  type="button"
                  onClick={startCamera}
                  disabled={isEnrolling}
                  className="py-2.5 px-5 rounded-full border border-slate-250 bg-slate-50 hover:bg-slate-100 text-xs font-black text-slate-700 transition cursor-pointer flex-1 text-center shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  📹 Start Camera
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopCamera}
                  disabled={isEnrolling}
                  className="py-2.5 px-5 rounded-full border border-slate-250 bg-slate-50 hover:bg-slate-100 text-xs font-black text-slate-700 transition cursor-pointer flex-1 text-center shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🚫 Stop Camera
                </button>
              )}

              {cameraActive && livenessStatus !== "PASSED" ? (
                <button
                  type="button"
                  onClick={handleVerifyLiveness}
                  disabled={isEnrolling || !isFaceAligned}
                  className="py-2.5 px-6 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider transition cursor-pointer flex-1 text-center shadow-md disabled:cursor-not-allowed"
                >
                  {isEnrolling ? "Verifying..." : "Verify Liveness"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleEnrollClick}
                  disabled={isEnrolling || !cameraActive || livenessStatus !== "PASSED"}
                  className="py-2.5 px-6 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider transition cursor-pointer flex-1 text-center shadow-md disabled:cursor-not-allowed"
                >
                  {isEnrolling ? "Enrolling..." : "Enroll"}
                </button>
              )}
            </div>

            {/* Bottom Status / Details Columns */}
            <div className="grid grid-cols-2 gap-3.5 text-left">
              {/* FACE STATUS Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Face Status</span>
                <div className="text-[11px] font-extrabold text-slate-800 leading-snug">
                  {isEnrolling ? (
                    <span className="text-blue-600 font-bold block animate-pulse">Processing...</span>
                  ) : enrollFaceUrl ? (
                    <span className="text-emerald-600 font-bold block animate-pulse">Enrolled successfully ✓</span>
                  ) : !cameraActive ? (
                    "Inactive — Turn on camera"
                  ) : livenessStatus === "PASSED" ? (
                    <span className="text-emerald-600">Liveness Checked — Click Enroll ✓</span>
                  ) : livenessStatus === "VERIFYING" && isFaceAligned ? (
                    <span className="text-blue-600 animate-pulse">Ready to verify liveness</span>
                  ) : (
                    "Position face inside oval guide"
                  )}
                </div>
              </div>

              {/* EMPLOYEE DETAILS Box */}
              <div className="bg-emerald-50/30 border border-emerald-100 rounded-2xl p-4 space-y-1">
                <span className="text-[9px] font-black text-emerald-800 uppercase tracking-wider block">Employee Details</span>
                <div className="text-[10px] font-extrabold text-emerald-950 leading-relaxed truncate">
                  <span className="block truncate">Name: {selectedEnrollUser.name}</span>
                  <span className="block font-mono">Code: {selectedEnrollUser.employee_code || selectedEnrollUser.employee_id}</span>
                  <span className="block truncate">Role: {selectedEnrollUser.role || selectedEnrollUser.dept}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
      {/* Reassign Reporting Manager Modal */}
      {showReassignModal && reassignUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Network className="w-5 h-5 text-blue-600" /> Reassign Reporting Manager
                </h3>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                  Change or transfer reporting manager for <span className="text-slate-900 font-extrabold">{reassignUser.name}</span>.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowReassignModal(false)
                  setReassignUser(null)
                }}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveReassignment} className="space-y-4 text-xs">
              {/* Employee Summary Card */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-500">Employee:</span>
                  <span className="font-extrabold text-slate-900">{reassignUser.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-500">Role:</span>
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${ROLE_BADGE_CLASSES[reassignUser.role] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                    {reassignUser.role}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-500">Current Manager:</span>
                  <span className="font-bold text-slate-800">
                    {reassignUser.reporting_manager_name ? `👤 ${reassignUser.reporting_manager_name}` : 'None (Unassigned)'}
                  </span>
                </div>
              </div>

              {/* Select New Reporting Manager */}
              <div>
                <label className="block text-slate-800 font-extrabold mb-1.5">
                  Select New Reporting Manager <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedNewManagerId}
                  onChange={(e) => setSelectedNewManagerId(e.target.value)}
                  className="w-full h-11 border border-slate-300 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-blue-600 bg-white"
                >
                  <option value="">-- No Reporting Manager (Unassign) --</option>
                  {potentialReportingManagers
                    .filter(m => String(m.id) !== String(reassignUser.id))
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        👤 {m.name} ({m.email}) [{m.role}]
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                  Once saved, reporting lines, live map tracking, and approvals will instantly route to the selected manager in Supabase.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowReassignModal(false)
                    setReassignUser(null)
                  }}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reassigning}
                  className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {reassigning ? 'Updating Supabase...' : 'Save & Reassign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement

// ── Password Reset Requests Panel (Admin Only) ──────────────────────────────

export function PasswordResetRequestsPanel() {
  const { showToast } = useToast()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [approveModal, setApproveModal] = useState(null) // { email, name }
  const [tempPassword, setTempPassword] = useState('')
  const [approving, setApproving] = useState(false)
  const [showTempPwd, setShowTempPwd] = useState(false)

  async function fetchRequests() {
    setLoading(true)
    try {
      const res = await userAPI.getPasswordResetRequests()
      setRequests(res?.data || [])
    } catch {
      showToast('Failed to load password reset requests.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRequests() }, [])

  async function handleApprove(e) {
    e.preventDefault()
    if (!tempPassword || tempPassword.length < 8) {
      showToast('Password must be at least 8 characters.', 'error')
      return
    }
    setApproving(true)
    try {
      await userAPI.approvePasswordReset(approveModal.email, tempPassword)
      showToast(`Password reset approved for ${approveModal.name}. Inform them via phone/chat.`, 'success')
      setApproveModal(null)
      setTempPassword('')
      fetchRequests()
    } catch (err) {
      showToast(err?.detail || err?.message || 'Failed to approve reset.', 'error')
    } finally {
      setApproving(false)
    }
  }

  async function handleReject(email, name) {
    if (!window.confirm(`Reject password reset request from ${name}?`)) return
    try {
      await userAPI.rejectPasswordReset(email)
      showToast(`Reset request from ${name} rejected.`, 'success')
      fetchRequests()
    } catch (err) {
      showToast(err?.detail || err?.message || 'Failed to reject.', 'error')
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Key size={16} className="text-amber-500" />
            Password Reset Requests
            {requests.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-black">
                {requests.length}
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Employees who have submitted forgot-password requests. Review and set a temporary password.</p>
        </div>
        <button onClick={fetchRequests} disabled={loading}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer disabled:opacity-50">
          {loading ? 'Loading...' : '↻ Refresh'}
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-10 text-slate-400 text-sm">Loading requests...</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-slate-200 bg-slate-50">
          <CheckCircle2 size={28} className="mx-auto text-emerald-400 mb-2" />
          <p className="text-sm font-bold text-slate-600">No pending password reset requests</p>
          <p className="text-xs text-slate-400 mt-1">Employees who forget their password will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.email} className="flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-extrabold text-slate-900">{req.employee_name}</span>
                  {req.employee_code && (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">{req.employee_code}</span>
                  )}
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-100 rounded px-1.5 py-0.5">⏳ Pending</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{req.email}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Role: {req.role} · Requested: {req.requested_at ? new Date(req.requested_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setApproveModal({ email: req.email, name: req.employee_name })}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow"
                >
                  <CheckCircle2 size={13} /> Approve
                </button>
                <button
                  onClick={() => handleReject(req.email, req.employee_name)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  <UserX size={13} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve Modal */}
      {approveModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200">
            <h3 className="text-lg font-extrabold text-slate-900 mb-1">Set Temporary Password</h3>
            <p className="text-xs text-slate-500 mb-5">
              Set a temporary password for <strong>{approveModal.name}</strong> ({approveModal.email}).
              Communicate this password to the employee directly via phone or chat.
            </p>

            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-700 mb-5">
              ⚠️ The employee will be forced to change this password on their next login.
            </div>

            <form onSubmit={handleApprove} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Temporary Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none" />
                  <input
                    type={showTempPwd ? 'text' : 'password'}
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-10 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition"
                    required
                    minLength={8}
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowTempPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                    {showTempPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setApproveModal(null); setTempPassword('') }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={approving}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1">
                  {approving ? 'Saving...' : <><CheckCircle2 size={13} /> Approve & Set Password</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
