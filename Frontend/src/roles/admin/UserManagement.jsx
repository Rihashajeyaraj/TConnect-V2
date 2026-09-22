import React, { useState, useEffect, useMemo, useCallback, useRef, Fragment } from 'react'
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
  ChevronLeft,
  ArrowRight,
  Sparkles,
  Briefcase,
  HeartPulse,
  Code2,
  AlertCircle,
  CreditCard,
  FileText,
  X,
  ChevronDown,
  ChevronUp,
  Filter,
  RotateCcw,
  Calendar,
} from 'lucide-react'
import { hrmsAPI, userAPI, settingsAPI, attendanceAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'
import { normalizePhoneNumber } from '../../utils/formatUtils.js'
import { formatDate } from '../../utils/dateUtils.js'
import { FaceLivenessEngine, LIVENESS_CHALLENGES } from '../sales/FaceLivenessEngine.js'

const getUserPhoto = (u) => {
  const p = u?.profile_photo || u?.avatar_url || u?.photo_url || u?.profile_photo_url || u?.avatar || u?.photo
  if (!p || typeof p !== 'string') return null
  const trimmed = p.trim()
  if (!trimmed || trimmed.includes('test_avatar') || trimmed.includes('example.com')) return null
  return trimmed
}

const EmployeeProfileModal = ({ employee, onClose }) => {
  const [previewDoc, setPreviewDoc] = useState(null);
  const [fullProfile, setFullProfile] = useState(employee || {});

  useEffect(() => {
    let isMounted = true;
    const empId = employee?.employee_id || employee?.id || employee?.auth_user_id;
    if (empId && (hrmsAPI.getEmployeeById || hrmsAPI.getEmployee)) {
      (hrmsAPI.getEmployeeById || hrmsAPI.getEmployee)(empId)
        .then(res => {
          if (isMounted && res && res.data) {
            setFullProfile(prev => ({ ...prev, ...res.data }));
          }
        })
        .catch(() => { });
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
            {getUserPhoto(empData) ? (
              <img
                src={getUserPhoto(empData)}
                alt="Profile"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
                className="w-full h-full object-cover"
              />
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

const MODULE_LABELS_BY_ROLE = {
  'Sales Executive': [
    { key: 'dashboard', label: '📊 Sales Dashboard' },
    { key: 'map', label: '🗺️ Live Client Map' },
    { key: 'attendance', label: '⏱️ Attendance & Punch' },
    { key: 'customers', label: '👥 Customers / Clients' },
    { key: 'leads', label: '🎯 Leads & Visits' },
    { key: 'expenses', label: '💵 Expense Claims' },
    { key: 'hrms', label: '📄 HRMS & Leaves' },
    { key: 'todo', label: '📝 Tasks & Todos' },
  ],
  'Team Lead': [
    { key: 'dashboard', label: '📊 Team Lead Dashboard' },
    { key: 'map', label: '🗺️ Team Smart Map' },
    { key: 'team', label: '👨‍💼 Team Management' },
    { key: 'leads', label: '🎯 Leads & Pipeline' },
    { key: 'visits', label: '📍 Team Visits Log' },
    { key: 'attendance', label: '⏱️ Attendance Approvals' },
    { key: 'expenses', label: '💵 Expense Approvals' },
    { key: 'hrms', label: '📄 Team Lead HRMS' },
  ],
  'Sales Manager': [
    { key: 'dashboard', label: '📊 Manager Dashboard' },
    { key: 'map', label: '🗺️ Manager Smart Map' },
    { key: 'team', label: '👨‍💼 Team Management' },
    { key: 'leads', label: '🎯 Team Leads & Pipeline' },
    { key: 'customers', label: '👥 Customer Accounts' },
    { key: 'visits', label: '📍 Team Visits' },
    { key: 'attendance', label: '⏱️ Attendance Approvals' },
    { key: 'followups', label: '📞 Follow-ups' },
    { key: 'opportunities', label: '💼 Deals & Opportunities' },
    { key: 'expenses', label: '💵 Expense Approvals' },
    { key: 'reports', label: '📈 Sales & HR Reports' },
    { key: 'notifications', label: '🔔 Notifications' },
    { key: 'leaderboard', label: '🏆 Leaderboard' },
    { key: 'calendar', label: '📅 Team Calendar' },
    { key: 'hrms', label: '📄 Manager HRMS' },
    { key: 'settings', label: '⚙️ Manager Settings' },
  ],
  'Super Admin': [
    { key: 'dashboard', label: '📊 System Dashboard' },
    { key: 'company', label: '🏢 Company Master Data' },
    { key: 'users', label: '👥 User Management' },
    { key: 'customers', label: '💼 Customer Accounts' },
    { key: 'roles', label: '🛡️ Role & Access Controls' },
    { key: 'hrms', label: '📄 System HRMS' },
    { key: 'reports', label: '📜 Audit Logs & Reports' },
    { key: 'notifications', label: '🔔 Notifications' },
    { key: 'settings', label: '⚙️ System Settings' },
  ],
  'CEO / Founder': [
    { key: 'dashboard', label: '📊 Executive Dashboard' },
    { key: 'customers', label: '👥 Customer Portfolio' },
    { key: 'team_management', label: '👨‍💼 Team Management' },
    { key: 'sales_revenue', label: '📈 Revenue & Sales Overview' },
    { key: 'hrms', label: '📄 Executive HRMS' },
    { key: 'reports', label: '📜 Executive Reports' },
    { key: 'notifications', label: '🔔 Notifications' },
    { key: 'settings', label: '⚙️ Executive Settings' },
    { key: 'expenses', label: '💵 Expense Management' },
  ]
}

const ACTION_KEYS = [
  { key: 'view', label: 'View', icon: '👀', color: 'blue' },
  { key: 'create_edit', label: 'Edit', icon: '✏️', color: 'indigo' },
  { key: 'approve', label: 'Approve', icon: '✅', color: 'emerald' },
  { key: 'assign', label: 'Assign', icon: '🔄', color: 'amber' },
  { key: 'delete', label: 'Delete', icon: '🗑️', color: 'rose' },
  { key: 'export', label: 'Export', icon: '📥', color: 'purple' },
]

const SUB_ACTION_ITEMS = {
  view: [
    { key: 'open_page', label: 'Open Page', desc: 'Allow user to open page route' },
    { key: 'view_cards', label: 'View Cards', desc: 'Display summary KPI cards' },
    { key: 'view_details', label: 'View Details', desc: 'Open full record detail views' },
  ],
  create_edit: [
    { key: 'create_records', label: 'Create Records', desc: 'Add new visits, leads, or claims' },
    { key: 'edit_records', label: 'Edit Fields', desc: 'Modify existing record information' },
    { key: 'update_status', label: 'Update Status', desc: 'Change lead stage or request status' },
  ],
  approve: [
    { key: 'approve_leaves', label: 'Leave Approvals', desc: 'Approve or reject leave requests' },
    { key: 'approve_expenses', label: 'Expense Approvals', desc: 'Approve or reject expense claims' },
    { key: 'approve_attendance', label: 'Attendance Approvals', desc: 'Validate check-in & punch logs' },
    { key: 'acknowledge_eod', label: 'EOD Acknowledgment', desc: 'Acknowledge end-of-day reports' },
  ],
  assign: [
    { key: 'assign_leads', label: 'Assign Leads', desc: 'Distribute leads to sales executives' },
    { key: 'assign_customers', label: 'Assign Customers', desc: 'Map customer accounts to reps' },
    { key: 'map_hierarchy', label: 'Map Hierarchy', desc: 'Assign reporting manager & TL' },
  ],
  delete: [
    { key: 'delete_leads', label: 'Delete Leads', desc: 'Remove lead/opportunity records' },
    { key: 'delete_customers', label: 'Delete Customers', desc: 'Remove customer accounts' },
    { key: 'delete_expenses', label: 'Delete Expenses', desc: 'Purge expense claim entries' },
    { key: 'delete_users', label: 'Delete Users', desc: 'Deactivate or delete user accounts' },
  ],
  export: [
    { key: 'export_excel', label: 'Export Excel (.xlsx)', desc: 'Download Excel spreadsheet' },
    { key: 'export_csv', label: 'Export CSV (.csv)', desc: 'Download CSV raw dataset' },
    { key: 'export_pdf', label: 'Export PDF Reports', desc: 'Generate printable PDF reports' },
  ],
}

function PermissionMatrixEditor({ role = 'Sales Executive', permissions = {}, onChange }) {
  const [selectedDept, setSelectedDept] = useState('ALL')
  const [activePopover, setActivePopover] = useState(null) // { modKey, actKey }

  const normRole = (role || '').toLowerCase().includes('ceo') ? 'CEO / Founder'
    : (role || '').toLowerCase().includes('admin') ? 'Super Admin'
      : (role || '').toLowerCase().includes('lead') ? 'Team Lead'
        : (role || '').toLowerCase().includes('manager') ? 'Sales Manager'
          : 'Sales Executive';

  const allModules = MODULE_LABELS_BY_ROLE[normRole] || MODULE_LABELS_BY_ROLE['Sales Executive'];

  const filteredModules = useMemo(() => {
    if (selectedDept === 'ALL') return allModules;
    return allModules.filter(m => {
      const k = m.key;
      if (selectedDept === 'sales') return ['dashboard', 'map', 'leads', 'customers', 'visits', 'opportunities', 'followups', 'sales_revenue', 'todo'].includes(k);
      if (selectedDept === 'hrms') return ['attendance', 'hrms', 'team', 'users', 'team_management'].includes(k);
      if (selectedDept === 'finance') return ['expenses', 'company', 'reports'].includes(k);
      if (selectedDept === 'ops') return ['map', 'visits', 'notifications', 'calendar', 'leaderboard'].includes(k);
      if (selectedDept === 'it') return ['roles', 'users', 'settings', 'reports', 'company'].includes(k);
      return true;
    });
  }, [allModules, selectedDept]);

  const handleToggleAction = (modKey, actKey) => {
    const currentMod = permissions[modKey] || {};
    const currentState = currentMod[actKey];
    const isCurrentlyActive = typeof currentState === 'boolean' ? currentState : (currentState?.enabled ?? (actKey === 'view'));

    const updatedMod = {
      ...currentMod,
      [actKey]: !isCurrentlyActive
    };

    onChange({
      ...permissions,
      [modKey]: updatedMod
    });
  };

  const handleToggleSubAction = (modKey, actKey, subKey) => {
    const currentMod = permissions[modKey] || {};
    const currentAct = currentMod[actKey];
    let subObj = typeof currentAct === 'object' && currentAct !== null ? { ...currentAct } : { enabled: true };

    subObj[subKey] = !Boolean(subObj[subKey] !== undefined ? subObj[subKey] : true);

    onChange({
      ...permissions,
      [modKey]: {
        ...currentMod,
        [actKey]: subObj
      }
    });
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 font-sans relative text-left">
      {/* Header with Department Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-2xs">🔐</span>
          <div>
            <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
              TwiteConnect Permission Matrix ({normRole})
            </h4>
            <p className="text-[10px] text-slate-500 font-semibold">Click any action pill to toggle or customize sub-actions.</p>
          </div>
        </div>

        {/* Department Filter Selector */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Dept:</label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-extrabold text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs cursor-pointer"
          >
            <option value="ALL">🏢 All Departments</option>
            <option value="sales">🎯 Sales & BD</option>
            <option value="hrms">👥 Human Resources (HR)</option>
            <option value="finance">💵 Finance & Accounts</option>
            <option value="ops">📍 Operations & Field Ops</option>
            <option value="it">⚙️ IT & System Admin</option>
          </select>
        </div>
      </div>

      {/* Pages & 6 Action Pills Grid */}
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {filteredModules.map((mod) => {
          const modPerm = permissions[mod.key] || {};

          return (
            <div key={mod.key} className="bg-white border border-slate-200/90 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2 min-w-[170px]">
                <span className="font-bold text-xs text-slate-900">{mod.label}</span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap relative">
                {ACTION_KEYS.map((act) => {
                  const actVal = modPerm[act.key];
                  const isActive = typeof actVal === 'boolean' ? actVal : (actVal?.enabled ?? (act.key === 'view'));
                  const isPopoverOpen = activePopover?.modKey === mod.key && activePopover?.actKey === act.key;
                  const subItems = SUB_ACTION_ITEMS[act.key] || [];

                  return (
                    <div key={act.key} className="relative">
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => handleToggleAction(mod.key, act.key)}
                          className={`px-2.5 py-1 rounded-l-lg text-[10px] font-extrabold transition cursor-pointer border-y border-l flex items-center gap-1 ${isActive
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                            }`}
                        >
                          <span>{act.icon}</span>
                          <span>{act.label}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (isPopoverOpen) {
                              setActivePopover(null);
                            } else {
                              setActivePopover({ modKey: mod.key, actKey: act.key });
                            }
                          }}
                          className={`px-1.5 py-1 rounded-r-lg text-[9px] font-black border transition cursor-pointer ${isActive
                              ? 'bg-blue-700 text-white border-blue-600 hover:bg-blue-800'
                              : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                            }`}
                          title="Customize sub-actions"
                        >
                          ▼
                        </button>
                      </div>

                      {/* Interactive Sub-Action Popover Checklist */}
                      {isPopoverOpen && (
                        <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-3 text-left space-y-2 animate-in fade-in zoom-in-95 duration-150">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                            <span className="font-extrabold text-[11px] text-slate-900 flex items-center gap-1">
                              {act.icon} {act.label} Sub-Actions
                            </span>
                            <button
                              type="button"
                              onClick={() => setActivePopover(null)}
                              className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>

                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {subItems.map((sub) => {
                              const subVal = typeof actVal === 'object' && actVal !== null && actVal[sub.key] !== undefined ? actVal[sub.key] : true;
                              return (
                                <label
                                  key={sub.key}
                                  className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-100 transition"
                                >
                                  <input
                                    type="checkbox"
                                    checked={Boolean(subVal)}
                                    onChange={() => handleToggleSubAction(mod.key, act.key, sub.key)}
                                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                  <div>
                                    <p className="font-bold text-[11px] text-slate-800 leading-tight">{sub.label}</p>
                                    <p className="text-[9px] text-slate-400 font-medium leading-tight">{sub.desc}</p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            onClick={() => setActivePopover(null)}
                            className="w-full py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold shadow-2xs hover:bg-blue-700 transition cursor-pointer"
                          >
                            Done
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ======================================================
// ThreeTierHierarchyView — Manager -> Team Lead -> Executive Drill-Down
// ======================================================
function ThreeTierHierarchyView({
  users,
  searchQuery = '',
  isProtectedRole,
  ROLE_BADGE_CLASSES,
  toggleUserStatus,
  handleOpenEditModal,
  handleDeleteUser,
  handleOpenReassignModal,
  setSelectedEnrollUser,
  setShowEnrollFaceModal,
  setSelectedEmployeeProfile,
}) {
  const [expandedManagers, setExpandedManagers] = useState([])
  const [expandedTeamLeads, setExpandedTeamLeads] = useState([])

  const matchesReportingManager = (child, parent) => {
    if (!child || !parent) return false
    const pId = String(parent.id || '').toLowerCase()
    const pCode = String(parent.employee_code || parent.employee_id || '').toLowerCase()
    const pEmail = String(parent.email || '').toLowerCase()

    const cRepId = String(child.reporting_manager_id || child.reporting_manager || '').toLowerCase()
    const cRepEmail = String(child.reporting_manager_email || '').toLowerCase()
    const cRepName = String(child.reporting_manager_name || '').toLowerCase()

    if (cRepId && (cRepId === pId || cRepId === pCode)) return true
    if (cRepEmail && cRepEmail === pEmail) return true
    if (cRepName && pEmail && cRepName.includes(pEmail)) return true
    if (cRepName && parent.name && cRepName.toLowerCase() === parent.name.toLowerCase()) return true
    return false
  }

  const isTopAdminOrCeoRole = (roleStr) => {
    const r = (roleStr || '').toLowerCase().trim()
    return r.includes('ceo') || r.includes('founder') || r.includes('admin')
  }

  const isManagerRole = (roleStr) => {
    const r = (roleStr || '').toLowerCase().trim()
    if (isTopAdminOrCeoRole(r)) return false
    return r.includes('manager')
  }

  const isTeamLeadRole = (roleStr) => {
    const r = (roleStr || '').toLowerCase().trim()
    if (isTopAdminOrCeoRole(r)) return false
    if (r.includes('manager')) return false
    return r.includes('lead')
  }

  // Pre-indexed O(1) Reporting Map for instant tree rendering without O(N^2) scans
  const { managers, reportingMap } = useMemo(() => {
    const rMap = new Map()
    const mgrs = []

    const addReport = (key, child) => {
      if (!key) return
      const k = String(key).toLowerCase().trim()
      if (!rMap.has(k)) rMap.set(k, [])
      rMap.get(k).push(child)
    }

    users.forEach((u) => {
      if (isManagerRole(u.role)) {
        mgrs.push(u)
      }
      if (u.reporting_manager_id) addReport(u.reporting_manager_id, u)
      if (u.reporting_manager_email) addReport(u.reporting_manager_email, u)
      if (u.reporting_manager_name) addReport(u.reporting_manager_name, u)
    })

    const sortedMgrs = mgrs.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    return { managers: sortedMgrs, reportingMap: rMap }
  }, [users])

  // Fast O(1) subordinate lookup for any manager
  const getSubordinates = useCallback((mgr) => {
    const keys = [
      mgr.id,
      mgr.employee_code,
      mgr.employee_id,
      mgr.email,
      mgr.name
    ].filter(Boolean).map(k => String(k).toLowerCase().trim())

    const seen = new Set()
    const result = []
    keys.forEach(k => {
      const children = reportingMap.get(k) || []
      children.forEach(c => {
        if (c.id !== mgr.id && !seen.has(c.id)) {
          seen.add(c.id)
          result.push(c)
        }
      })
    })
    return result
  }, [reportingMap])

  const toggleManager = (mId) => {
    setExpandedManagers((prev) =>
      prev.includes(mId) ? prev.filter((id) => id !== mId) : [...prev, mId]
    )
  }

  const toggleTeamLead = (tlId) => {
    setExpandedTeamLeads((prev) =>
      prev.includes(tlId) ? prev.filter((id) => id !== tlId) : [...prev, tlId]
    )
  }

  const expandAll = () => {
    setExpandedManagers(managers.map((m) => m.id))
    const allTLs = users.filter((u) => (u.role || '').toLowerCase().includes('lead')).map((u) => u.id)
    setExpandedTeamLeads(allTLs)
  }

  const collapseAll = () => {
    setExpandedManagers([])
    setExpandedTeamLeads([])
  }

  const q = (searchQuery || '').toLowerCase().trim()

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Top Header / Expand-Collapse Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="p-2 bg-blue-100 text-blue-700 rounded-xl font-bold">🏢</span>
          <div>
            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Team View</h4>
            <p className="text-[10px] text-slate-500 font-semibold">Sales Manager ➔ Team Lead ➔ Sales Executive</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-[11px] font-extrabold transition cursor-pointer flex items-center gap-1 shadow-2xs"
          >
            <ChevronDown className="w-3.5 h-3.5" /> Expand All
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-[11px] font-extrabold transition cursor-pointer flex items-center gap-1 shadow-2xs"
          >
            <ChevronUp className="w-3.5 h-3.5" /> Collapse All
          </button>
        </div>
      </div>

      {/* Managers Grid / List */}
      <div className="space-y-3">
        {managers.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 font-semibold">
            No Sales Managers found in system database.
          </div>
        ) : (
          managers.map((mgr) => {
            const isMgrExpanded = expandedManagers.includes(mgr.id) || !!q

            // Fast O(1) indexed subordinates lookup for Manager
            const subordinates = getSubordinates(mgr)
            const teamLeads = subordinates.filter((u) => isTeamLeadRole(u.role))
            const directExecs = subordinates.filter((u) => {
              const r = (u.role || '').toLowerCase()
              return !isTopAdminOrCeoRole(r) && !isManagerRole(r) && !isTeamLeadRole(r)
            })

            const initials = (mgr.name || 'M').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

            if (q) {
              const mgrMatches = (mgr.name || '').toLowerCase().includes(q) || (mgr.email || '').toLowerCase().includes(q)
              const anyChildMatches = teamLeads.some((tl) => (tl.name || '').toLowerCase().includes(q) || (tl.email || '').toLowerCase().includes(q)) ||
                directExecs.some((e) => (e.name || '').toLowerCase().includes(q) || (e.email || '').toLowerCase().includes(q))
              if (!mgrMatches && !anyChildMatches) return null
            }

            return (
              <div
                key={mgr.id}
                className={`rounded-2xl transition-all shadow-xs overflow-hidden ${isMgrExpanded ? 'bg-blue-50/70 border border-blue-300 ring-2 ring-blue-500/20' : 'bg-blue-50/40 border border-blue-200/80 hover:border-blue-300 hover:shadow-sm'
                  }`}
              >
                {/* TIER 1: Manager Row (Blue Theme) */}
                <div className="p-4 bg-gradient-to-r from-blue-100/70 via-blue-50/40 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-200/60">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-10 h-10 shrink-0">
                      {getUserPhoto(mgr) && (
                        <img
                          src={getUserPhoto(mgr)}
                          alt={mgr.name}
                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                          className="w-10 h-10 rounded-xl object-cover border border-white shadow-xs absolute inset-0 z-10"
                        />
                      )}
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center border border-white shadow-xs">
                        {initials}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-2xs">
                          👔 {mgr.role || 'Sales Manager'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${mgr.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                          {mgr.status || 'Active'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">({mgr.employee_code || mgr.employee_id || 'ID'})</span>
                      </div>
                      <h3 className="font-extrabold text-sm text-blue-950 leading-tight mt-0.5 truncate">{mgr.name}</h3>
                      <p className="text-[11px] text-blue-700/80 font-medium truncate">{mgr.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                    <span className="text-[11px] font-extrabold text-blue-800 bg-blue-100/80 px-3 py-1 rounded-xl border border-blue-200/80">
                      {teamLeads.length} Team Lead{teamLeads.length === 1 ? '' : 's'} · {directExecs.length} Exec{directExecs.length === 1 ? '' : 's'}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleManager(mgr.id)}
                      className={`px-3.5 py-1.5 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${isMgrExpanded
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-100'
                        }`}
                    >
                      <span>{isMgrExpanded ? 'Hide Team Leads' : 'View Team Leads'}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isMgrExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* TIER 2 & TIER 3 CONTAINER */}
                {isMgrExpanded && (
                  <div className="p-4 bg-white/60 space-y-3.5 border-t border-blue-200/60 animate-in fade-in zoom-in-95 duration-150">

                    {/* Team Leads List & Team Lead (Assign) Placeholder */}
                    {teamLeads.length === 0 && directExecs.length === 0 ? (
                      <div className="rounded-xl p-3.5 bg-purple-50/40 border-2 border-dashed border-purple-300 text-center space-y-2">
                        <div className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                          🔰 Team Lead (Assign)
                        </div>
                        <p className="text-xs text-purple-700 font-semibold">
                          No Team Leads or Sales Executives assigned to {mgr.name} yet.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Render Assigned Team Leads (Tier 2 - Purple Theme) */}
                        {teamLeads.map((tl) => {
                          const isTLExpanded = expandedTeamLeads.includes(tl.id) || !!q

                          // Fast O(1) Executives under this Team Lead (Tier 3)
                          const execsUnderTL = getSubordinates(tl).filter((u) => {
                            const r = (u.role || '').toLowerCase()
                            return !isTopAdminOrCeoRole(r) && !isManagerRole(r) && !isTeamLeadRole(r)
                          })

                          const tlInitials = (tl.name || 'TL').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

                          return (
                            <div
                              key={tl.id}
                              className={`rounded-xl p-3.5 space-y-3 transition-all shadow-2xs ${isTLExpanded ? 'bg-purple-50/80 border border-purple-300 ring-2 ring-purple-500/20' : 'bg-purple-50/50 border border-purple-200/80 hover:border-purple-300'
                                }`}
                            >
                              {/* Team Lead Card Row Header (Purple Theme) */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="relative w-8 h-8 shrink-0">
                                    {getUserPhoto(tl) && (
                                      <img
                                        src={getUserPhoto(tl)}
                                        alt={tl.name}
                                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                                        className="w-8 h-8 rounded-lg object-cover border border-purple-100 shadow-xs absolute inset-0 z-10"
                                      />
                                    )}
                                    <div className="w-8 h-8 rounded-lg bg-purple-600 text-white font-extrabold text-[11px] flex items-center justify-center">
                                      {tlInitials}
                                    </div>
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-600 text-white shadow-2xs">
                                        🔰 Team Lead
                                      </span>
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${tl.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                                        {tl.status || 'Active'}
                                      </span>
                                      <span className="text-[9px] font-mono text-purple-400">({tl.employee_code || tl.employee_id || 'ID'})</span>
                                    </div>
                                    <h4 className="font-extrabold text-xs text-purple-950 mt-0.5 truncate">{tl.name}</h4>
                                    <p className="text-[10px] text-purple-700/80 font-medium truncate">{tl.email}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                  <span className="text-[10px] font-bold text-purple-800 bg-purple-100/80 px-2.5 py-1 rounded-lg border border-purple-200/80">
                                    {execsUnderTL.length} Executive{execsUnderTL.length === 1 ? '' : 's'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => toggleTeamLead(tl.id)}
                                    className={`px-3 py-1 rounded-lg border text-[11px] font-extrabold flex items-center gap-1 transition cursor-pointer ${isTLExpanded
                                        ? 'bg-purple-600 text-white border-purple-600'
                                        : 'bg-white text-purple-700 border-purple-300 hover:bg-purple-100'
                                      }`}
                                  >
                                    <span>{isTLExpanded ? 'Hide Executives' : 'View Executives'}</span>
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isTLExpanded ? 'rotate-180' : ''}`} />
                                  </button>
                                </div>
                              </div>

                              {/* TIER 3: Sales Executives under Team Lead (Green Theme) */}
                              {isTLExpanded && (
                                <div className="pt-2 border-t border-purple-200/60 space-y-2 animate-in fade-in duration-150 pl-2 sm:pl-4 border-l-2 border-purple-300">
                                  <div className="text-[10px] font-black uppercase tracking-wider text-purple-700 flex items-center gap-1">
                                    <span>⚡ Direct Sales Executives under {tl.name} ({execsUnderTL.length})</span>
                                  </div>

                                  {execsUnderTL.length === 0 ? (
                                    <div className="p-3 text-center text-[11px] text-purple-400 font-medium bg-purple-50/30 rounded-lg border border-dashed border-purple-200">
                                      No Sales Executives assigned to {tl.name} yet.
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      {execsUnderTL.map((exec) => {
                                        const execInitials = (exec.name || 'E').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                                        return (
                                          <div
                                            key={exec.id}
                                            className="p-2.5 bg-emerald-50/70 border border-emerald-200/80 hover:border-emerald-300 rounded-xl flex items-center justify-between gap-2.5 transition shadow-2xs"
                                          >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                              <div className="relative w-7 h-7 shrink-0">
                                                {getUserPhoto(exec) && (
                                                  <img
                                                    src={getUserPhoto(exec)}
                                                    alt={exec.name}
                                                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                                                    className="w-7 h-7 rounded-md object-cover border border-emerald-200 absolute inset-0 z-10"
                                                  />
                                                )}
                                                <div className="w-7 h-7 rounded-md bg-emerald-600 text-white font-extrabold text-[10px] flex items-center justify-center">
                                                  {execInitials}
                                                </div>
                                              </div>
                                              <div className="min-w-0">
                                                <p className="font-extrabold text-xs text-emerald-950 truncate">{exec.name}</p>
                                                <p className="text-[9px] text-emerald-700/80 truncate">{exec.email}</p>
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                              <button
                                                type="button"
                                                onClick={() => setSelectedEmployeeProfile && setSelectedEmployeeProfile(exec)}
                                                className="px-2 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[10px] font-bold cursor-pointer transition"
                                                title="View Profile"
                                              >
                                                Profile
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleOpenReassignModal && handleOpenReassignModal(exec)}
                                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 rounded-lg text-[10px] font-bold cursor-pointer transition shadow-2xs"
                                                title="Reassign Team Lead / Manager"
                                              >
                                                Reassign
                                              </button>
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}

                        {/* Render Team Lead (Assign) Card if Team Lead is not assigned yet OR if there are direct executives */}
                        {(teamLeads.length === 0 || directExecs.length > 0) && (
                          <div className="rounded-xl p-3.5 space-y-3 bg-purple-50/40 border-2 border-dashed border-purple-300 transition-all shadow-2xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-purple-100 border border-purple-300 text-purple-700 font-extrabold text-[11px] flex items-center justify-center">
                                  🔰
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-600 text-white shadow-2xs">
                                      Team Lead (Assign)
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold border bg-amber-50 text-amber-700 border-amber-200">
                                      {teamLeads.length === 0 ? 'Not Assigned Yet' : 'Unassigned to Team Lead'}
                                    </span>
                                  </div>
                                  <h4 className="font-extrabold text-xs text-purple-950 mt-0.5 truncate">
                                    {teamLeads.length === 0 ? `Team Lead not assigned under ${mgr.name}` : `Executives without Team Lead (${directExecs.length})`}
                                  </h4>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                <span className="text-[10px] font-bold text-purple-800 bg-purple-100/80 px-2.5 py-1 rounded-lg border border-purple-200/80">
                                  {directExecs.length} Exec{directExecs.length === 1 ? '' : 's'}
                                </span>
                              </div>
                            </div>

                            {/* Direct Executives under Team Lead (Assign) */}
                            {directExecs.length > 0 && (
                              <div className="pt-2 border-t border-purple-200/60 space-y-2 pl-2 sm:pl-4 border-l-2 border-purple-300">
                                <div className="text-[10px] font-black uppercase tracking-wider text-purple-700 flex items-center justify-between">
                                  <span>⚡ Sales Executives under {mgr.name} ({directExecs.length})</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {directExecs.map((exec) => {
                                    const execInitials = (exec.name || 'E').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                                    return (
                                      <div
                                        key={exec.id}
                                        className="p-2.5 bg-emerald-50/70 border border-emerald-200/80 hover:border-emerald-300 rounded-xl flex items-center justify-between gap-2.5 transition shadow-2xs"
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <div className="relative w-7 h-7 shrink-0">
                                            {getUserPhoto(exec) && (
                                              <img
                                                src={getUserPhoto(exec)}
                                                alt={exec.name}
                                                onError={(e) => { e.currentTarget.style.display = 'none' }}
                                                className="w-7 h-7 rounded-md object-cover border border-emerald-200 absolute inset-0 z-10"
                                              />
                                            )}
                                            <div className="w-7 h-7 rounded-md bg-emerald-600 text-white font-extrabold text-[10px] flex items-center justify-center">
                                              {execInitials}
                                            </div>
                                          </div>
                                          <div className="min-w-0">
                                            <p className="font-extrabold text-xs text-emerald-950 truncate">{exec.name}</p>
                                            <p className="text-[9px] text-emerald-700/80 truncate">{exec.email}</p>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => setSelectedEmployeeProfile && setSelectedEmployeeProfile(exec)}
                                            className="px-2 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[10px] font-bold cursor-pointer transition"
                                            title="View Profile"
                                          >
                                            Profile
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleOpenReassignModal && handleOpenReassignModal(exec)}
                                            className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white border border-purple-600 rounded-lg text-[10px] font-bold cursor-pointer transition shadow-2xs flex items-center gap-1"
                                            title="Assign Team Lead / Manager"
                                          >
                                            Assign TL
                                          </button>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ======================================================
// UserDirectoryTable — simple expandable row table with 10 rows per page pagination
// ======================================================
function UserDirectoryTable({
  filteredUsers, isProtectedRole, ROLE_BADGE_CLASSES,
  toggleUserStatus, handleOpenEditModal, handleDeleteUser,
  handleOpenReassignModal, setSelectedEnrollUser,
  setDuplicateErrorUser, setShowEnrollFaceModal,
  setSelectedEmployeeProfile, setShowCredentialsModal,
}) {
  const [expandedId, setExpandedId] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Reset page to 1 when filteredUsers composition or count changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filteredUsers.length, filteredUsers[0]?.id])

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages)

  const paginatedUsers = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * itemsPerPage
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredUsers, validCurrentPage])

  if (filteredUsers.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-14 text-center">
        <Users className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-extrabold text-slate-600">No accounts found</p>
        <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters</p>
      </div>
    )
  }

  const startRowIndex = (validCurrentPage - 1) * itemsPerPage + 1
  const endRowIndex = Math.min(validCurrentPage * itemsPerPage, filteredUsers.length)

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="overflow-x-auto overflow-y-auto max-h-[60vh] relative">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-xs shadow-2xs">
            <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
              <th className="sticky top-0 bg-slate-100 z-20 px-4 py-3">Emp ID</th>
              <th className="sticky top-0 bg-slate-100 z-20 px-4 py-3">Name</th>
              <th className="sticky top-0 bg-slate-100 z-20 px-4 py-3">Role</th>
              <th className="sticky top-0 bg-slate-100 z-20 px-4 py-3">Assignment</th>
              <th className="sticky top-0 bg-slate-100 z-20 px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.map((user) => {
              const isProtected = isProtectedRole(user.role)
              const isExpanded = expandedId === user.id
              const roleBadge = ROLE_BADGE_CLASSES[user.role] || 'bg-slate-100 text-slate-700 border-slate-200'
              const initials = (user.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
              const isAssigned = !!user.reporting_manager_name

              return (
                <Fragment key={user.id}>
                  {/* Main Row */}
                  <tr
                    key={user.id}
                    className={`border-b border-slate-100 hover:bg-slate-50/60 transition ${isExpanded ? 'bg-slate-50/60' : ''
                      }`}
                  >
                    {/* Emp ID */}
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500 font-semibold">
                      {user.employee_code || user.employee_id || '—'}
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="relative w-7 h-7 shrink-0">
                          {getUserPhoto(user) && (
                            <img
                              src={getUserPhoto(user)}
                              alt={user.name}
                              onError={(e) => { e.currentTarget.style.display = 'none' }}
                              className="w-7 h-7 rounded-lg object-cover border border-slate-200 absolute inset-0 z-10"
                            />
                          )}
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0B2545] to-[#1E88E5] text-white font-black text-[10px] flex items-center justify-center">
                            {initials}
                          </div>
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
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${isExpanded
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
                              <div className="relative w-8 h-8 shrink-0">
                                {getUserPhoto(user) && (
                                  <img
                                    src={getUserPhoto(user)}
                                    alt={user.name}
                                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                                    className="w-8 h-8 rounded-xl object-cover border border-slate-200 absolute inset-0 z-10"
                                  />
                                )}
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0B2545] to-[#1E88E5] text-white font-black text-[11px] flex items-center justify-center">
                                  {initials}
                                </div>
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
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-extrabold transition cursor-pointer ${user.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                } ${isProtected ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
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
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer Bar */}
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-slate-600">
        <div>
          Showing <span className="font-extrabold text-slate-900">{startRowIndex}</span> to{' '}
          <span className="font-extrabold text-slate-900">{endRowIndex}</span> of{' '}
          <span className="font-extrabold text-slate-900">{filteredUsers.length}</span> Total Employees
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={validCurrentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs cursor-pointer flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Previous
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                type="button"
                onClick={() => setCurrentPage(pg)}
                className={`w-7 h-7 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center justify-center ${pg === validCurrentPage
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
              >
                {pg}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={validCurrentPage === totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs cursor-pointer flex items-center gap-1"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function UserManagement() {
  const { showToast } = useToast()
  const location = useLocation()
  const searchInputRef = useRef(null)
  const [users, setUsers] = useState([])
  const [activeTab, setActiveTab] = useState('directory') // 'directory' | 'hierarchy' | 'password-resets'
  const [showDirectoryModal, setShowDirectoryModal] = useState(false)
  const [showUnassignedPoolModal, setShowUnassignedPoolModal] = useState(false)
  const [selectedHierarchyDept, setSelectedHierarchyDept] = useState('ALL')
  const [departmentsList, setDepartmentsList] = useState([])
  const [expandedManagerIds, setExpandedManagerIds] = useState([])

  const toggleExpandManager = (mgrId) => {
    setExpandedManagerIds(prev =>
      prev.includes(mgrId) ? prev.filter(id => id !== mgrId) : [...prev, mgrId]
    )
  }

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

  // Derive real active departments dynamically from Settings & User Records (no hardcoding)
  const realDepartments = useMemo(() => {
    const list = []
    const addedNames = new Set()

    if (Array.isArray(departmentsList)) {
      departmentsList.forEach((d) => {
        const name = typeof d === 'string' ? d.trim() : (d?.name || '').trim()
        if (name && !addedNames.has(name.toLowerCase())) {
          addedNames.add(name.toLowerCase())
          list.push(name)
        }
      })
    }

    users.forEach((u) => {
      const dName = (u.department || u.dept || '').trim()
      if (dName && !addedNames.has(dName.toLowerCase())) {
        addedNames.add(dName.toLowerCase())
        list.push(dName)
      }
    })

    return list
  }, [departmentsList, users])

  // Derive real active roles dynamically from User Records (including custom roles)
  const realRoles = useMemo(() => {
    const set = new Set()
    users.forEach((u) => {
      const r = (u.role || u.designation || '').trim()
      if (r) set.add(r)
    })
    return Array.from(set).sort()
  }, [users])

  const deptOptions = realDepartments.length > 0 ? realDepartments : ['General']

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState('ALL')
  const [directoryViewMode, setDirectoryViewMode] = useState('hierarchy') // 'hierarchy' | 'table'
  const [showAddModal, setShowAddModal] = useState(false)

  // Deactivated / Past Employee Accounts Filter States
  const [deactivatedSearchQuery, setDeactivatedSearchQuery] = useState('')
  const [deactivatedDeptFilter, setDeactivatedDeptFilter] = useState('ALL')
  const [deactivatedRoleFilter, setDeactivatedRoleFilter] = useState('ALL')
  const [deactivatedDatePreset, setDeactivatedDatePreset] = useState('ALL')
  const [deactivatedStartDate, setDeactivatedStartDate] = useState('')
  const [deactivatedEndDate, setDeactivatedEndDate] = useState('')

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
    reporting_team_lead_id: '',
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

  // Real-time face alignment loop for Admin Create Modal (throttled to ~5 FPS)
  useEffect(() => {
    let animId
    let lastAnalyzeTime = 0
    const analyzeFrame = (time) => {
      if (cameraActive && videoRef.current && canvasRef.current) {
        if (time - lastAnalyzeTime > 200) {
          lastAnalyzeTime = time
          const evalResult = engineRef.current.evaluateAlignment(videoRef.current, canvasRef.current)
          setIsFaceAligned(prev => prev !== evalResult.isAligned ? evalResult.isAligned : prev)
        }
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

  // Reassign Manager Modal State & Filters
  const [showReassignModal, setShowReassignModal] = useState(false)
  const [reassignUser, setReassignUser] = useState(null)
  const [selectedNewManagerId, setSelectedNewManagerId] = useState('')
  const [reassigning, setReassigning] = useState(false)
  const [reassignDeptFilter, setReassignDeptFilter] = useState('ALL')
  const [reassignRoleFilter, setReassignRoleFilter] = useState('ALL')
  const [reassignSearchQuery, setReassignSearchQuery] = useState('')

  // Assign Executive Modal Search & Filter States
  const [assignTargetRoleFilter, setAssignTargetRoleFilter] = useState('ALL')
  const [assignSearchQuery, setAssignSearchQuery] = useState('')
  const [assignDeptFilter, setAssignDeptFilter] = useState('ALL')
  const [assignRoleFilter, setAssignRoleFilter] = useState('ALL')
  const [assignStatusFilter, setAssignStatusFilter] = useState('ALL')

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

  // All Potential Target Leaders (Managers, Team Leads, CEOs, Admins)
  const assignableLeaders = useMemo(() => {
    return users.filter((u) => {
      const r = (u.role || '').toLowerCase()
      return r.includes('manager') || r.includes('admin') || r.includes('ceo') || r.includes('founder') || r.includes('team lead') || r.includes('tl') || r.includes('head')
    }).sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [users])

  const filteredAssignLeaders = useMemo(() => {
    return assignableLeaders.filter((m) => {
      if (assignTargetRoleFilter === 'ALL') return true
      const r = (m.role || '').toLowerCase()
      if (assignTargetRoleFilter === 'MANAGER') return r.includes('manager') && !r.includes('team lead') && !r.includes('tl')
      if (assignTargetRoleFilter === 'TEAM_LEAD') return r.includes('team lead') || r.includes('tl')
      if (assignTargetRoleFilter === 'ADMIN_CEO') return r.includes('admin') || r.includes('ceo') || r.includes('founder')
      return true
    })
  }, [assignableLeaders, assignTargetRoleFilter])

  // All Assignable Staff Members
  const assignableExecutives = useMemo(() => {
    return users.filter((u) => {
      if (selectedManagerId && String(u.id || u.employee_id) === String(selectedManagerId)) return false
      return true
    }).sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [users, selectedManagerId])

  const assignModalDeptOptions = useMemo(() => {
    const set = new Set()
    users.forEach((u) => {
      const d = (u.department || u.dept || '').trim()
      if (d) set.add(d)
    })
    return Array.from(set).sort()
  }, [users])

  const assignModalRoleOptions = useMemo(() => {
    const set = new Set()
    users.forEach((u) => {
      const r = (u.role || '').trim()
      if (r) set.add(r)
    })
    return Array.from(set).sort()
  }, [users])

  const filteredAssignExecutives = useMemo(() => {
    const selectedMgrObj = selectedManagerId ? users.find(u => String(u.id) === String(selectedManagerId) || String(u.employee_id) === String(selectedManagerId)) : null
    const selEmail = String(selectedMgrObj?.email || '').toLowerCase().trim()
    const selId = String(selectedManagerId).toLowerCase().trim()
    const selCode = String(selectedMgrObj?.employee_code || '').toLowerCase().trim()

    return assignableExecutives.filter((exec) => {
      // Search
      if (assignSearchQuery.trim()) {
        const q = assignSearchQuery.toLowerCase().trim()
        const name = (exec.name || '').toLowerCase()
        const email = (exec.email || '').toLowerCase()
        const code = (exec.employee_code || exec.employee_id || '').toLowerCase()
        if (!name.includes(q) && !email.includes(q) && !code.includes(q)) return false
      }

      // Department
      if (assignDeptFilter !== 'ALL') {
        const dept = (exec.department || exec.dept || '').toLowerCase().trim()
        if (dept !== assignDeptFilter.toLowerCase().trim()) return false
      }

      // Role
      if (assignRoleFilter !== 'ALL') {
        const role = (exec.role || exec.designation || '').toLowerCase().trim()
        if (role !== assignRoleFilter.toLowerCase().trim()) return false
      }

      // Assignment Status
      if (assignStatusFilter !== 'ALL') {
        const currMgrId = String(exec.reporting_manager_id || '').toLowerCase().trim()
        const currMgrEmail = String(exec.reporting_manager_email || '').toLowerCase().trim()
        const isUnassigned = !exec.reporting_manager_name || exec.reporting_manager_name === 'Unassigned' || (!currMgrId && !currMgrEmail)
        
        const isCurrentSelected = Boolean(selectedManagerId) && (
          (currMgrId && (currMgrId === selId || (selCode && currMgrId === selCode))) ||
          (currMgrEmail && selEmail && currMgrEmail === selEmail)
        )

        if (assignStatusFilter === 'UNASSIGNED') {
          if (!isUnassigned) return false
        } else if (assignStatusFilter === 'CURRENT_LEADER') {
          if (!isCurrentSelected) return false
        } else if (assignStatusFilter === 'OTHER_LEADER') {
          if (isUnassigned || isCurrentSelected) return false
        }
      }

      return true
    })
  }, [assignableExecutives, assignSearchQuery, assignDeptFilter, assignRoleFilter, assignStatusFilter, selectedManagerId, users])

  const handleToggleSelectAllFiltered = () => {
    const filteredIds = filteredAssignExecutives.map((e) => String(e.id))
    const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedExecIds.includes(id))

    if (allFilteredSelected) {
      setSelectedExecIds((prev) => prev.filter((id) => !filteredIds.includes(id)))
    } else {
      setSelectedExecIds((prev) => Array.from(new Set([...prev, ...filteredIds])))
    }
  }

  const handleOpenAssignModal = (initialManagerId = '') => {
    setAssignTargetRoleFilter('ALL')
    setAssignSearchQuery('')
    setAssignDeptFilter('ALL')
    setAssignRoleFilter('ALL')
    setAssignStatusFilter('ALL')
    if (initialManagerId) {
      handleManagerSelect(initialManagerId)
    } else {
      setSelectedManagerId('')
      setSelectedExecIds([])
    }
    setShowAssignModal(true)
  }

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

  // Filtered Potential Reporting Managers for Reassign Modal
  const filteredReassignManagers = useMemo(() => {
    return potentialReportingManagers.filter((m) => {
      // Don't list the employee being reassigned as their own manager
      if (reassignUser && String(m.id || m.employee_id) === String(reassignUser.id || reassignUser.employee_id)) {
        return false
      }

      // Department filter
      if (reassignDeptFilter !== 'ALL') {
        const mDept = (m.department || m.dept || 'Sales').toLowerCase().trim()
        const targetDept = reassignDeptFilter.toLowerCase().trim()
        if (mDept !== targetDept && !mDept.includes(targetDept)) {
          return false
        }
      }

      // Role filter
      if (reassignRoleFilter !== 'ALL') {
        const mRole = (m.role || '').toLowerCase().trim()
        if (reassignRoleFilter === 'TEAM_LEAD') {
          if (!mRole.includes('team lead') && !mRole.includes('tl')) return false
        } else if (reassignRoleFilter === 'MANAGER') {
          if (!mRole.includes('manager') || mRole.includes('team lead') || mRole.includes('tl')) return false
        } else if (reassignRoleFilter === 'ADMIN_CEO') {
          if (!mRole.includes('admin') && !mRole.includes('ceo') && !mRole.includes('founder')) return false
        }
      }

      // Search query
      if (reassignSearchQuery.trim()) {
        const q = reassignSearchQuery.toLowerCase().trim()
        const name = (m.name || '').toLowerCase()
        const email = (m.email || '').toLowerCase()
        const code = (m.employee_code || m.employee_id || '').toLowerCase()
        const dept = (m.department || m.dept || '').toLowerCase()
        const role = (m.role || '').toLowerCase()

        if (!name.includes(q) && !email.includes(q) && !code.includes(q) && !dept.includes(q) && !role.includes(q)) {
          return false
        }
      }

      return true
    })
  }, [potentialReportingManagers, reassignUser, reassignDeptFilter, reassignRoleFilter, reassignSearchQuery])

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
    setReassignDeptFilter('ALL')
    setReassignRoleFilter('ALL')
    setReassignSearchQuery('')
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
      } catch (err) { }

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
          } catch (e) { }
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
    } catch (e) { }
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
      newPassword: '',
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
    const isExec = (selectedRole || '').toLowerCase().includes('executive')
    setNewUser({
      ...newUser,
      role: selectedRole,
      ...extra,
      ...(isExec ? {} : { reporting_team_lead_id: '' })
    })
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

    const updatedUserObj = {
      ...editingUser,
    }
    if (editingUser.newPassword && editingUser.newPassword.trim().length > 0) {
      updatedUserObj.accessPassword = editingUser.newPassword.trim()
      updatedUserObj.password = editingUser.newPassword.trim()
    }
    delete updatedUserObj.newPassword

    setUsers((prev) =>
      prev.map((u) => (u.id === editingUser.id ? updatedUserObj : u))
    )
    setShowEditModal(false)

    try {
      const updatePayload = {
        name: editingUser.name,
        email: editingUser.email,
        phone: editingUser.phone,
        role: editingUser.role,
        dept: editingUser.dept,
        status: editingUser.status,
        reporting_manager_id: editingUser.reporting_manager_id || null,
        reporting_manager_name: editingUser.reporting_manager_name || null,
        reporting_manager_email: editingUser.reporting_manager_email || null,
        annual_leaves: Number(editingUser.annualLeaves || 12),
        half_day_permissions: Number(editingUser.halfDayPermissions || 6),
        short_permissions: Number(editingUser.shortPermissions || 2),
      }

      // ONLY send password to backend if Admin explicitly entered a new non-empty password!
      if (editingUser.newPassword && editingUser.newPassword.trim().length > 0) {
        updatePayload.password = editingUser.newPassword.trim()
        updatePayload.accessPassword = editingUser.newPassword.trim()
      }

      await userAPI.updateUser(editingUser.id, updatePayload)

      // Update leaves directly in hrms.employees
      await hrmsAPI.updateEmployee(editingUser.employee_id || editingUser.id, {
        annual_leaves: Number(editingUser.annualLeaves || 12),
        sick_leaves: Number(editingUser.sickLeaves || 10),
        other_leaves: Number(editingUser.otherLeaves || 10),
        half_day_permissions: Number(editingUser.halfDayPermissions || 6),
        short_permissions: Number(editingUser.shortPermissions || 2),
      })

      if (editingUser.email) {
        localStorage.setItem(`tc_leaves_${editingUser.email.toLowerCase().trim()}`, JSON.stringify({
          annualLeaves: Number(editingUser.annualLeaves || 12),
          sickLeaves: Number(editingUser.sickLeaves || 10),
          otherLeaves: Number(editingUser.otherLeaves || 10),
          halfDayPermissions: Number(editingUser.halfDayPermissions || 6),
          shortPermissions: Number(editingUser.shortPermissions || 2),
        }))
      }

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

    // Determine hierarchy assignment
    let targetRepId = null
    let targetRepName = null
    let targetRepEmail = null

    if (newUser.reporting_team_lead_id) {
      const tl = users.find(u => String(u.id) === String(newUser.reporting_team_lead_id) || String(u.employee_code) === String(newUser.reporting_team_lead_id))
      if (tl) {
        targetRepId = tl.id || tl.employee_code
        targetRepName = tl.name
        targetRepEmail = tl.email
      }
    } else if (newUser.reporting_manager_id) {
      const mgr = users.find(u => String(u.id) === String(newUser.reporting_manager_id) || String(u.employee_code) === String(newUser.reporting_manager_id))
      if (mgr) {
        targetRepId = mgr.id || mgr.employee_code
        targetRepName = mgr.name
        targetRepEmail = mgr.email
      }
    }

    const created = {
      id: `usr_${Date.now()}`,
      first_name: newUser.first_name || fullName.split(' ')[0],
      last_name: newUser.last_name || fullName.split(' ').slice(1).join(' '),
      name: fullName,
      gender: newUser.gender || 'Male',
      date_of_birth: newUser.date_of_birth,
      email: newUser.email,
      phone: normalizePhoneNumber(newUser.phone) || '9999999999',
      emergency_contact: normalizePhoneNumber(newUser.emergency_contact) || '9999999999',
      role: newUser.role,
      dept: newUser.dept,
      status: newUser.status,
      lastLogin: 'Just now',
      accessPassword: newUser.password,
      reporting_manager_id: targetRepId,
      reporting_manager_name: targetRepName,
      reporting_manager_email: targetRepEmail,
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
      reporting_team_lead_id: '',
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
        reporting_manager_id: targetRepId,
        reporting_manager_name: targetRepName,
        reporting_manager_email: targetRepEmail,
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

  // Filter Users List & Sort Alphabetically by Name
  const filteredUsers = useMemo(() => {
    const deptFilter = (selectedHierarchyDept || 'ALL').toLowerCase().trim()
    return users
      .filter((u) => {
        const q = (searchQuery || '').toLowerCase().trim()
        const matchesSearch =
          !q ||
          (u.name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.dept || u.department || '').toLowerCase().includes(q) ||
          (u.employee_code || u.employee_id || '').toLowerCase().includes(q)

        const matchesRole = selectedRole === 'ALL' || u.role === selectedRole
        const matchesStatus = selectedStatus === 'ALL' || u.status === selectedStatus
        const matchesDept = selectedHierarchyDept === 'ALL' || (u.department || u.dept || '').toLowerCase().includes(deptFilter)

        return matchesSearch && matchesRole && matchesStatus && matchesDept
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [users, searchQuery, selectedRole, selectedStatus, selectedHierarchyDept])

  // Pre-indexed Department User Counts for O(1) Department Cards rendering
  const deptCounts = useMemo(() => {
    const map = {}
    users.forEach((u) => {
      const uDept = (u.department || u.dept || '').toLowerCase().trim()
      if (uDept) {
        map[uDept] = (map[uDept] || 0) + 1
      }
    })
    return map
  }, [users])

  // Single-pass Role & Status Statistics
  const { activeCount, inactiveCount, salesManagersCount, executivesCount } = useMemo(() => {
    let active = 0
    let inactive = 0
    let managers = 0
    let execs = 0

    users.forEach((u) => {
      const status = u.status || 'Active'
      if (status === 'Active') active++
      else if (status === 'Inactive') inactive++

      const role = (u.role || '').toLowerCase()
      if (role.includes('manager') || role.includes('lead')) managers++
      else if (role.includes('executive') || role.includes('sales')) execs++
    })

    return {
      activeCount: active,
      inactiveCount: inactive,
      salesManagersCount: managers,
      executivesCount: execs,
    }
  }, [users])

  // Date parsing helper
  const parseDateToYYYYMMDD = (rawDate) => {
    if (!rawDate) return ''
    const str = String(rawDate).trim()
    if (!str || str === '—' || str === 'N/A' || str === 'null' || str === 'undefined') return ''
    const isoPart = str.split('T')[0].split(' ')[0]
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoPart)) {
      return isoPart
    }
    if (str.includes('/')) {
      const parts = str.split('/')
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
        } else if (parts[0].length === 4) {
          return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
        }
      }
    }
    const dObj = new Date(str)
    if (!isNaN(dObj.getTime())) {
      return dObj.toISOString().split('T')[0]
    }
    return ''
  }

  // Deactivated Users Filtering & Memos
  const deactivatedUsersList = useMemo(() => {
    return users.filter(u => u.status === 'Inactive' || u.status === 'Deactivated' || u.is_active === false)
  }, [users])

  const filteredDeactivatedUsers = useMemo(() => {
    return deactivatedUsersList.filter(u => {
      // 1. Search Query
      if (deactivatedSearchQuery.trim()) {
        const q = deactivatedSearchQuery.toLowerCase().trim()
        const name = (u.name || u.full_name || `${u.first_name || ''} ${u.last_name || ''}`).toLowerCase()
        const email = (u.email || '').toLowerCase()
        const code = (u.employee_code || u.code || '').toLowerCase()
        const phone = (u.phone || u.phone_number || '').toLowerCase()
        if (!name.includes(q) && !email.includes(q) && !code.includes(q) && !phone.includes(q)) {
          return false
        }
      }

      // 2. Department Filter
      if (deactivatedDeptFilter !== 'ALL') {
        const d = (u.department || u.work_department || u.dept || '').toLowerCase().trim()
        const target = deactivatedDeptFilter.toLowerCase().trim()
        if (d !== target && !d.includes(target) && !target.includes(d)) {
          return false
        }
      }

      // 3. Designation / Role Filter
      if (deactivatedRoleFilter !== 'ALL') {
        const r = (u.role || u.designation || '').toLowerCase().trim()
        const target = deactivatedRoleFilter.toLowerCase().trim()
        if (target === 'sales_executive' && !r.includes('executive')) return false
        if (target === 'team_lead' && (!r.includes('lead') && !r.includes('tl'))) return false
        if (target === 'manager' && (!r.includes('manager') || r.includes('lead'))) return false
        if (target !== 'sales_executive' && target !== 'team_lead' && target !== 'manager') {
          if (r !== target && !r.includes(target)) return false
        }
      }

      // 4. Date Filter
      if (deactivatedDatePreset !== 'ALL' || deactivatedStartDate || deactivatedEndDate) {
        const dateRaw = u.updated_at || u.deactivated_at || u.created_at || u.doj || ''
        const dateStr = parseDateToYYYYMMDD(dateRaw)
        if (dateStr) {
          if (deactivatedStartDate && dateStr < deactivatedStartDate) return false
          if (deactivatedEndDate && dateStr > deactivatedEndDate) return false
        }
      }

      return true
    })
  }, [deactivatedUsersList, deactivatedSearchQuery, deactivatedDeptFilter, deactivatedRoleFilter, deactivatedDatePreset, deactivatedStartDate, deactivatedEndDate])

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
            onClick={() => setActiveTab(activeTab === 'deactivated' ? 'directory' : 'deactivated')}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer ${activeTab === 'deactivated'
                ? 'bg-rose-700 text-white ring-2 ring-rose-300'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
          >
            <UserX className="w-4 h-4 text-rose-100" />
            <span>Deactivated Accounts ({deactivatedUsersList.length})</span>
          </button>
          <button
            onClick={() => handleOpenAssignModal()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <UserCheck className="w-4 h-4" /> Assign Sales Executives & Staff
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create New Employee Account
          </button>
        </div>
      </div>

      {/* Quick KPI Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Total Users */}
        <button
          type="button"
          onClick={() => setActiveTab('directory')}
          className={`p-4 rounded-2xl border transition-all text-left flex items-center gap-3.5 cursor-pointer shadow-2xs ${activeTab === 'directory'
              ? 'bg-blue-50/50 border-blue-300 ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-xs'
            }`}
        >
          <div className="p-3 bg-blue-100/80 text-blue-700 rounded-xl border border-blue-200">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Accounts</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{users.length}</p>
          </div>
        </button>

        {/* Card 2: Active Accounts */}
        <button
          type="button"
          onClick={() => {
            setSelectedStatus('Active')
            setActiveTab('directory')
          }}
          className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all text-left flex items-center gap-3.5 cursor-pointer shadow-2xs hover:shadow-xs"
        >
          <div className="p-3 bg-emerald-100/80 text-emerald-700 rounded-xl border border-emerald-200">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Active Employees</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{activeCount}</p>
          </div>
        </button>

        {/* Card 3: Team View */}
        <button
          type="button"
          onClick={() => setActiveTab('hierarchy')}
          className={`p-4 rounded-2xl border transition-all text-left flex items-center gap-3.5 cursor-pointer shadow-2xs ${activeTab === 'hierarchy'
              ? 'bg-indigo-50/50 border-indigo-300 ring-2 ring-indigo-500/20'
              : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs'
            }`}
        >
          <div className="p-3 bg-indigo-100/80 text-indigo-700 rounded-xl border border-indigo-200">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Team Hierarchy</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{hierarchyManagers.length} Managers</p>
          </div>
        </button>

        {/* Card 4: Unassigned Pool */}
        <button
          type="button"
          onClick={() => setShowUnassignedPoolModal(true)}
          className="p-4 bg-gradient-to-br from-amber-50 to-orange-50/40 rounded-2xl border border-amber-200 hover:border-amber-400 transition-all text-left flex items-center gap-3.5 cursor-pointer shadow-2xs hover:shadow-xs"
        >
          <div className="p-3 bg-amber-100 text-amber-800 rounded-xl border border-amber-200">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider">Unassigned Pool</p>
            <p className="text-2xl font-black text-amber-950 mt-0.5">{unassignedExecutives.length} Execs ↗</p>
          </div>
        </button>
      </div>

      {/* Main Tab Navigation Bar */}
      <div className="bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'directory'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-transparent text-slate-600 hover:bg-slate-200/60'
              }`}
          >
            <Users className="w-4 h-4" />
            <span>📋 All Employees Directory</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hierarchy')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'hierarchy'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-transparent text-slate-600 hover:bg-slate-200/60'
              }`}
          >
            <Network className="w-4 h-4" />
            <span>🏢 Team View</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('password-resets')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'password-resets'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-transparent text-slate-600 hover:bg-slate-200/60'
              }`}
          >
            <Key className="w-4 h-4" />
            <span>🔑 Password Reset Requests</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('deactivated')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'deactivated'
                ? 'bg-rose-700 text-white shadow-sm'
                : 'bg-transparent text-slate-600 hover:bg-slate-200/60'
              }`}
          >
            <UserX className="w-4 h-4" />
            <span>🚫 Deactivated Accounts ({deactivatedUsersList.length})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowDirectoryModal(true)}
          className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs flex items-center gap-1.5"
        >
          <span>↗ Open Fullscreen View</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: ALL EMPLOYEES DIRECTORY (MAIN PAGE TABLE VIEW)    */}
      {/* ======================================================== */}
      {activeTab === 'directory' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Search & Multi-Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, employee ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-semibold transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap justify-end">
              {/* Department Selector */}
              <select
                value={selectedHierarchyDept}
                onChange={(e) => setSelectedHierarchyDept(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Departments</option>
                {realDepartments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              {/* Role Selector */}
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Roles</option>
                {realRoles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              {/* Status Selector */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>

              {/* Reset Filters */}
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedRole('ALL')
                  setSelectedStatus('ALL')
                  setSelectedHierarchyDept('ALL')
                }}
                className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Results Summary Bar */}
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
            <span>Showing {filteredUsers.length} of {users.length} Total Employees</span>
          </div>

          {/* Inline Employee Table */}
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
      )}

      {/* ======================================================== */}
      {/* TAB 2: TEAM VIEW (ORGANIZATION TREE / HIERARCHY)         */}
      {/* ======================================================== */}
      {activeTab === 'hierarchy' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Department Cards Bar */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-[#123A8C]" />
                <h3 className="font-extrabold text-sm text-[#071A45]">Department Team View Filter</h3>
              </div>
            </div>

            {/* Department Cards Grid (Dynamic Real Data Only) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {realDepartments.map((deptName) => {
                const targetLower = deptName.toLowerCase().trim()
                let count = deptCounts[targetLower] || 0
                if (!count) {
                  Object.keys(deptCounts).forEach((key) => {
                    if (key.includes(targetLower) || targetLower.includes(key)) {
                      count += deptCounts[key]
                    }
                  })
                }
                const isSelected = selectedHierarchyDept.toLowerCase().trim() === targetLower

                return (
                  <button
                    key={deptName}
                    type="button"
                    onClick={() => setSelectedHierarchyDept(isSelected ? 'ALL' : deptName)}
                    className={`p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer group shadow-xs ${isSelected
                        ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-transparent ring-2 ring-blue-500/30 shadow-md scale-[1.02]'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-400 hover:shadow-sm'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-xl border ${isSelected ? 'bg-white/10 border-white/20 text-white' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}>
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {count} {count === 1 ? 'User' : 'Users'}
                      </span>
                    </div>
                    <div className="mt-3">
                      <p className="font-extrabold text-xs leading-tight truncate">{deptName}</p>
                      <p className={`text-[10px] font-semibold mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                        {isSelected ? 'Filter Active (Click to Clear)' : 'Click to Filter Hierarchy'}
                      </p>
                    </div>
                  </button>
                )
              })}

              {/* Card 5: Unassigned Pool */}
              <button
                type="button"
                onClick={() => setShowUnassignedPoolModal(true)}
                className="p-3.5 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/50 hover:border-amber-400 transition-all text-left flex flex-col justify-between cursor-pointer group shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-amber-100 border border-amber-200 text-amber-700">
                    <UserX className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    {unassignedExecutives.length} Unassigned
                  </span>
                </div>
                <div className="mt-3">
                  <p className="font-extrabold text-xs text-amber-900 leading-tight">Unassigned Pool ↗</p>
                  <p className="text-[10px] font-semibold text-amber-700 mt-0.5">Click to Assign</p>
                </div>
              </button>
            </div>
          </div>

          {/* HIERARCHY 3-TIER VIEW */}
          <ThreeTierHierarchyView
            users={users.filter(u => selectedHierarchyDept === 'ALL' || (u.department || u.dept || 'Sales').toLowerCase().includes(selectedHierarchyDept.toLowerCase()))}
            searchQuery={searchQuery}
            isProtectedRole={isProtectedRole}
            ROLE_BADGE_CLASSES={ROLE_BADGE_CLASSES}
            toggleUserStatus={toggleUserStatus}
            handleOpenEditModal={handleOpenEditModal}
            handleDeleteUser={handleDeleteUser}
            handleOpenReassignModal={handleOpenReassignModal}
            setSelectedEnrollUser={setSelectedEnrollUser}
            setShowEnrollFaceModal={setShowEnrollFaceModal}
            setSelectedEmployeeProfile={setSelectedEmployeeProfile}
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: PASSWORD RESET REQUESTS                          */}
      {/* ======================================================== */}
      {activeTab === 'password-resets' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs animate-in fade-in duration-150">
          <PasswordResetRequestsPanel />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: DEACTIVATED & PAST EMPLOYEE ACCOUNTS             */}
      {/* ======================================================== */}
      {activeTab === 'deactivated' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 border border-white/20 rounded-2xl shadow-inner">
                <UserX className="w-8 h-8 text-rose-200" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  Deactivated & Past Employee Records
                  <span className="text-xs bg-rose-500/30 text-rose-100 border border-rose-400/40 px-3 py-1 rounded-full font-bold">
                    {deactivatedUsersList.length} Archived Accounts
                  </span>
                </h2>
                <p className="text-xs text-rose-100/90 font-medium mt-1">
                  Archived past employee directory. Search and filter by Department, Date, Designation/Role, or reactivate access instantly.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setDeactivatedSearchQuery('')
                setDeactivatedDeptFilter('ALL')
                setDeactivatedRoleFilter('ALL')
                setDeactivatedDatePreset('ALL')
                setDeactivatedStartDate('')
                setDeactivatedEndDate('')
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Clear All Filters
            </button>
          </div>

          {/* Search & Multi-Filter Control Toolbar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Search Bar */}
              <div className="relative md:col-span-2">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search past employee name, email, employee code, phone..."
                  value={deactivatedSearchQuery}
                  onChange={(e) => setDeactivatedSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-rose-500 focus:bg-white transition shadow-2xs"
                />
              </div>

              {/* Department Filter */}
              <div>
                <select
                  value={deactivatedDeptFilter}
                  onChange={(e) => setDeactivatedDeptFilter(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500 cursor-pointer shadow-2xs"
                >
                  <option value="ALL">🏢 All Departments ({deptOptions.length})</option>
                  {deptOptions.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Designation / Role Filter */}
              <div>
                <select
                  value={deactivatedRoleFilter}
                  onChange={(e) => setDeactivatedRoleFilter(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500 cursor-pointer shadow-2xs"
                >
                  <option value="ALL">👔 All Designations / Roles</option>
                  <option value="sales_executive">Sales Executive</option>
                  <option value="team_lead">Team Lead</option>
                  <option value="manager">Sales Manager</option>
                  <option value="ceo">CEO / Admin</option>
                </select>
              </div>
            </div>

            {/* Date Range Selector Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700">
                  <Calendar className="w-4 h-4 text-rose-600" />
                  <span>Filter Date:</span>
                  <select
                    value={deactivatedDatePreset}
                    onChange={(e) => {
                      setDeactivatedDatePreset(e.target.value)
                      if (e.target.value !== 'CUSTOM') {
                        setDeactivatedStartDate('')
                        setDeactivatedEndDate('')
                      }
                    }}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500 cursor-pointer"
                  >
                    <option value="ALL">All Time</option>
                    <option value="THIS_MONTH">This Month</option>
                    <option value="THIS_YEAR">This Year</option>
                    <option value="CUSTOM">Custom Date Range</option>
                  </select>
                </div>

                {(deactivatedDatePreset === 'CUSTOM' || deactivatedStartDate || deactivatedEndDate) && (
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <input
                      type="date"
                      value={deactivatedStartDate}
                      onChange={(e) => {
                        setDeactivatedStartDate(e.target.value)
                        setDeactivatedDatePreset('CUSTOM')
                      }}
                      className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                    />
                    <span className="text-slate-400">to</span>
                    <input
                      type="date"
                      value={deactivatedEndDate}
                      onChange={(e) => {
                        setDeactivatedEndDate(e.target.value)
                        setDeactivatedDatePreset('CUSTOM')
                      }}
                      className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                )}
              </div>

              <div className="text-xs text-slate-500 font-bold">
                Showing <span className="text-rose-700 font-black">{filteredDeactivatedUsers.length}</span> matching archived records
              </div>
            </div>
          </div>

          {/* Table Directory List */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {filteredDeactivatedUsers.length === 0 ? (
              <div className="p-16 text-center text-slate-400 space-y-3">
                <UserX className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-extrabold text-slate-700">No Deactivated Accounts Found</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {deactivatedUsersList.length === 0
                    ? 'All system employee accounts are currently active.'
                    : 'No past employee records match the active search or filter criteria.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto overflow-y-auto max-h-[60vh] relative">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-xs shadow-2xs">
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[10px]">
                      <th className="sticky top-0 bg-slate-100 z-20 px-5 py-3.5">Employee Detail</th>
                      <th className="sticky top-0 bg-slate-100 z-20 px-5 py-3.5">Role / Designation</th>
                      <th className="sticky top-0 bg-slate-100 z-20 px-5 py-3.5">Department</th>
                      <th className="sticky top-0 bg-slate-100 z-20 px-5 py-3.5">Contact Info</th>
                      <th className="sticky top-0 bg-slate-100 z-20 px-5 py-3.5">Account Status</th>
                      <th className="sticky top-0 bg-slate-100 z-20 px-5 py-3.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                    {filteredDeactivatedUsers.map((emp) => {
                      const empName = emp.name || emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Employee'
                      const empRole = emp.role || emp.designation || 'Staff'
                      const empDept = emp.department || emp.work_department || emp.dept || 'Sales & Business'
                      const empCode = emp.employee_code || emp.code || `EMP-${String(emp.id).slice(-4)}`

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center border border-slate-300 shrink-0">
                                {empName.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-extrabold text-slate-900 text-xs">{empName}</div>
                                <div className="text-[10px] font-mono text-slate-400 mt-0.5">{empCode}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[11px]">
                              {empRole}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-650 font-bold">
                            {empDept}
                          </td>
                          <td className="px-5 py-4 space-y-0.5">
                            <div className="text-slate-900 font-bold text-[11px]">{emp.email || '—'}</div>
                            <div className="text-slate-400 text-[10px]">{emp.phone || emp.phone_number || '—'}</div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-extrabold">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Deactivated / Inactive
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleUserStatus(emp.id)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer flex items-center gap-1"
                              >
                                <UserCheck className="w-3.5 h-3.5" /> Reactivate
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedEmployeeProfile(emp)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                              >
                                Details
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* UNASSIGNED EXECUTIVES POOL — POPUP MODAL                 */}
      {/* ======================================================== */}
      {showUnassignedPoolModal && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-5xl w-full flex flex-col border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] text-left text-xs font-semibold text-slate-800 animate-in fade-in zoom-in-95 duration-150">

            {/* Modal Header */}
            <div className="bg-[#061A4D] text-white p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-md">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
                    Unassigned Executives Pool ({unassignedExecutives.length})
                  </h3>
                  <p className="text-xs text-slate-300 font-medium">Sales Executives who do not currently report to any manager.</p>
                </div>
              </div>
              <button
                onClick={() => setShowUnassignedPoolModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition cursor-pointer"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Controls / Search Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search unassigned pool..."
                  value={unassignedSearchQuery}
                  onChange={(e) => setUnassignedSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#123A8C] font-medium shadow-xs"
                />
              </div>
              <div className="text-xs text-slate-500 font-bold shrink-0">
                Showing {filteredUnassignedPool.length} of {unassignedExecutives.length} unassigned
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto max-h-[calc(90vh-140px)]">
              {filteredUnassignedPool.length === 0 ? (
                <div className="p-12 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl">
                  <UserX className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-600">
                    {unassignedSearchQuery ? 'No unassigned pool matches search query.' : 'Unassigned executives pool is currently empty.'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">All sales executives are currently assigned to reporting managers.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {filteredUnassignedPool.map((exec) => (
                    <div
                      key={exec.id}
                      className="p-3.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-3 hover:border-amber-400 hover:shadow-md transition-all group"
                    >
                      <div className="min-w-0 flex items-center gap-3">
                        <div className="relative w-9 h-9 shrink-0 group-hover:scale-105 transition-transform">
                          {getUserPhoto(exec) && (
                            <img
                              src={getUserPhoto(exec)}
                              alt={exec.name}
                              onError={(e) => { e.currentTarget.style.display = 'none' }}
                              className="w-9 h-9 rounded-xl object-cover border border-amber-200 absolute inset-0 z-10"
                            />
                          )}
                          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 font-black text-xs flex items-center justify-center border border-amber-100">
                            {(exec.name || '').split(' ').map((n) => n[0]).join('')}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-900 truncate">{exec.name}</p>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">{exec.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold border transition ${exec.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                          }`}>
                          {exec.status || 'Active'}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedUnassignedExec(exec)
                            setShowAssignToManagerModal(true)
                          }}
                          className="px-3 py-1.5 bg-[#061A4D] hover:bg-[#123A8C] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition shrink-0"
                        >
                          Assign
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 font-medium">Click <strong>Assign</strong> to pair an executive with a manager.</span>
              <button
                onClick={() => setShowUnassignedPoolModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>

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
            <div className="bg-gradient-to-r from-slate-50 via-[#F0F4FF] to-slate-50 text-slate-900 p-5 flex items-center justify-between border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    All Users Directory
                    <span className="text-xs bg-blue-100 border border-blue-200 text-blue-700 px-2.5 py-0.5 rounded-full font-bold">
                      {filteredUsers.length} Users Found
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Full system database directory. Filter by Role/Status or Search by Name/Email.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDirectoryModal(false)}
                className="text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <span>✕ Close</span>
              </button>
            </div>

            {/* Search & Filter Bar inside Modal */}
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDirectoryViewMode('hierarchy')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${directoryViewMode === 'hierarchy'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                  <span>🏢 Team View (Manager ➔ Team Lead ➔ Exec)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDirectoryViewMode('table')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${directoryViewMode === 'table'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                  <span>📋 Directory List</span>
                </button>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search name, email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-250 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-bold shadow-2xs"
                  />
                </div>

                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-250 rounded-xl text-xs font-extrabold text-slate-700 focus:outline-none cursor-pointer shadow-2xs"
                >
                  <option value="ALL">All Roles</option>
                  <option value="Super Admin">Super Admin</option>
                  <option value="Sales Manager">Sales Manager</option>
                  <option value="Team Lead">Team Lead</option>
                  <option value="Sales Executive">Sales Executive</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedRole('ALL')
                    setSelectedStatus('ALL')
                  }}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4">
              {directoryViewMode === 'hierarchy' ? (
                <ThreeTierHierarchyView
                  users={filteredUsers}
                  searchQuery={searchQuery}
                  isProtectedRole={isProtectedRole}
                  ROLE_BADGE_CLASSES={ROLE_BADGE_CLASSES}
                  toggleUserStatus={toggleUserStatus}
                  handleOpenEditModal={handleOpenEditModal}
                  handleDeleteUser={handleDeleteUser}
                  handleOpenReassignModal={handleOpenReassignModal}
                  setSelectedEnrollUser={setSelectedEnrollUser}
                  setShowEnrollFaceModal={setShowEnrollFaceModal}
                  setSelectedEmployeeProfile={setSelectedEmployeeProfile}
                />
              ) : (
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
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600 shrink-0">
              <span>Showing {filteredUsers.length} of {users.length} total records</span>
              <button
                type="button"
                onClick={() => setShowDirectoryModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-extrabold shadow-xs transition cursor-pointer"
              >
                Close Modal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal (Admin Creates Access Email & Password) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 z-50">
          <div className="bg-white rounded-3xl max-w-5xl w-full flex flex-col border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] text-left text-xs font-semibold text-slate-800 font-sans">

            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#0B2545] via-[#133C6D] to-[#1E88E5] text-white p-6 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-white/10 border border-white/20 text-white rounded-2xl shadow-inner flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-blue-200" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white tracking-tight">Create System Employee Portal Account</h3>
                  <p className="text-xs text-blue-100 font-medium mt-0.5">Configure login credentials, employee profile details, work department, hierarchy reporting, and leave quotas.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl text-sm font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddUser} autoComplete="off" className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1">
                {/* Fake hidden input traps to block browser autofill */}
                <input type="text" name="fake_usernamenotremembered" style={{ display: 'none' }} tabIndex={-1} />
                <input type="password" name="fake_passwordnotremembered" style={{ display: 'none' }} tabIndex={-1} />

                {/* SECTION 1: Personal & Account Credentials */}
                <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
                    <span className="w-6.5 h-6.5 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">1</span>
                    <h4 className="font-extrabold text-xs text-[#0B2545] uppercase tracking-wider">Personal & Account Credentials</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">First Name <span className="text-rose-500">*</span></label>
                      <input
                        type="text" required
                        placeholder="e.g. Arun"
                        value={newUser.first_name}
                        onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value, name: `${e.target.value} ${newUser.last_name}`.trim() })}
                        className="w-full h-11 px-3.5 border border-slate-300 rounded-xl bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">Last Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Kumar"
                        value={newUser.last_name}
                        onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value, name: `${newUser.first_name} ${e.target.value}`.trim() })}
                        className="w-full h-11 px-3.5 border border-slate-300 rounded-xl bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">Access Email Address <span className="text-rose-500">*</span></label>
                      <input
                        type="email" required
                        name="new_user_login_email"
                        id="new_user_login_email"
                        placeholder="e.g. employee.name@company.com"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value, name: `${newUser.first_name} ${newUser.last_name}`.trim() })}
                        className="w-full h-11 px-3.5 border border-slate-300 rounded-xl bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">Portal Login Password <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <input
                          type={showAddPassword ? 'text' : 'password'}
                          name="new_user_login_password"
                          id="new_user_login_password"
                          placeholder="Min 6 characters"
                          value={newUser.password}
                          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                          className="w-full h-11 pl-3.5 pr-10 border border-slate-300 rounded-xl bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 shadow-2xs"
                          autoComplete="new-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowAddPassword(!showAddPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                        >
                          {showAddPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">Gender</label>
                      <select
                        value={newUser.gender}
                        onChange={(e) => setNewUser({ ...newUser, gender: e.target.value })}
                        className="w-full h-11 px-3.5 border border-slate-300 rounded-xl bg-white text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer shadow-2xs"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">Phone Number</label>
                      <input
                        type="tel"
                        maxLength={10}
                        value={newUser.phone}
                        onChange={(e) => setNewUser({ ...newUser, phone: normalizePhoneNumber(e.target.value) })}
                        placeholder="10-digit phone"
                        className="w-full h-11 px-3.5 border border-slate-300 rounded-xl bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">Emergency Contact</label>
                      <input
                        type="tel"
                        maxLength={10}
                        value={newUser.emergency_contact}
                        onChange={(e) => setNewUser({ ...newUser, emergency_contact: normalizePhoneNumber(e.target.value) })}
                        placeholder="Emergency contact"
                        className="w-full h-11 px-3.5 border border-slate-300 rounded-xl bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: Role & Department Assignment */}
                <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
                    <span className="w-6.5 h-6.5 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">2</span>
                    <h4 className="font-extrabold text-xs text-[#0B2545] uppercase tracking-wider">Role & Work Department Assignment</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">Assigned System Role <span className="text-rose-500">*</span></label>
                      <select
                        value={newUser.role}
                        onChange={(e) => handleAddRoleChange(e.target.value)}
                        className="w-full h-11 px-3.5 border border-slate-300 rounded-xl bg-white text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 cursor-pointer shadow-2xs"
                      >
                        <option value="Sales Executive">Sales Executive</option>
                        <option value="Team Lead">Team Lead</option>
                        <option value="Sales Manager">Sales Manager</option>
                        <option value="System Admin">System Admin</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">Work Department</label>
                      <select
                        value={newUser.dept}
                        onChange={(e) => setNewUser({ ...newUser, dept: e.target.value })}
                        className="w-full h-11 px-3.5 border border-slate-300 rounded-xl bg-white text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 cursor-pointer shadow-2xs"
                      >
                        {deptOptions.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: Reporting Hierarchy (Manager & Team Lead Assignment) */}
                {(() => {
                  const r = (newUser.role || '').toLowerCase().trim()
                  const isExec = r.includes('executive') || r.includes('sales executive')
                  const isTopRole = r.includes('admin') || r.includes('ceo') || r.includes('founder')

                  if (isTopRole) {
                    return (
                      <div className="bg-purple-50/60 border border-purple-200/90 rounded-2xl p-5 space-y-2">
                        <div className="flex items-center gap-2.5 border-b border-purple-200 pb-3">
                          <span className="w-6.5 h-6.5 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shadow-xs">3</span>
                          <h4 className="font-extrabold text-xs text-purple-950 uppercase tracking-wider">Reporting Hierarchy Assignment</h4>
                        </div>
                        <p className="text-xs text-purple-800 font-semibold italic">
                          👑 <strong>{newUser.role}</strong> is a top-level organization role (No reporting manager or team lead required).
                        </p>
                      </div>
                    )
                  }

                  return (
                    <div className="bg-purple-50/50 border border-purple-200/90 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-purple-200 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6.5 h-6.5 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shadow-xs">3</span>
                          <h4 className="font-extrabold text-xs text-purple-950 uppercase tracking-wider">Reporting Hierarchy Assignment</h4>
                        </div>
                        <span className="text-[10px] font-black text-purple-700 bg-purple-100/90 px-3 py-1 rounded-full border border-purple-200">
                          {isExec ? '3-Tier Structure (Sales Manager & Team Lead)' : '2-Tier Structure (Sales Manager)'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 font-medium">
                        {isExec
                          ? 'Assign a Sales Manager and/or Team Lead during creation to link this Executive into the organizational hierarchy.'
                          : `Assign a Sales Manager for this ${newUser.role}.`}
                      </p>

                      <div className={`grid grid-cols-1 ${isExec ? 'sm:grid-cols-2' : 'sm:grid-cols-1'} gap-5`}>
                        {/* Select Sales Manager */}
                        <div>
                          <label className="block text-[11px] font-extrabold text-purple-900 uppercase tracking-wider mb-1.5">
                            👔 Assign Sales Manager
                          </label>
                          <select
                            value={newUser.reporting_manager_id || ''}
                            onChange={(e) => setNewUser({ ...newUser, reporting_manager_id: e.target.value })}
                            className="w-full h-11 px-3.5 border border-purple-300 rounded-xl bg-white text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-600 cursor-pointer shadow-2xs"
                          >
                            <option value="">-- No Manager Assigned (Unassigned) --</option>
                            {potentialReportingManagers
                              .filter(m => {
                                const roleLower = (m.role || '').toLowerCase()
                                return roleLower.includes('manager') || roleLower.includes('admin') || roleLower.includes('ceo')
                              })
                              .map((m) => (
                                <option key={m.id} value={m.id}>
                                  👤 {m.name} ({m.role}) - {m.email}
                                </option>
                              ))}
                          </select>
                        </div>

                        {/* Select Team Lead (ONLY when creating Sales Executive) */}
                        {isExec && (
                          <div>
                            <label className="block text-[11px] font-extrabold text-purple-900 uppercase tracking-wider mb-1.5">
                              🔰 Assign Team Lead
                            </label>
                            <select
                              value={newUser.reporting_team_lead_id || ''}
                              onChange={(e) => setNewUser({ ...newUser, reporting_team_lead_id: e.target.value })}
                              className="w-full h-11 px-3.5 border border-purple-300 rounded-xl bg-white text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-600 cursor-pointer shadow-2xs"
                            >
                              <option value="">-- No Team Lead Assigned (Direct to Manager) --</option>
                              {users
                                .filter(u => {
                                  const roleLower = (u.role || '').toLowerCase()
                                  return roleLower.includes('lead') || roleLower.includes('tl')
                                })
                                .map((tl) => (
                                  <option key={tl.id} value={tl.id}>
                                    👤 {tl.name} (Team Lead) - {tl.email}
                                  </option>
                                ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}

                {/* SECTION 4: Leave Quotas & Permissions */}
                <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
                    <span className="w-6.5 h-6.5 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-xs">4</span>
                    <h4 className="font-extrabold text-xs text-[#0B2545] uppercase tracking-wider">Leave & Permission Quotas</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">Annual Leaves Quota</label>
                      <input
                        type="number"
                        min={0}
                        value={newUser.annualLeaves || 12}
                        onChange={(e) => setNewUser({ ...newUser, annualLeaves: Number(e.target.value) })}
                        className="w-full h-11 px-3.5 border border-slate-300 rounded-xl bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">Half-Day Slots</label>
                      <input
                        type="number"
                        min={0}
                        value={newUser.halfDayPermissions || 6}
                        onChange={(e) => setNewUser({ ...newUser, halfDayPermissions: Number(e.target.value) })}
                        className="w-full h-11 px-3.5 border border-slate-300 rounded-xl bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">Short Perm (Hrs)</label>
                      <input
                        type="number"
                        min={0}
                        value={newUser.shortPermissions || 2}
                        onChange={(e) => setNewUser({ ...newUser, shortPermissions: Number(e.target.value) })}
                        className="w-full h-11 px-3.5 border border-slate-300 rounded-xl bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600 shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 5: Granular Page & Action Permissions */}
                <PermissionMatrixEditor
                  role={newUser.role}
                  permissions={newUser.custom_permissions || {}}
                  onChange={(perms) => setNewUser({ ...newUser, custom_permissions: perms })}
                />
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between gap-3 p-5 border-t border-slate-200 bg-white shrink-0">
                <div className="text-xs font-bold text-slate-600 hidden sm:block">
                  Creating Account for: <strong className="text-blue-700 font-extrabold">{newUser.name || 'New Employee'}</strong> ({newUser.role})
                </div>

                <div className="flex items-center gap-2.5 ml-auto">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-5 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-2"
                  >
                    <span>✓ Create Account & Assign Team Hierarchy</span>
                  </button>
                </div>
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
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-5xl w-full flex flex-col border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] text-left text-xs font-semibold text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#071A45] via-[#0D2866] to-[#14398A] text-white p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-xl border border-white/20">
                  <UserCheck className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Edit Employee Account</h3>
                  <p className="text-[11px] text-blue-200 font-medium">Update profile credentials, leave quotas, and access permissions for {editingUser.name}</p>
                </div>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-white/70 hover:text-white text-lg font-black p-1.5 hover:bg-white/10 rounded-xl transition cursor-pointer">
                ✕
              </button>
            </div>

            {/* Modal Form Scroll Body */}
            <form onSubmit={handleSaveEditedUser} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-5 flex-1 max-h-[calc(92vh-130px)]">
                {/* Section 1: User Account Details */}
                <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-4">
                  <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span> Profile & Login Credentials
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Full Name</label>
                      <input
                        type="text"
                        value={editingUser.name}
                        onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                        className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600 bg-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Access Email Address</label>
                      <input
                        type="email"
                        value={editingUser.email}
                        onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                        className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600 bg-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        New Access Password
                      </label>
                      <div className="relative">
                        <input
                          type={showEditPassword ? 'text' : 'password'}
                          name="admin_new_portal_password"
                          id="admin_new_portal_password"
                          autoComplete="new-password"
                          placeholder="Leave blank to keep existing password"
                          value={editingUser.newPassword || ''}
                          onChange={(e) => setEditingUser({ ...editingUser, newPassword: e.target.value })}
                          className="w-full h-10 border border-slate-300 rounded-xl pl-3 pr-10 text-slate-900 font-semibold focus:outline-none focus:border-blue-600 bg-white"
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
                        className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Role & Hierarchy */}
                <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-4">
                  <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span> Role & Reporting Hierarchy
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Role</label>
                      <select
                        value={editingUser.role}
                        onChange={(e) => handleEditRoleChange(e.target.value)}
                        className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-blue-600 bg-white cursor-pointer"
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
                        className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-blue-600 bg-white cursor-pointer"
                      >
                        {deptOptions.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>

                    {(editingUser.role === 'Sales Manager' || editingUser.role === 'Sales Executive') ? (
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
                          className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600 bg-white cursor-pointer"
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
                    ) : (
                      <div className="flex items-center text-slate-400 font-medium text-xs pt-5">
                        <span>Higher tier roles report directly to CEO/Super Admin</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 3: Leave & Salary Quotas */}
                <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-4">
                  <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span> Leave & Permission Allocation Quota
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    <div>
                      <label className="block text-slate-600 font-bold mb-1 text-[10px]">Annual Leaves</label>
                      <input
                        type="number"
                        min={0}
                        value={editingUser.annualLeaves || 12}
                        onChange={(e) => setEditingUser({ ...editingUser, annualLeaves: Number(e.target.value) })}
                        className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-bold mb-1 text-[10px]">Sick Leaves</label>
                      <input
                        type="number"
                        min={0}
                        value={editingUser.sickLeaves || 10}
                        onChange={(e) => setEditingUser({ ...editingUser, sickLeaves: Number(e.target.value) })}
                        className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-bold mb-1 text-[10px]">Other Leaves</label>
                      <input
                        type="number"
                        min={0}
                        value={editingUser.otherLeaves || 10}
                        onChange={(e) => setEditingUser({ ...editingUser, otherLeaves: Number(e.target.value) })}
                        className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-bold mb-1 text-[10px]">Half-Day Slots</label>
                      <input
                        type="number"
                        min={0}
                        value={editingUser.halfDayPermissions || 6}
                        onChange={(e) => setEditingUser({ ...editingUser, halfDayPermissions: Number(e.target.value) })}
                        className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-bold mb-1 text-[10px]">Short Perm (Hrs)</label>
                      <input
                        type="number"
                        min={0}
                        value={editingUser.shortPermissions || 2}
                        onChange={(e) => setEditingUser({ ...editingUser, shortPermissions: Number(e.target.value) })}
                        className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-bold mb-1 text-[10px]">Monthly Salary (₹)</label>
                      <input
                        type="number"
                        min={0}
                        value={editingUser.monthlySalary || 0}
                        onChange={(e) => setEditingUser({ ...editingUser, monthlySalary: Number(e.target.value) })}
                        className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 font-semibold focus:outline-none focus:border-blue-600 bg-amber-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Permission Matrix */}
                <div className="space-y-2 pt-2">
                  <PermissionMatrixEditor
                    role={editingUser.role}
                    permissions={editingUser.custom_permissions || editingUser.permissions || {}}
                    onChange={(perms) => setEditingUser({ ...editingUser, custom_permissions: perms })}
                  />
                </div>
              </div>

              {/* Sticky Footer Action Bar */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-extrabold text-xs hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-xl text-xs shadow-md shadow-blue-600/20 transition cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Save Account & Password Changes
                </button>
              </div>
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

      {/* Assign Sales Executives & Staff to Sales Manager / Team Lead Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden text-left font-sans">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 shrink-0 bg-slate-50/50">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                  <UserCheck className="w-5.5 h-5.5 text-emerald-600" /> Assign Executives & Staff to Leader
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Select a Sales Manager or Team Lead and check off the staff members assigned to report to them.
                </p>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-slate-400 hover:text-slate-600 text-base font-bold cursor-pointer p-1.5 hover:bg-slate-200/60 rounded-full transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAssignments} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
                
                {/* STEP 1: Select Target Leader (Sales Manager / Team Lead) */}
                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="block text-slate-900 font-extrabold text-xs uppercase tracking-wider">
                      1. Select Target Manager / Team Lead <span className="text-rose-500">*</span>
                    </label>
                    {/* Role Category Filter */}
                    <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl">
                      {[
                        { key: 'ALL', label: 'All Leaders' },
                        { key: 'MANAGER', label: 'Managers Only' },
                        { key: 'TEAM_LEAD', label: 'Team Leads Only' },
                      ].map((t) => (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => setAssignTargetRoleFilter(t.key)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition cursor-pointer ${
                            assignTargetRoleFilter === t.key
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <select
                    value={selectedManagerId}
                    onChange={(e) => handleManagerSelect(e.target.value)}
                    className="w-full h-11 border border-slate-300 rounded-xl px-3.5 text-slate-900 font-extrabold focus:outline-none focus:border-emerald-600 bg-white text-xs shadow-xs"
                    required
                  >
                    <option value="">-- Choose Sales Manager or Team Lead --</option>
                    {filteredAssignLeaders.map((m) => (
                      <option key={m.id} value={m.id}>
                        👤 {m.name} ({m.email}) · [{m.role || 'Leader'}] {m.department ? `· Dept: ${m.department}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* STEP 2: Filter & Search Staff Members */}
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="block text-slate-900 font-extrabold text-xs uppercase tracking-wider">
                      2. Select Assigned Staff Members ({selectedExecIds.length} selected)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-500">
                        Showing {filteredAssignExecutives.length} of {assignableExecutives.length}
                      </span>
                      {filteredAssignExecutives.length > 0 && (
                        <button
                          type="button"
                          onClick={handleToggleSelectAllFiltered}
                          className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-250 hover:bg-emerald-100 text-[11px] font-black rounded-lg transition cursor-pointer"
                        >
                          {filteredAssignExecutives.length > 0 && filteredAssignExecutives.every((e) => selectedExecIds.includes(String(e.id)))
                            ? 'Deselect Filtered'
                            : 'Select All Filtered'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filter Toolbar Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 bg-slate-100/70 p-3 rounded-2xl border border-slate-200">
                    {/* Search */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search name, email, code..."
                        value={assignSearchQuery}
                        onChange={(e) => setAssignSearchQuery(e.target.value)}
                        className="w-full h-9 pl-8 pr-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    {/* Department Filter */}
                    <select
                      value={assignDeptFilter}
                      onChange={(e) => setAssignDeptFilter(e.target.value)}
                      className="h-9 bg-white border border-slate-300 rounded-xl px-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600"
                    >
                      <option value="ALL">🏢 All Departments</option>
                      {assignModalDeptOptions.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>

                    {/* Role Filter */}
                    <select
                      value={assignRoleFilter}
                      onChange={(e) => setAssignRoleFilter(e.target.value)}
                      className="h-9 bg-white border border-slate-300 rounded-xl px-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600"
                    >
                      <option value="ALL">💼 All Roles / Designations</option>
                      {assignModalRoleOptions.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>

                    {/* Status Filter */}
                    <select
                      value={assignStatusFilter}
                      onChange={(e) => setAssignStatusFilter(e.target.value)}
                      className="h-9 bg-white border border-slate-300 rounded-xl px-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600"
                    >
                      <option value="ALL">📋 All Statuses</option>
                      <option value="UNASSIGNED">Unassigned Staff Only</option>
                      <option value="CURRENT_LEADER">Assigned to Selected Leader</option>
                      <option value="OTHER_LEADER">Assigned to Other Leaders</option>
                    </select>
                  </div>
                </div>

                {/* STEP 3: Staff Members Checklist Cards Grid */}
                <div className="max-h-[380px] min-h-[180px] overflow-y-auto border border-slate-200 rounded-2xl p-2 bg-slate-50/50">
                  {filteredAssignExecutives.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 font-semibold space-y-1">
                      <p>No staff members match the current search & filters.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setAssignSearchQuery('')
                          setAssignDeptFilter('ALL')
                          setAssignRoleFilter('ALL')
                          setAssignStatusFilter('ALL')
                        }}
                        className="text-emerald-600 font-bold hover:underline cursor-pointer"
                      >
                        Reset Search Filters
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {filteredAssignExecutives.map((exec) => {
                        const isChecked = selectedExecIds.includes(String(exec.id))
                        const currManager = exec.reporting_manager_name || 'Unassigned'
                        const isReportingToSelected = selectedManagerId && (
                          String(exec.reporting_manager_id) === String(selectedManagerId) ||
                          (exec.reporting_manager_email && users.find(u => String(u.id) === String(selectedManagerId))?.email === exec.reporting_manager_email)
                        )

                        return (
                          <label
                            key={exec.id}
                            className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                              isChecked
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-xs'
                                : 'bg-white border-slate-200 hover:bg-slate-100/70 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleExecSelection(exec.id)}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 shrink-0 cursor-pointer"
                              />
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-extrabold text-xs text-slate-900 truncate">{exec.name}</span>
                                  {exec.role && (
                                    <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                                      {exec.role}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-500 truncate">{exec.email} {exec.department ? `· ${exec.department}` : ''}</p>
                              </div>
                            </div>

                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                                isReportingToSelected
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-250 font-black'
                                  : currManager !== 'Unassigned'
                                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}
                            >
                              {currManager !== 'Unassigned' ? `Reports to: ${currManager}` : 'Unassigned'}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="flex items-center justify-between gap-3 p-4 border-t border-slate-200 bg-white shrink-0">
                <div className="text-xs font-bold text-slate-600">
                  Total Selected: <strong className="text-emerald-700 font-extrabold">{selectedExecIds.length}</strong> staff member{selectedExecIds.length !== 1 ? 's' : ''}
                </div>

                <div className="flex items-center gap-2">
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
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-md transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {assigning ? 'Saving Assignment...' : 'Save Executive Assignment'}
                  </button>
                </div>
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

                  {/* Face Guide round circle frame */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className={`w-[240px] h-[240px] sm:w-[280px] sm:h-[280px] rounded-full border-4 transition-all duration-300 shadow-[0_0_0_9999px_rgba(15,23,42,0.45)] ${isFaceAligned ? "border-emerald-500" : "border-amber-500 animate-pulse"
                      }`} />
                  </div>

                  {/* Live instruction prompt */}
                  <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none z-10">
                    <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase shadow-lg border ${isFaceAligned
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg sm:max-w-xl w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
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
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveReassignment} className="space-y-4 text-xs">
              {/* Employee Summary Card */}
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-500">Employee:</span>
                  <span className="font-extrabold text-slate-900">{reassignUser.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-500">Department:</span>
                  <span className="font-extrabold text-slate-700 bg-slate-200/60 px-2 py-0.5 rounded-md text-[11px]">
                    {reassignUser.department || reassignUser.dept || 'Sales & Business Development'}
                  </span>
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

              {/* Filter Controls Bar */}
              <div className="space-y-2.5 bg-blue-50/50 border border-blue-100 p-3 rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="text-slate-800 font-extrabold text-xs flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-blue-600" /> Filter Manager List
                  </label>
                  <div className="flex items-center gap-2">
                    {(reassignDeptFilter !== 'ALL' || reassignRoleFilter !== 'ALL' || reassignSearchQuery) && (
                      <button
                        type="button"
                        onClick={() => {
                          setReassignDeptFilter('ALL')
                          setReassignRoleFilter('ALL')
                          setReassignSearchQuery('')
                        }}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    )}
                    <span className="text-[10px] font-extrabold bg-white px-2 py-0.5 rounded-full border border-blue-200 text-blue-700 shadow-2xs">
                      {filteredReassignManagers.length} matching
                    </span>
                  </div>
                </div>

                {/* Filter Inputs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Department Filter */}
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 block mb-1">Department:</span>
                    <select
                      value={reassignDeptFilter}
                      onChange={(e) => setReassignDeptFilter(e.target.value)}
                      className="w-full h-8 border border-slate-200 rounded-lg px-2 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                    >
                      <option value="ALL">🏢 All Departments</option>
                      {realDepartments.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Role Filter */}
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 block mb-1">Role Type:</span>
                    <select
                      value={reassignRoleFilter}
                      onChange={(e) => setReassignRoleFilter(e.target.value)}
                      className="w-full h-8 border border-slate-200 rounded-lg px-2 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                    >
                      <option value="ALL">👥 All Manager Roles</option>
                      <option value="TEAM_LEAD">⭐ Team Leads Only</option>
                      <option value="MANAGER">👔 Sales Managers Only</option>
                      <option value="ADMIN_CEO">🛡️ Admins & Leadership</option>
                    </select>
                  </div>
                </div>

                {/* Search Input Box */}
                <div className="relative pt-0.5">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by manager name, email, employee code..."
                    value={reassignSearchQuery}
                    onChange={(e) => setReassignSearchQuery(e.target.value)}
                    className="w-full h-8 pl-8 pr-7 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs"
                  />
                  {reassignSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setReassignSearchQuery('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
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
                  className="w-full h-11 border border-slate-300 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-blue-600 bg-white text-xs"
                >
                  <option value="">-- No Reporting Manager (Unassign) --</option>
                  {filteredReassignManagers.map((m) => (
                    <option key={m.id || m.employee_id} value={m.id || m.employee_id}>
                      👤 {m.name} ({m.email}) · [{m.role || 'Manager'}] · Dept: {m.department || m.dept || 'Sales'}
                    </option>
                  ))}
                </select>

                {filteredReassignManagers.length === 0 && (
                  <p className="text-[11px] text-amber-600 font-extrabold mt-1.5 flex items-center gap-1">
                    ⚠️ No managers or team leads match the selected department/role filters. Try resetting filters.
                  </p>
                )}

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
