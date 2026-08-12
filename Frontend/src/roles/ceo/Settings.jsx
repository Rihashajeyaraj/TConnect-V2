import React, { useState, useEffect } from 'react'
import {
  Settings as SettingsIcon,
  Building2,
  Users,
  Shield,
  Target,
  Sliders,
  CheckCircle2,
  Save,
  Plus,
  Trash2,
  DollarSign,
  Globe,
  Mail,
  Phone,
  MapPin,
  Lock,
} from 'lucide-react'
import { useToast } from '../../common/ToastContext.jsx'
import { settingsAPI } from '../../services/api.js'

function CeoSettings() {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState('company') // 'company' | 'departments' | 'roles' | 'targets' | 'general'
  const [saving, setSaving] = useState(false)

  // 1. Company Details State
  const [companyDetails, setCompanyDetails] = useState({
    company_name: 'TwiteConnect Technologies Pvt. Ltd.',
    legal_name: 'TwiteConnect Software Solutions & Services Pvt Ltd',
    registration_no: 'U72200TN2026PTC123456',
    gst_no: '33AAAAA0000A1Z5',
    pan_no: 'AAAAA1111A',
    email: 'ceo.office@tconnect.com',
    phone: '+91 98765 43210',
    website: 'https://twiteconnect.com',
    address: 'Plot 45, OMR IT Expressway, Perungudi, Chennai - 600096, Tamil Nadu, India',
    currency: 'INR (₹)',
    timezone: 'Asia/Kolkata (IST)',
  })

  // 2. Departments State
  const [departments, setDepartments] = useState([])

  // 3. Roles & Permissions State
  const [permissionsMatrix, setPermissionsMatrix] = useState({
    CEO: { crm: 'Full Control', hrms: 'Full Control', finance: 'Full Control', approvals: 'Executive Master', settings: 'Full Control' },
    Admin: { crm: 'Manage All', hrms: 'Manage Staff', finance: 'View Only', approvals: 'Operational', settings: 'System Config' },
    'Sales Manager': { crm: 'Team Pipeline', hrms: 'Team Attendance', finance: 'Team Revenue', approvals: 'Team Level', settings: 'No Access' },
    'Sales Executive': { crm: 'Assigned Leads', hrms: 'Self Attendance/Leaves', finance: 'No Access', approvals: 'Submit Only', settings: 'No Access' },
  })

  // 4. Sales Targets State
  const [salesTargets, setSalesTargets] = useState({
    annualTarget: 35000000,
    q1Target: 7500000,
    q2Target: 8500000,
    q3Target: 9500000,
    q4Target: 9500000,
    managerSouthTarget: 20000000,
    managerWestTarget: 15000000,
    executiveMinMonthly: 500000,
  })

  // 5. General Settings State
  const [generalSettings, setGeneralSettings] = useState({
    fiscalYearStart: 'April 1',
    autoApproveLeavesUnderHours: false,
    geofenceRadiusMeters: 450,
    biometricVerificationRequired: true,
    emailAlertsEnabled: true,
    leadInactivityAlertDays: 7,
  })

  // Fetch settings from backend if available
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await settingsAPI.getSettings().catch(() => null)
        if (res && res.data) {
          setCompanyDetails((prev) => ({
            ...prev,
            company_name: res.data.company_name || prev.company_name,
            gst_no: res.data.tax_id_gstin || prev.gst_no,
            email: res.data.email || prev.email,
            phone: res.data.phone || prev.phone,
            address: res.data.address || prev.address,
          }))
        }
      } catch {
        // fallback
      }
    }
    loadSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await settingsAPI.updateSettings(companyDetails).catch(() => null)
      localStorage.setItem('tc_ceo_settings', JSON.stringify({ companyDetails, salesTargets, generalSettings }))
      showToast('Settings saved successfully!', 'success')
    } catch {
      showToast('Settings updated locally!', 'info')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-[#F8CAE4]/20 text-[#832D51]">
              <SettingsIcon className="size-4.5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Executive Settings & Corporate Governance
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-medium max-w-3xl">
            Manage company registration credentials, corporate departments, role permission matrices, organizational sales benchmarks, and system configurations.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-[#832D51] hover:bg-[#6a2240] text-white px-5 py-2.5 text-xs font-black transition shadow-xs"
        >
          <Save className="size-4" />
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
        {[
          { key: 'company', label: 'Company Details', icon: Building2 },
          { key: 'departments', label: 'Departments & Budget', icon: Users },
          { key: 'roles', label: 'Roles & Permissions', icon: Shield },
          { key: 'targets', label: 'Sales Targets', icon: Target },
          { key: 'general', label: 'General Settings', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                isActive
                  ? 'bg-[#832D51] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="size-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── TAB 1: COMPANY DETAILS ────────────────────────────── */}
      {activeTab === 'company' && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Corporate Entity & Registration Details
            </h2>
            <p className="text-xs text-slate-500 font-medium">Official statutory and contact parameters</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Company Trading Name</label>
              <input
                type="text"
                value={companyDetails.company_name}
                onChange={(e) => setCompanyDetails({ ...companyDetails, company_name: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-900 outline-none focus:border-[#832D51]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Full Legal Name</label>
              <input
                type="text"
                value={companyDetails.legal_name}
                onChange={(e) => setCompanyDetails({ ...companyDetails, legal_name: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-900 outline-none focus:border-[#832D51]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">GSTIN Number</label>
              <input
                type="text"
                value={companyDetails.gst_no}
                onChange={(e) => setCompanyDetails({ ...companyDetails, gst_no: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-900 outline-none focus:border-[#832D51]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">PAN Number</label>
              <input
                type="text"
                value={companyDetails.pan_no}
                onChange={(e) => setCompanyDetails({ ...companyDetails, pan_no: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-900 outline-none focus:border-[#832D51]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Executive Office Email</label>
              <input
                type="email"
                value={companyDetails.email}
                onChange={(e) => setCompanyDetails({ ...companyDetails, email: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-900 outline-none focus:border-[#832D51]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Official Contact Phone</label>
              <input
                type="text"
                value={companyDetails.phone}
                onChange={(e) => setCompanyDetails({ ...companyDetails, phone: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-900 outline-none focus:border-[#832D51]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Headquarters Address</label>
              <textarea
                value={companyDetails.address}
                onChange={(e) => setCompanyDetails({ ...companyDetails, address: e.target.value })}
                rows={2}
                className="w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-900 outline-none focus:border-[#832D51]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Operational Currency</label>
              <input
                type="text"
                value={companyDetails.currency}
                disabled
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold text-slate-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Default Timezone</label>
              <input
                type="text"
                value={companyDetails.timezone}
                disabled
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold text-slate-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: DEPARTMENTS & BUDGET ───────────────────────── */}
      {activeTab === 'departments' && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Corporate Departments & Budgets
              </h2>
              <p className="text-xs text-slate-500 font-medium">Department leads and annual operational allocation</p>
            </div>
          </div>

          <div className="space-y-3">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-xs"
              >
                <div>
                  <h4 className="font-extrabold text-slate-900">{dept.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Department Head: {dept.lead} · {dept.staffCount} Staff</p>
                </div>
                <div className="text-right">
                  <span className="font-black text-[#832D51] text-sm">{dept.budget}</span>
                  <p className="text-[10px] text-slate-400">Allocated Budget</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: ROLES & PERMISSIONS ────────────────────────── */}
      {activeTab === 'roles' && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Role Access & Permissions Matrix
            </h2>
            <p className="text-xs text-slate-500 font-medium">Hierarchical module permissions across roles</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3">Role</th>
                  <th className="pb-3">CRM & Sales</th>
                  <th className="pb-3">HRMS & Attendance</th>
                  <th className="pb-3">Financials</th>
                  <th className="pb-3">Approvals</th>
                  <th className="pb-3">System Settings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {Object.entries(permissionsMatrix).map(([role, perms]) => (
                  <tr key={role} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 font-extrabold text-slate-900">{role}</td>
                    <td className="py-3 text-slate-700">{perms.crm}</td>
                    <td className="py-3 text-slate-700">{perms.hrms}</td>
                    <td className="py-3 text-slate-700">{perms.finance}</td>
                    <td className="py-3 text-slate-700">{perms.approvals}</td>
                    <td className="py-3 text-slate-700">{perms.settings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: SALES TARGETS ──────────────────────────────── */}
      {activeTab === 'targets' && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Organizational Sales Target Benchmarks
            </h2>
            <p className="text-xs text-slate-500 font-medium">Annual, quarterly, and regional sales quotas</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Annual Corporate Target (₹)</label>
              <input
                type="number"
                value={salesTargets.annualTarget}
                onChange={(e) => setSalesTargets({ ...salesTargets, annualTarget: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-900 outline-none focus:border-[#832D51]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">South Region Quota</label>
              <input
                type="number"
                value={salesTargets.managerSouthTarget}
                onChange={(e) => setSalesTargets({ ...salesTargets, managerSouthTarget: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-900 outline-none focus:border-[#832D51]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Tech & West Region Quota</label>
              <input
                type="number"
                value={salesTargets.managerWestTarget}
                onChange={(e) => setSalesTargets({ ...salesTargets, managerWestTarget: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-900 outline-none focus:border-[#832D51]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Min. Executive Monthly Target (₹)</label>
              <input
                type="number"
                value={salesTargets.executiveMinMonthly}
                onChange={(e) => setSalesTargets({ ...salesTargets, executiveMinMonthly: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-900 outline-none focus:border-[#832D51]"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: GENERAL SETTINGS ───────────────────────────── */}
      {activeTab === 'general' && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              General System Configurations
            </h2>
            <p className="text-xs text-slate-500 font-medium">Platform parameters and verification thresholds</p>
          </div>

          <div className="space-y-4 text-xs font-semibold text-slate-800">
            <div className="flex items-center justify-between rounded-xl border border-slate-100 p-3.5 bg-slate-50/60">
              <div>
                <p className="font-bold text-slate-900">Biometric Attendance Verification</p>
                <p className="text-[11px] text-slate-500">Require face match and liveness verification for check-in</p>
              </div>
              <input
                type="checkbox"
                checked={generalSettings.biometricVerificationRequired}
                onChange={(e) => setGeneralSettings({ ...generalSettings, biometricVerificationRequired: e.target.checked })}
                className="size-4 accent-[#832D51]"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-100 p-3.5 bg-slate-50/60">
              <div>
                <p className="font-bold text-slate-900">Spatial Geofence Radius</p>
                <p className="text-[11px] text-slate-500">Allow client visit check-in within {generalSettings.geofenceRadiusMeters} meters</p>
              </div>
              <input
                type="number"
                value={generalSettings.geofenceRadiusMeters}
                onChange={(e) => setGeneralSettings({ ...generalSettings, geofenceRadiusMeters: Number(e.target.value) })}
                className="w-24 rounded-lg border border-slate-200 p-1.5 font-bold text-slate-900 text-center"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-100 p-3.5 bg-slate-50/60">
              <div>
                <p className="font-bold text-slate-900">Executive Email Notifications</p>
                <p className="text-[11px] text-slate-500">Send high-priority alerts on major deals and pending leaves</p>
              </div>
              <input
                type="checkbox"
                checked={generalSettings.emailAlertsEnabled}
                onChange={(e) => setGeneralSettings({ ...generalSettings, emailAlertsEnabled: e.target.checked })}
                className="size-4 accent-[#832D51]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CeoSettings
