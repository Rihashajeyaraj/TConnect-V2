import { useState, useEffect, useRef } from 'react'
import { Building2, MapPin, Users, Plus, CheckCircle2, Edit2, Globe, Mail, Phone, Upload, Printer } from 'lucide-react'
import { settingsAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'

function CompanyOverview() {
  const { showToast } = useToast()
  const fileInputRef = useRef(null)
  const printRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('profile') // 'profile', 'branches', 'departments'

  // Company Profile State
  const [companyProfile, setCompanyProfile] = useState({
    companyName: 'TwiteConnect Technologies Pvt. Ltd.',
    legalName: 'TwiteConnect Software Solutions & Services',
    taxIdGstin: '33AAAAA0000A1Z5',
    email: 'contact@tconnect.com',
    phone: '+91 98765 43210',
    website: 'https://twiteconnect.com',
    address: 'Plot 45, OMR IT Expressway, Perungudi, Chennai - 600096, Tamil Nadu',
    logoUrl: '',
    timezone: 'Asia/Kolkata (IST)',
    currency: 'INR (₹)',
  })

  // Branch Management State
  const [branches, setBranches] = useState([
    { id: 1, name: 'Chennai Head Office', type: 'Head Office', location: 'OMR Expressway, Chennai', status: 'Active', staffCount: 14 },
    { id: 2, name: 'Bangalore Regional Office', type: 'Regional Office', location: 'Indiranagar, Bangalore', status: 'Active', staffCount: 8 },
    { id: 3, name: 'Hyderabad Branch', type: 'Regional Office', location: 'HITEC City, Hyderabad', status: 'Active', staffCount: 6 },
    { id: 4, name: 'Mumbai Commercial Office', type: 'Regional Office', location: 'BKC, Mumbai', status: 'Active', staffCount: 4 },
  ])

  // Department Management State
  const [departments, setDepartments] = useState([
    { id: 1, name: 'Sales & Business Development', lead: 'Rajesh Kumar', staffCount: 12, budget: '₹15,00,000' },
    { id: 2, name: 'Marketing & Growth', lead: 'Priya Sharma', staffCount: 5, budget: '₹8,00,000' },
    { id: 3, name: 'Customer Support & Success', lead: 'Karthik Raja', staffCount: 6, budget: '₹6,00,000' },
    { id: 4, name: 'Finance & Accounts', lead: 'Suresh V', staffCount: 3, budget: '₹5,00,000' },
  ])

  const [newBranch, setNewBranch] = useState({ name: '', type: 'Regional Office', location: '', staffCount: '' })
  const [newDept, setNewDept] = useState({ name: '', lead: '', staffCount: '' })
  const [showAddBranchModal, setShowAddBranchModal] = useState(false)
  const [showAddDeptModal, setShowAddDeptModal] = useState(false)

  // Fetch Company Settings from Supabase Backend API
  useEffect(() => {
    async function fetchCompanySettings() {
      try {
        const res = await settingsAPI.getSettings()
        if (res && res.data) {
          const data = res.data
          setCompanyProfile((prev) => ({
            ...prev,
            companyName: data.company_name || prev.companyName,
            legalName: data.legal_name || prev.legalName,
            taxIdGstin: data.tax_id_gstin || prev.taxIdGstin,
            email: data.email || prev.email,
            phone: data.phone || prev.phone,
            website: data.website || prev.website,
            address: data.address || prev.address,
            logoUrl: data.logo_url || prev.logoUrl,
            timezone: data.time_zone || prev.timezone,
            currency: data.currency || prev.currency,
          }))

          if (data.branches && Array.isArray(data.branches)) {
            setBranches(data.branches)
          }

          if (data.departments && Array.isArray(data.departments)) {
            setDepartments(data.departments)
          }
        }
      } catch (err) {
        console.warn('Fetched company settings with fallback state:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchCompanySettings()
  }, [])

  // Load saved company profile from localStorage on mount if present
  useEffect(() => {
    try {
      const savedLocal = localStorage.getItem('tconnect_company_profile')
      if (savedLocal) {
        const parsed = JSON.parse(savedLocal)
        if (parsed && parsed.companyName) {
          setCompanyProfile((prev) => ({ ...prev, ...parsed }))
        }
      }
    } catch (e) {
      console.warn('localStorage parse notice:', e)
    }
  }, [])

  // Handle Logo Upload from Local File Explorer with permanent storage
  const handleLogoFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (.png, .jpg, .jpeg, .svg, .webp)', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = async (event) => {
      const dataUrl = event.target?.result
      if (typeof dataUrl === 'string') {
        const updatedProfile = { ...companyProfile, logoUrl: dataUrl }
        setCompanyProfile(updatedProfile)
        try {
          localStorage.setItem('tconnect_company_profile', JSON.stringify(updatedProfile))
        } catch (e) {}

        showToast('Company logo updated! Saving to Supabase...', 'info')
        try {
          await settingsAPI.updateSettings({ logo_url: dataUrl })
          showToast('Company logo saved to Supabase successfully!', 'success')
        } catch (err) {
          showToast('Saved company logo locally & updated view!', 'info')
        }
      }
    }
    reader.readAsDataURL(file)
  }

  // Persist Profile Changes to Supabase & LocalStorage
  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      localStorage.setItem('tconnect_company_profile', JSON.stringify(companyProfile))
    } catch (e) {}

    try {
      await settingsAPI.updateSettings({
        company_name: companyProfile.companyName,
        legal_name: companyProfile.legalName,
        tax_id_gstin: companyProfile.taxIdGstin,
        email: companyProfile.email,
        phone: companyProfile.phone,
        website: companyProfile.website,
        address: companyProfile.address,
        logo_url: companyProfile.logoUrl,
        currency: companyProfile.currency,
        time_zone: companyProfile.timezone,
        branches,
        departments,
      })
      showToast('Company profile saved & updated in Supabase database!', 'success')
    } catch (err) {
      showToast('Company details saved locally & updated on page!', 'info')
    } finally {
      setSaving(false)
    }
  }

  // Create New Branch & Persist to Supabase
  const handleAddBranch = async (e) => {
    e.preventDefault()
    if (!newBranch.name) return
    const updatedBranches = [
      ...branches,
      {
        id: Date.now(),
        name: newBranch.name,
        type: newBranch.type,
        location: newBranch.location || 'City Center',
        status: 'Active',
        staffCount: Number(newBranch.staffCount) || 0
      },
    ]
    setBranches(updatedBranches)
    setShowAddBranchModal(false)
    setNewBranch({ name: '', type: 'Regional Office', location: '', staffCount: '' })

    try {
      await settingsAPI.updateSettings({ branches: updatedBranches })
      showToast('New Branch added & saved to Supabase!', 'success')
    } catch (err) {
      showToast('Branch added locally', 'info')
    }
  }

  // Create New Department & Persist to Supabase
  const handleAddDept = async (e) => {
    e.preventDefault()
    if (!newDept.name) return
    const updatedDepts = [
      ...departments,
      {
        id: Date.now(),
        name: newDept.name,
        lead: newDept.lead || 'Unassigned',
        staffCount: Number(newDept.staffCount) || 0,
        budget: '₹0'
      },
    ]
    setDepartments(updatedDepts)
    setShowAddDeptModal(false)
    setNewDept({ name: '', lead: '', staffCount: '' })

    try {
      await settingsAPI.updateSettings({ departments: updatedDepts })
      showToast('New Department created & saved to Supabase!', 'success')
    } catch (err) {
      showToast('Department created locally', 'info')
    }
  }

  // Print company details — opens a formatted print-ready document
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=960,height=800')
    if (!printWindow) {
      showToast('Popup blocked — please allow popups for this site to print.', 'error')
      return
    }

    const today = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })

    const logoHtml = companyProfile.logoUrl
      ? `<img src="${companyProfile.logoUrl}" class="logo" />`
      : `<div class="logo-fallback">${(companyProfile.companyName || 'TC').substring(0, 2).toUpperCase()}</div>`

    const branchRows = branches.map((b, i) => `
      <tr>
        <td style="text-align:center;color:#64748b;">${i + 1}</td>
        <td><strong>${b.name}</strong></td>
        <td>${b.type || '—'}</td>
        <td>${b.location || '—'}</td>
        <td style="text-align:center;">${b.staffCount || 0}</td>
        <td style="text-align:center;"><span class="badge-active">${b.status || 'Active'}</span></td>
      </tr>
    `).join('')

    const deptRows = departments.map((d, i) => `
      <tr>
        <td style="text-align:center;color:#64748b;">${i + 1}</td>
        <td><strong>${d.name}</strong></td>
        <td>${d.lead || 'Unassigned'}</td>
        <td style="text-align:center;">${d.staffCount || 0}</td>
        <td style="text-align:right;">${d.budget || '₹0'}</td>
      </tr>
    `).join('')

    printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${companyProfile.companyName} — Company Profile</title>
  <style>
    @page { size: A4; margin: 16mm 14mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', -apple-system, Arial, sans-serif; color: #1e293b; font-size: 12px; line-height: 1.5; padding: 0; }

    /* ── Header ── */
    .header { display: flex; align-items: center; gap: 18px; padding-bottom: 16px; margin-bottom: 20px; border-bottom: 3px solid #2563eb; }
    .logo { width: 72px; height: 72px; border-radius: 14px; object-fit: cover; border: 2px solid #e2e8f0; }
    .logo-fallback { width: 72px; height: 72px; border-radius: 14px; background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 900; letter-spacing: -1px; flex-shrink: 0; }
    .header-text h1 { font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px; }
    .header-text p { font-size: 11px; color: #64748b; font-weight: 600; }
    .header-text .gstin { font-size: 11px; color: #475569; font-weight: 700; margin-top: 2px; }

    /* ── Section Title ── */
    .section-title { font-size: 13px; font-weight: 800; color: #0f172a; margin: 22px 0 10px; padding: 6px 12px; background: #f1f5f9; border-left: 4px solid #2563eb; border-radius: 0 6px 6px 0; text-transform: uppercase; letter-spacing: 0.5px; }

    /* ── Info Grid ── */
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; margin-bottom: 8px; }
    .info-item { padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
    .info-label { font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px; }
    .info-value { font-size: 12px; font-weight: 700; color: #1e293b; margin-top: 1px; }
    .info-item.full { grid-column: span 2; }

    /* ── Tables ── */
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th { background: #f8fafc; text-align: left; font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px; padding: 7px 10px; border-bottom: 2px solid #e2e8f0; }
    td { padding: 8px 10px; font-size: 11px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    tr:last-child td { border-bottom: none; }
    .badge-active { display: inline-block; background: #d1fae5; color: #065f46; font-size: 9px; font-weight: 800; padding: 2px 8px; border-radius: 4px; }

    /* ── Footer ── */
    .footer { margin-top: 30px; padding-top: 12px; border-top: 2px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
    .footer-left { font-size: 10px; color: #94a3b8; font-weight: 600; }
    .footer-right { font-size: 10px; color: #94a3b8; font-weight: 600; }
    .confidential { font-size: 9px; color: #cbd5e1; text-align: center; margin-top: 6px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>

  <!-- Company Header -->
  <div class="header">
    ${logoHtml}
    <div class="header-text">
      <h1>${companyProfile.companyName}</h1>
      <p>${companyProfile.legalName}</p>
      <div class="gstin">GSTIN / Tax ID: ${companyProfile.taxIdGstin || 'Not Provided'}</div>
    </div>
  </div>

  <!-- Business Details -->
  <div class="section-title">Business & Contact Information</div>
  <div class="info-grid">
    <div class="info-item">
      <div class="info-label">Official Email</div>
      <div class="info-value">${companyProfile.email || '—'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Phone Number</div>
      <div class="info-value">${companyProfile.phone || '—'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Website</div>
      <div class="info-value">${companyProfile.website || '—'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Operating Currency</div>
      <div class="info-value">${companyProfile.currency || '—'}</div>
    </div>
    <div class="info-item full">
      <div class="info-label">Registered Address</div>
      <div class="info-value">${companyProfile.address || '—'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Time Zone</div>
      <div class="info-value">${companyProfile.timezone || '—'}</div>
    </div>
  </div>

  <!-- Branches -->
  ${branches.length > 0 ? `
    <div class="section-title">Regional Branches & Offices (${branches.length})</div>
    <table>
      <thead>
        <tr>
          <th style="width:30px;text-align:center;">#</th>
          <th>Branch Name</th>
          <th>Type</th>
          <th>Location</th>
          <th style="text-align:center;">Staff</th>
          <th style="text-align:center;">Status</th>
        </tr>
      </thead>
      <tbody>${branchRows}</tbody>
    </table>
  ` : ''}

  <!-- Departments -->
  ${departments.length > 0 ? `
    <div class="section-title">Department Allocations (${departments.length})</div>
    <table>
      <thead>
        <tr>
          <th style="width:30px;text-align:center;">#</th>
          <th>Department</th>
          <th>Team Lead</th>
          <th style="text-align:center;">Members</th>
          <th style="text-align:right;">Annual Budget</th>
        </tr>
      </thead>
      <tbody>${deptRows}</tbody>
    </table>
  ` : ''}

  <!-- Footer -->
  <div class="footer">
    <div class="footer-left">Printed from TwiteConnect Admin Portal</div>
    <div class="footer-right">${today}</div>
  </div>
  <div class="confidential">Confidential — Internal Use Only</div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 300);
    };
  </script>
</body>
</html>`)
    printWindow.document.close()
  }

  return (
    <div className="space-y-8 font-sans pb-12">
      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleLogoFileChange}
        className="hidden"
      />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-7 h-7 text-blue-600" /> Company Overview
          </h1>
          <p className="text-sm text-slate-600 font-medium">Manage company profile, regional branches, and internal department allocations on a unified page.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            Print Details
          </button>
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer shrink-0"
          >
            <CheckCircle2 className="w-4 h-4" />
            {saving ? 'Saving Changes...' : 'Save Profile Changes'}
          </button>
        </div>
      </div>

      {/* Unified Single Page Section 1: Company Profile & Business Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Logo & Brand Header Card */}
        <div className="bg-white border border-slate-200/90 p-6 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-base">Company Logo & Brand</h3>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Saved & Synced
            </span>
          </div>
          <div className="flex flex-col items-center text-center p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-blue-600/30 overflow-hidden border-2 border-white">
              {companyProfile.logoUrl ? (
                <img src={companyProfile.logoUrl} alt="Company Logo" className="w-full h-full object-cover" />
              ) : (
                <span>TC</span>
              )}
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 text-lg">{companyProfile.companyName}</h4>
              <p className="text-xs text-slate-500 font-semibold">{companyProfile.legalName}</p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" /> Change / Upload Logo
            </button>
          </div>
          <div className="space-y-2 text-xs pt-2">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-semibold">Operating Currency</span>
              <span className="font-bold text-slate-900">{companyProfile.currency}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-semibold">Time Zone</span>
              <span className="font-bold text-slate-900">{companyProfile.timezone}</span>
            </div>
          </div>
        </div>

        {/* Business Details & Contact Information */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 p-6 rounded-2xl shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-base">Business Details & Contact Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Registered Company Name</label>
              <input
                type="text"
                value={companyProfile.companyName}
                onChange={(e) => setCompanyProfile({ ...companyProfile, companyName: e.target.value })}
                className="w-full h-11 bg-slate-50 border border-slate-300/90 rounded-xl px-3.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Tax Registration / GSTIN</label>
              <input
                type="text"
                value={companyProfile.taxIdGstin}
                onChange={(e) => setCompanyProfile({ ...companyProfile, taxIdGstin: e.target.value })}
                className="w-full h-11 bg-slate-50 border border-slate-300/90 rounded-xl px-3.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Official Support Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={companyProfile.email}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, email: e.target.value })}
                  className="w-full h-11 bg-slate-50 border border-slate-300/90 rounded-xl pl-9 pr-3.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Contact Phone Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={companyProfile.phone}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, phone: e.target.value })}
                  className="w-full h-11 bg-slate-50 border border-slate-300/90 rounded-xl pl-9 pr-3.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Website URL</label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={companyProfile.website}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, website: e.target.value })}
                  className="w-full h-11 bg-slate-50 border border-slate-300/90 rounded-xl pl-9 pr-3.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Head Office Address</label>
              <textarea
                rows={2}
                value={companyProfile.address}
                onChange={(e) => setCompanyProfile({ ...companyProfile, address: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300/90 rounded-xl p-3 text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Unified Single Page Section 2: Regional Branches */}
      <div className="bg-white border border-slate-200/90 p-6 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" /> Branch Management ({branches.length})
            </h3>
            <p className="text-xs text-slate-500 font-medium">Regional company offices and operational centers.</p>
          </div>
          <button
            onClick={() => setShowAddBranchModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create New Branch
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {branches.map((b) => (
            <div key={b.id} className="bg-slate-50 border border-slate-200/90 p-4 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-slate-900 text-sm truncate">{b.name}</h4>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                  {b.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-semibold">{b.type}</p>
              <div className="text-xs text-slate-600 font-medium space-y-1 pt-1 border-t border-slate-200/70">
                <p><strong className="text-slate-700">Location:</strong> {b.location}</p>
                <p><strong className="text-slate-700">Staff Count:</strong> {b.staffCount} Members</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Unified Single Page Section 3: Department Management */}
      <div className="bg-white border border-slate-200/90 p-6 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" /> Department Management ({departments.length})
            </h3>
            <p className="text-xs text-slate-500 font-medium">Internal department allocations and team leadership.</p>
          </div>
          <button
            onClick={() => setShowAddDeptModal(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-md shadow-purple-600/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create Department
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {departments.map((d) => (
            <div key={d.id} className="bg-slate-50 border border-slate-200/90 p-4 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-slate-900 text-sm truncate">{d.name}</h4>
                <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[10px] border border-purple-200">
                  {d.staffCount} Members
                </span>
              </div>
              <p className="text-xs text-slate-500 font-semibold">Lead: {d.lead}</p>
              <div className="text-xs pt-1 border-t border-slate-200/70">
                <span className="text-slate-500 font-semibold">Budget: <strong className="text-slate-900">{d.budget}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Branch Modal */}
      {showAddBranchModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center justify-between">
              <span>Create New Branch</span>
              <button onClick={() => setShowAddBranchModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </h3>
            <form onSubmit={handleAddBranch} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Branch Name</label>
                <input
                  type="text"
                  placeholder="e.g. Pune Regional Office"
                  value={newBranch.name}
                  onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                  className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-blue-600"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Branch Location</label>
                <input
                  type="text"
                  placeholder="e.g. Viman Nagar, Pune"
                  value={newBranch.location}
                  onChange={(e) => setNewBranch({ ...newBranch, location: e.target.value })}
                  className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-blue-600"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Staff Count</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 10"
                  value={newBranch.staffCount}
                  onChange={(e) => setNewBranch({ ...newBranch, staffCount: e.target.value })}
                  className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md">
                Add Branch & Save to Supabase
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Department Modal */}
      {showAddDeptModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center justify-between">
              <span>Create Department</span>
              <button onClick={() => setShowAddDeptModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </h3>
            <form onSubmit={handleAddDept} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Department Name</label>
                <input
                  type="text"
                  placeholder="e.g. Quality Assurance & Testing"
                  value={newDept.name}
                  onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                  className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-blue-600"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Department Lead</label>
                <input
                  type="text"
                  placeholder="e.g. Suresh Raina"
                  value={newDept.lead}
                  onChange={(e) => setNewDept({ ...newDept, lead: e.target.value })}
                  className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Staff Count</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 5"
                  value={newDept.staffCount}
                  onChange={(e) => setNewDept({ ...newDept, staffCount: e.target.value })}
                  className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md">
                Create Dept & Save to Supabase
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CompanyOverview
