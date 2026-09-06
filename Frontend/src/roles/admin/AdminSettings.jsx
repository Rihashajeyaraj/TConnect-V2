import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Settings,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  FileText,
  DollarSign,
  Clock,
  Upload,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Layers,
  Sparkles,
  Wrench,
  Users,
} from 'lucide-react'
import { settingsAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'
import { normalizePhoneNumber } from '../../utils/formatUtils.js'

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
  { key: 'view', label: 'View', icon: '👀' },
  { key: 'create_edit', label: 'Edit', icon: '✏️' },
  { key: 'approve', label: 'Approve', icon: '✅' },
  { key: 'assign', label: 'Assign', icon: '🔄' },
  { key: 'delete', label: 'Delete', icon: '🗑️' },
  { key: 'export', label: 'Export', icon: '📥' },
]

const MODULE_SPECIFIC_SUB_ACTIONS = {
  dashboard: {
    view: [
      { key: 'view_kpi_cards', label: 'View KPI Summary Cards', desc: 'Revenue, Target, Lead counts' },
      { key: 'view_charts', label: 'View Performance Charts', desc: 'Sales trends and target vs actual graphs' },
      { key: 'view_leaderboard', label: 'View Top Performers', desc: 'Team ranking and performance scores' },
    ],
    create_edit: [
      { key: 'customize_layout', label: 'Customize Dashboard Widgets', desc: 'Reorder and pin widget cards' },
      { key: 'set_period_filter', label: 'Modify Target Periods', desc: 'Toggle monthly / quarterly view' },
    ],
    export: [
      { key: 'export_dashboard_pdf', label: 'Export Dashboard Summary (PDF)', desc: 'Generate printable executive report' },
    ],
  },
  map: {
    view: [
      { key: 'view_live_gps', label: 'View Live GPS Locations', desc: 'Real-time field rep coordinates' },
      { key: 'view_nearby_clients', label: 'View Nearby Customer Radius', desc: 'Client pins within 5km/10km' },
      { key: 'view_geofence', label: 'View Geofence Boundaries', desc: 'Branch and client location perimeters' },
    ],
    create_edit: [
      { key: 'update_location_ping', label: 'Manual GPS Check-in', desc: 'Ping current location manually' },
      { key: 'adjust_geofence', label: 'Adjust Geofence Radius', desc: 'Set location accuracy threshold' },
    ],
    export: [
      { key: 'export_map_kml', label: 'Export Route Map Data (CSV/KML)', desc: 'Download route history coordinates' },
    ],
  },
  attendance: {
    view: [
      { key: 'view_punch_logs', label: 'View Punch In/Out Logs', desc: 'Daily check-in timestamps' },
      { key: 'view_selfie_photos', label: 'View Selfie Biometric Photos', desc: 'Facial verification images' },
      { key: 'view_gps_stamps', label: 'View GPS Location Stamps', desc: 'Punch location coordinates' },
    ],
    create_edit: [
      { key: 'clock_in_out', label: 'Clock In / Clock Out', desc: 'Perform daily attendance punch' },
      { key: 'manual_attendance_entry', label: 'Request Attendance Adjustment', desc: 'Submit missing punch request' },
      { key: 'log_on_duty', label: 'Submit On-Duty (OD) Request', desc: 'Log client visit out-of-office punch' },
    ],
    approve: [
      { key: 'approve_attendance_logs', label: 'Approve Attendance Adjustments', desc: 'Validate employee punch requests' },
      { key: 'validate_face_liveness', label: 'Validate Face Liveness Logs', desc: 'Verify biometric selfie matches' },
      { key: 'acknowledge_late_punch', label: 'Acknowledge Late Check-ins', desc: 'Review grace period exceptions' },
    ],
    export: [
      { key: 'export_attendance_excel', label: 'Export Attendance Register (Excel)', desc: 'Monthly attendance summary' },
    ],
  },
  customers: {
    view: [
      { key: 'view_customer_profiles', label: 'View Customer Company Profiles', desc: 'Business details & contacts' },
      { key: 'view_purchase_history', label: 'View Order & Purchase History', desc: 'Past invoices & deal values' },
      { key: 'view_contact_persons', label: 'View Key Contacts & Phone Nos', desc: 'Decision makers directory' },
    ],
    create_edit: [
      { key: 'create_customer', label: 'Create New Customer Account', desc: 'Register company profile' },
      { key: 'edit_customer_fields', label: 'Edit Customer Information', desc: 'Update contact details & address' },
      { key: 'convert_lead_customer', label: 'Convert Lead to Customer', desc: 'Transform qualified lead to account' },
    ],
    assign: [
      { key: 'assign_customer_rep', label: 'Assign Account Manager / Rep', desc: 'Map customer account to sales rep' },
    ],
    delete: [
      { key: 'delete_customer_account', label: 'Delete Customer Record', desc: 'Remove customer profile' },
      { key: 'archive_client', label: 'Archive Inactive Account', desc: 'Soft-delete inactive clients' },
    ],
    export: [
      { key: 'export_customers_excel', label: 'Export Customer Directory (Excel)', desc: 'Full accounts list' },
      { key: 'export_customer_pdf', label: 'Export Account Statements (PDF)', desc: 'Printable client portfolio' },
    ],
  },
  leads: {
    view: [
      { key: 'view_lead_pipeline', label: 'View Pipeline & Stage Cards', desc: 'Active deal stages and values' },
      { key: 'view_visit_history', label: 'View Field Visit Logs & Notes', desc: 'Past customer interactions' },
      { key: 'view_lead_contacts', label: 'View Prospect Contact Info', desc: 'Phone, email, and company details' },
    ],
    create_edit: [
      { key: 'create_new_lead', label: 'Create New Lead / Deal', desc: 'Add new sales prospect' },
      { key: 'update_lead_stage', label: 'Update Deal Stage / Pipeline Status', desc: 'Move lead through sales funnel' },
      { key: 'log_visit_outcome', label: 'Log Visit Notes & Follow-up Date', desc: 'Record meeting feedback' },
    ],
    approve: [
      { key: 'approve_deal_discount', label: 'Approve Deal Discounts & Pricing', desc: 'Validate special pricing requests' },
    ],
    assign: [
      { key: 'assign_lead_executive', label: 'Assign Lead to Sales Executive', desc: 'Distribute incoming leads' },
      { key: 'reassign_territory', label: 'Reassign Unattended Leads', desc: 'Transfer leads between reps' },
    ],
    delete: [
      { key: 'delete_lead_record', label: 'Delete Lead Record', desc: 'Remove prospect from system' },
      { key: 'mark_lead_lost', label: 'Mark Lead as Lost / Junk', desc: 'Close unqualified deal' },
    ],
    export: [
      { key: 'export_leads_excel', label: 'Export Leads Pipeline (Excel)', desc: 'Full pipeline dataset' },
    ],
  },
  expenses: {
    view: [
      { key: 'view_expense_claims', label: 'View Expense Claims', desc: 'Travel & food claim entries' },
      { key: 'view_expense_receipts', label: 'View Bill Receipts & Images', desc: 'Uploaded invoice documents' },
      { key: 'view_reimbursement_status', label: 'View Reimbursement Status', desc: 'Pending vs Paid claims' },
    ],
    create_edit: [
      { key: 'submit_expense_claim', label: 'Submit New Expense Claim', desc: 'Add travel/food expense entry' },
      { key: 'upload_bills', label: 'Upload Receipt Attachments', desc: 'Attach proof photos' },
      { key: 'edit_pending_claim', label: 'Edit Draft Claim Details', desc: 'Modify submitted claim fields' },
    ],
    approve: [
      { key: 'approve_claim', label: 'Approve Expense Claims', desc: 'Validate and approve for payout' },
      { key: 'reject_claim', label: 'Reject Claim with Reason', desc: 'Decline invalid claim request' },
      { key: 'return_claim', label: 'Return for Revision', desc: 'Send claim back to employee' },
    ],
    delete: [
      { key: 'delete_draft_expense', label: 'Delete Draft Expense Claim', desc: 'Remove unsubmitted claim' },
    ],
    export: [
      { key: 'export_expenses_excel', label: 'Export Expense Report (Excel)', desc: 'Download monthly claims summary' },
      { key: 'export_tax_receipts_pdf', label: 'Export Tax Receipts (PDF)', desc: 'Generate PDF voucher statement' },
    ],
  },
  hrms: {
    view: [
      { key: 'view_employee_directory', label: 'View Employee Roster & Profiles', desc: 'Full staff list and hierarchy' },
      { key: 'view_leave_balances', label: 'View Leave Balances & History', desc: 'Sick, casual, and annual leaves' },
      { key: 'view_salary_slips', label: 'View Salary Payslips', desc: 'Monthly compensation breakdown' },
    ],
    create_edit: [
      { key: 'apply_leave', label: 'Submit Leave Application', desc: 'Apply for time off' },
      { key: 'edit_own_profile', label: 'Update Profile & Emergency Info', desc: 'Edit personal & contact details' },
      { key: 'edit_employee_record', label: 'Edit Employee Master Profile', desc: 'Update designation and department' },
    ],
    approve: [
      { key: 'approve_leave_request', label: 'Approve Leave Applications', desc: 'Validate employee leave requests' },
      { key: 'approve_salary_revision', label: 'Approve Salary & Compensation', desc: 'Validate pay revisions' },
    ],
    assign: [
      { key: 'assign_reporting_manager', label: 'Assign Reporting Manager & TL', desc: 'Set employee hierarchy' },
    ],
    delete: [
      { key: 'deactivate_employee', label: 'Deactivate Employee Account', desc: 'Disable employee login access' },
    ],
    export: [
      { key: 'export_hrms_excel', label: 'Export Employee Roster (Excel)', desc: 'Full employee database' },
    ],
  },
  team: {
    view: [
      { key: 'view_team_roster', label: 'View Team Members List', desc: 'Assigned executives and TLs' },
      { key: 'view_team_activity', label: 'View Team Activity Logs', desc: 'Daily visits and calls summary' },
    ],
    create_edit: [
      { key: 'update_team_member', label: 'Update Team Member Info', desc: 'Edit executive details' },
    ],
    assign: [
      { key: 'assign_executive_tl', label: 'Assign Executive to Team Lead', desc: 'Map reporting hierarchy' },
    ],
    export: [
      { key: 'export_team_list', label: 'Export Team Structure (Excel)', desc: 'Download reporting map' },
    ],
  },
  reports: {
    view: [
      { key: 'view_sales_reports', label: 'View Sales & Revenue Reports', desc: 'Monthly performance data' },
      { key: 'view_audit_logs', label: 'View System Audit Trail Logs', desc: 'Security and change history' },
    ],
    create_edit: [
      { key: 'submit_eod_report', label: 'Submit End of Day (EOD) Report', desc: 'Daily work log submission' },
    ],
    approve: [
      { key: 'acknowledge_eod', label: 'Acknowledge EOD Reports', desc: 'Validate team EOD submissions' },
    ],
    export: [
      { key: 'export_audit_csv', label: 'Export Audit Logs (CSV/Excel)', desc: 'Download system audit trails' },
      { key: 'export_performance_pdf', label: 'Export Performance Reports (PDF)', desc: 'Printable executive summary' },
    ],
  },
  settings: {
    view: [
      { key: 'view_company_settings', label: 'View Organization Profile Settings', desc: 'GST, company tax, logo' },
      { key: 'view_rbac_settings', label: 'View Role & Permission Matrix', desc: 'RBAC default master templates' },
    ],
    create_edit: [
      { key: 'update_company_profile', label: 'Edit Company Profile & Logo', desc: 'Update legal name & branding' },
      { key: 'update_master_rbac', label: 'Update Master Role Templates', desc: 'Modify default permission presets' },
    ],
    delete: [
      { key: 'delete_custom_role', label: 'Delete Custom Role', desc: 'Remove non-system role template' },
    ],
  },
}

const getModuleSubActions = (modKey, actKey) => {
  const modSpecific = MODULE_SPECIFIC_SUB_ACTIONS[modKey]?.[actKey];
  if (modSpecific && modSpecific.length > 0) {
    return modSpecific;
  }
  return SUB_ACTION_ITEMS[actKey] || [];
};

function SettingsPermissionMatrixEditor({ role = 'Sales Executive', permissions = {}, onChange }) {
  const [selectedDept, setSelectedDept] = useState('ALL')
  const [activePopover, setActivePopover] = useState(null)

  const normRole = (role || '').toLowerCase().includes('ceo') ? 'CEO / Founder'
    : (role || '').toLowerCase().includes('admin') ? 'Super Admin'
    : (role || '').toLowerCase().includes('lead') ? 'Team Lead'
    : (role || '').toLowerCase().includes('manager') ? 'Sales Manager'
    : 'Sales Executive'

  const allModules = MODULE_LABELS_BY_ROLE[normRole] || MODULE_LABELS_BY_ROLE['Sales Executive']

  const handleToggleAction = (modKey, actKey) => {
    const currentMod = permissions[modKey] || {}
    const currentState = currentMod[actKey]
    const isCurrentlyActive = typeof currentState === 'boolean' ? currentState : (currentState?.enabled ?? (actKey === 'view'))

    onChange({
      ...permissions,
      [modKey]: {
        ...currentMod,
        [actKey]: !isCurrentlyActive
      }
    })
  }

  const handleToggleSubAction = (modKey, actKey, subKey) => {
    const currentMod = permissions[modKey] || {}
    const currentAct = currentMod[actKey]
    let subObj = typeof currentAct === 'object' && currentAct !== null ? { ...currentAct } : { enabled: true }
    subObj[subKey] = !Boolean(subObj[subKey] !== undefined ? subObj[subKey] : true)

    onChange({
      ...permissions,
      [modKey]: {
        ...currentMod,
        [actKey]: subObj
      }
    })
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 font-sans relative text-left">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          🔐 {normRole} Default Permissions Matrix
        </h4>
        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-extrabold text-slate-800"
        >
          <option value="ALL">🏢 All Departments</option>
          <option value="sales">🎯 Sales & BD</option>
          <option value="hrms">👥 HRMS</option>
          <option value="finance">💵 Finance</option>
        </select>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {allModules.map((mod) => {
          const modPerm = permissions[mod.key] || {}
          return (
            <div key={mod.key} className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
              <span className="font-bold text-xs text-slate-900">{mod.label}</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {ACTION_KEYS.map((act) => {
                  const actVal = modPerm[act.key]
                  const isActive = typeof actVal === 'boolean' ? actVal : (actVal?.enabled ?? (act.key === 'view'))
                  const isPopoverOpen = activePopover?.modKey === mod.key && activePopover?.actKey === act.key
                  const subItems = getModuleSubActions(mod.key, act.key)

                  return (
                    <div key={act.key} className="relative">
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => handleToggleAction(mod.key, act.key)}
                          className={`px-2 py-0.5 rounded-l-lg text-[10px] font-extrabold border-y border-l transition cursor-pointer ${
                            isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {act.icon} {act.label}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivePopover(isPopoverOpen ? null : { modKey: mod.key, actKey: act.key })}
                          className={`px-1 py-0.5 rounded-r-lg text-[9px] font-black border transition cursor-pointer ${
                            isActive ? 'bg-blue-700 text-white border-blue-600' : 'bg-slate-200 text-slate-600 border-slate-300'
                          }`}
                        >
                          ▼
                        </button>
                      </div>

                      {isPopoverOpen && (
                        <div className="absolute right-0 top-full mt-1.5 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-3 text-left space-y-2">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                            <span className="font-extrabold text-[10px] text-slate-900">{act.icon} {act.label} Sub-Actions</span>
                            <button type="button" onClick={() => setActivePopover(null)} className="text-slate-400 text-xs">✕</button>
                          </div>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {subItems.map((sub) => {
                              const subVal = typeof actVal === 'object' && actVal !== null && actVal[sub.key] !== undefined ? actVal[sub.key] : true
                              return (
                                <label key={sub.key} className="flex items-start gap-2 p-1 hover:bg-slate-50 rounded cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(subVal)}
                                    onChange={() => handleToggleSubAction(mod.key, act.key, sub.key)}
                                    className="mt-0.5 rounded text-blue-600 cursor-pointer"
                                  />
                                  <div>
                                    <p className="font-bold text-[10px] text-slate-800">{sub.label}</p>
                                    <p className="text-[9px] text-slate-400">{sub.desc}</p>
                                  </div>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AdminSettings() {
  const { showToast } = useToast()
  const fileInputRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // System settings state
  const [settingsData, setSettingsData] = useState({
    company_name: '',
    legal_name: '',
    tax_id_gstin: '',
    pan_no: '',
    registration_no: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    logo_url: '',
    currency: 'INR (₹)',
    time_zone: 'Asia/Kolkata (IST)',
    allow_self_signup: false,
    rate_limit_per_min: 60
  })

  // Role Permissions Master Defaults State
  const [rolePermissionsList, setRolePermissionsList] = useState([])
  const [selectedRoleKey, setSelectedRoleKey] = useState('Sales Executive')

  // Default Roles Master Templates list
  const defaultRolesList = [
    { id: 'sales_executive', name: 'Sales Executive', icon: '🎯', desc: 'Field sales rep permissions' },
    { id: 'team_lead', name: 'Team Lead', icon: '🔰', desc: 'Team oversight permissions' },
    { id: 'sales_manager', name: 'Sales Manager', icon: '👔', desc: 'Departmental manager permissions' },
    { id: 'super_admin', name: 'Super Admin', icon: '🛡️', desc: 'Full administrative access' },
    { id: 'ceo_founder', name: 'CEO / Founder', icon: '👑', desc: 'Executive dashboard & company view' },
  ]

  // Combine default roles with any custom roles from DB
  const availableRoles = useMemo(() => {
    const map = new Map()
    defaultRolesList.forEach(r => map.set(r.name, r))
    rolePermissionsList.forEach(rp => {
      if (rp.name && !map.has(rp.name)) {
        map.set(rp.name, {
          id: rp.id || rp.name.toLowerCase().replace(/\s+/g, '_'),
          name: rp.name,
          icon: '✨',
          desc: 'Custom organization role'
        })
      }
    })
    return Array.from(map.values())
  }, [rolePermissionsList])

  // Selected Role Object
  const currentRoleObj = useMemo(() => {
    return rolePermissionsList.find(r => r.name === selectedRoleKey || r.id === selectedRoleKey) || {
      name: selectedRoleKey,
      custom_permissions: {}
    }
  }, [rolePermissionsList, selectedRoleKey])

  // Load Settings on mount
  const loadSettings = async () => {
    setLoading(true)
    try {
      const res = await settingsAPI.getSettings()
      if (res && res.data) {
        const d = res.data
        setSettingsData({
          company_name: d.company_name || '',
          legal_name: d.legal_name || '',
          tax_id_gstin: d.tax_id_gstin || '',
          pan_no: d.pan_no || '',
          registration_no: d.registration_no || '',
          email: d.email || '',
          phone: d.phone || '',
          website: d.website || '',
          address: d.address || '',
          logo_url: d.logo_url || '',
          currency: d.currency || 'INR (₹)',
          time_zone: d.time_zone || 'Asia/Kolkata (IST)',
          allow_self_signup: d.allow_self_signup === true,
          rate_limit_per_min: d.rate_limit_per_min || 60
        })
        if (d.role_permissions && Array.isArray(d.role_permissions)) {
          setRolePermissionsList(d.role_permissions)
        }
      }
    } catch (err) {
      showToast('Error retrieving system settings', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    const finalValue = name === 'phone'
      ? normalizePhoneNumber(value)
      : type === 'checkbox' ? checked : value
    setSettingsData((prev) => ({
      ...prev,
      [name]: finalValue
    }))
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = async (event) => {
      const dataUrl = event.target?.result
      if (typeof dataUrl === 'string') {
        setSettingsData((prev) => ({ ...prev, logo_url: dataUrl }))
        showToast('Logo image uploaded. Click Save to persist.', 'info')
      }
    }
    reader.readAsDataURL(file)
  }

  // Update permissions for currently selected role in settingsData state
  const handleUpdateRolePerms = (updatedPerms) => {
    const existingIndex = rolePermissionsList.findIndex(r => r.name === selectedRoleKey)
    let nextList = [...rolePermissionsList]
    if (existingIndex >= 0) {
      nextList[existingIndex] = {
        ...nextList[existingIndex],
        custom_permissions: updatedPerms
      }
    } else {
      nextList.push({
        id: selectedRoleKey.toLowerCase().replace(/\s+/g, '_'),
        name: selectedRoleKey,
        custom_permissions: updatedPerms
      })
    }
    setRolePermissionsList(nextList)
  }

  // Handle Form Submit
  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await settingsAPI.updateSettings({
        ...settingsData,
        role_permissions: rolePermissionsList
      })
      showToast('System settings and Role Default Master Templates saved successfully!', 'success')
    } catch (err) {
      showToast('Failed to save settings to database', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl font-sans text-left pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" /> System Settings & RBAC Defaults
          </h1>
          <p className="text-xs text-slate-500 mt-1">Configure company profiles, localization, and default role-based access permissions.</p>
        </div>
        <button
          onClick={loadSettings}
          disabled={loading}
          className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} /> Reload Settings
        </button>
      </div>

      {loading ? (
        <div className="py-24 text-center text-xs text-slate-500 font-bold bg-white rounded-2xl border border-slate-200 shadow-xs">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          Fetching settings & role configuration data from database...
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Logo Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-6 items-center">
            <div className="relative shrink-0">
              {settingsData.logo_url ? (
                <img
                  src={settingsData.logo_url}
                  alt="Company Logo"
                  className="w-24 h-24 rounded-2xl object-cover border border-slate-200 shadow-xs bg-slate-50"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-blue-500/20">
                  {settingsData.company_name ? settingsData.company_name.substring(0, 2).toUpperCase() : 'TC'}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition cursor-pointer shadow-md shadow-blue-600/20"
                title="Upload Logo"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLogoUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
            <div className="text-center md:text-left space-y-1">
              <h3 className="text-sm font-extrabold text-slate-900">Organization Logo</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                Appears on company documents, PDF exports, and dashboard headers. Standard: 512x512px.
              </p>
            </div>
          </div>

          {/* Business details grid */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="w-4 h-4 text-blue-600" /> Organization Profile Details
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Trade / Brand Name</label>
                <input
                  type="text"
                  name="company_name"
                  value={settingsData.company_name}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-hidden focus:border-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Legal Entity Name</label>
                <input
                  type="text"
                  name="legal_name"
                  value={settingsData.legal_name}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-hidden focus:border-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">GSTIN / Tax ID</label>
                <input
                  type="text"
                  name="tax_id_gstin"
                  value={settingsData.tax_id_gstin}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-hidden focus:border-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">PAN Account Number</label>
                <input
                  type="text"
                  name="pan_no"
                  value={settingsData.pan_no}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-hidden focus:border-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Contact Email</label>
                <input
                  type="email"
                  name="email"
                  value={settingsData.email}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-hidden focus:border-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Contact Phone</label>
                <input
                  type="tel"
                  name="phone"
                  maxLength={10}
                  placeholder="10-digit number"
                  value={settingsData.phone}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-hidden focus:border-blue-500 font-semibold"
                />
              </div>
            </div>
          </div>

          {/* NEW CARD: ROLE-BASED ACCESS CONTROL (RBAC DEFAULTS) */}
          <div className="bg-gradient-to-br from-white via-white to-blue-50/30 p-6 rounded-2xl border border-blue-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-[#0B2545] tracking-tight flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" /> Role-Based Access Control (RBAC Master Defaults)
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Configure master default permissions for Sales Executive, Team Lead, Sales Manager, and any custom roles.
                </p>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-[10px] font-extrabold rounded-full border border-blue-200 self-start sm:self-center">
                ⚙️ Master Settings
              </span>
            </div>

            {/* Role Pills Selector Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-100">
              {availableRoles.map((r) => {
                const isSelected = selectedRoleKey === r.name
                return (
                  <button
                    key={r.id || r.name}
                    type="button"
                    onClick={() => setSelectedRoleKey(r.name)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition shrink-0 flex items-center gap-1.5 cursor-pointer border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{r.icon}</span>
                    <span>{r.name}</span>
                  </button>
                )
              })}
            </div>

            {/* Permission Matrix Editor for Selected Role */}
            <div className="space-y-2">
              <p className="text-[11px] text-slate-500 font-semibold">
                Configure default module permissions & action capabilities for <strong>'{selectedRoleKey}'</strong>. When Admin chooses Default Role Preset in User Management, these exact settings apply automatically.
              </p>
              <SettingsPermissionMatrixEditor
                role={selectedRoleKey}
                permissions={currentRoleObj.custom_permissions || currentRoleObj.structured_permissions || {}}
                onChange={handleUpdateRolePerms}
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 shadow-md shadow-blue-600/20 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" /> {saving ? 'Saving changes...' : 'Save All Settings & Role Defaults'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default AdminSettings
