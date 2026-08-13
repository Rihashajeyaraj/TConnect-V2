import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Building2,
  MapPin,
  Users,
  Plus,
  CheckCircle2,
  Edit2,
  Globe,
  Mail,
  Phone,
  Upload,
  Printer,
  Briefcase,
  Layers,
  ShoppingBag,
  Target,
  Bookmark,
  Search,
  XCircle,
  Trash2,
  RefreshCw,
  FolderOpen
} from 'lucide-react'
import { settingsAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'

const TABS = [
  { key: 'profile', label: 'Company Profile', icon: Building2, color: 'text-blue-600 bg-blue-50 border-blue-100' },
  { key: 'branches', label: 'Branches & Locations', icon: Building2, color: 'text-blue-600 bg-blue-50 border-blue-100' },
  { key: 'departments', label: 'Departments', icon: Briefcase, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  { key: 'designations', label: 'Designations', icon: Layers, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
  { key: 'products', label: 'Products & Services', icon: ShoppingBag, color: 'text-rose-600 bg-rose-50 border-rose-100' },
  { key: 'lead_sources', label: 'Lead Sources', icon: Target, color: 'text-amber-600 bg-amber-50 border-amber-100' },
  { key: 'customer_categories', label: 'Customer Categories', icon: Bookmark, color: 'text-purple-600 bg-purple-50 border-purple-100' }
]

function CompanyOverview() {
  const { showToast } = useToast()
  const fileInputRef = useRef(null)
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

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

  // Master Lists Data State
  const [masterData, setMasterData] = useState({
    branches: [],
    departments: [],
    designations: [],
    products: [],
    lead_sources: [],
    customer_categories: []
  })

  // Modal Control States
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  
  // Modal Form Inputs State
  const [itemName, setItemName] = useState('')
  const [itemType, setItemType] = useState('Regional Office') // for branch
  const [itemLocation, setItemLocation] = useState('') // for branch
  const [itemLead, setItemLead] = useState('') // for department
  const [itemPrice, setItemPrice] = useState('') // for product
  const [itemStatus, setItemStatus] = useState('Active')

  // Load Settings & Master Lists from Supabase
  const loadCompanySettings = async () => {
    setLoading(true)
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

        setMasterData({
          branches: Array.isArray(data.branches) ? data.branches : [],
          departments: Array.isArray(data.departments) ? data.departments : [],
          designations: Array.isArray(data.designations) ? data.designations : [],
          products: Array.isArray(data.products) ? data.products : [],
          lead_sources: Array.isArray(data.lead_sources) ? data.lead_sources : [],
          customer_categories: Array.isArray(data.customer_categories) ? data.customer_categories : []
        })
      }
    } catch (err) {
      console.warn('Fetched company settings with fallback state:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCompanySettings()
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

  // Handle Logo Upload from Local File Explorer
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

  // Persist Profile Details
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
      })
      showToast('Company profile saved & updated in Supabase database!', 'success')
    } catch (err) {
      showToast('Company details saved locally & updated on page!', 'info')
    } finally {
      setSaving(false)
    }
  }

  // Filter list based on search query
  const filteredList = useMemo(() => {
    if (activeTab === 'profile') return []
    const list = masterData[activeTab] || []
    if (!searchQuery.trim()) return list
    const q = searchQuery.toLowerCase().trim()
    return list.filter((item) => {
      const nameMatch = (item.name || '').toLowerCase().includes(q)
      const extraMatch = 
        (item.location || '').toLowerCase().includes(q) ||
        (item.lead || '').toLowerCase().includes(q) ||
        (item.price || '').toLowerCase().includes(q)
      return nameMatch || extraMatch
    })
  }, [masterData, activeTab, searchQuery])

  // Open Add Modal
  const handleOpenAdd = () => {
    setItemName('')
    setItemType('Regional Office')
    setItemLocation('')
    setItemLead('')
    setItemPrice('')
    setItemStatus('Active')
    setEditingItem(null)
    setShowAddModal(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    setEditingItem(item)
    setItemName(item.name || '')
    setItemType(item.type || 'Regional Office')
    setItemLocation(item.location || '')
    setItemLead(item.lead || '')
    setItemPrice(item.price || '')
    setItemStatus(item.status || 'Active')
    setShowAddModal(true)
  }

  // Form Submission
  const handleSubmitMasterItem = async (e) => {
    e.preventDefault()
    if (!itemName.trim()) {
      showToast('Name field is required', 'error')
      return
    }

    setSaving(true)
    const currentList = [...masterData[activeTab]]

    let updatedList
    if (editingItem) {
      // Edit
      updatedList = currentList.map((item) => {
        if (item.id === editingItem.id) {
          const updated = {
            ...item,
            name: itemName.trim(),
            status: itemStatus
          }
          if (activeTab === 'branches') {
            updated.type = itemType
            updated.location = itemLocation
          } else if (activeTab === 'departments') {
            updated.lead = itemLead
          } else if (activeTab === 'products') {
            updated.price = itemPrice
          }
          return updated
        }
        return item
      })
    } else {
      // Add
      const newItem = {
        id: activeTab === 'branches' || activeTab === 'departments' 
          ? Date.now() 
          : `${activeTab.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`,
        name: itemName.trim(),
        status: itemStatus
      }
      if (activeTab === 'branches') {
        newItem.type = itemType
        newItem.location = itemLocation
        newItem.staffCount = 0
      } else if (activeTab === 'departments') {
        newItem.lead = itemLead || 'Unassigned'
        newItem.staffCount = 0
        newItem.budget = '₹0'
      } else if (activeTab === 'products') {
        newItem.price = itemPrice || '₹0'
      }
      updatedList = [...currentList, newItem]
    }

    try {
      const payload = { [activeTab]: updatedList }
      await settingsAPI.updateSettings(payload)
      
      setMasterData((prev) => ({
        ...prev,
        [activeTab]: updatedList
      }))
      
      showToast(editingItem ? 'Item updated successfully!' : 'New item created successfully!', 'success')
      setShowAddModal(false)
    } catch (err) {
      showToast('Failed to save master data list to database', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Toggle Activation status
  const handleToggleStatus = async (item) => {
    setSaving(true)
    const currentList = [...masterData[activeTab]]
    const nextStatus = item.status === 'Active' ? 'Inactive' : 'Active'
    
    const updatedList = currentList.map((x) => 
      x.id === item.id ? { ...x, status: nextStatus } : x
    )

    try {
      const payload = { [activeTab]: updatedList }
      await settingsAPI.updateSettings(payload)
      
      setMasterData((prev) => ({
        ...prev,
        [activeTab]: updatedList
      }))
      
      showToast(`Status updated to ${nextStatus}`, 'success')
    } catch (err) {
      showToast('Failed to toggle status in Supabase', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Delete Item
  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this master data item?')) return
    
    setSaving(true)
    const currentList = [...masterData[activeTab]]
    const updatedList = currentList.filter((x) => x.id !== itemId)

    try {
      const payload = { [activeTab]: updatedList }
      await settingsAPI.updateSettings(payload)
      
      setMasterData((prev) => ({
        ...prev,
        [activeTab]: updatedList
      }))
      
      showToast('Item deleted successfully', 'success')
    } catch (err) {
      showToast('Failed to delete item from database', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Print company details
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

    const branchRows = masterData.branches.map((b, i) => `
      <tr>
        <td style="text-align:center;color:#64748b;">${i + 1}</td>
        <td><strong>${b.name}</strong></td>
        <td>${b.type || '—'}</td>
        <td>${b.location || '—'}</td>
        <td style="text-align:center;">${b.staffCount || 0}</td>
        <td style="text-align:center;"><span class="badge-active">${b.status || 'Active'}</span></td>
      </tr>
    `).join('')

    const deptRows = masterData.departments.map((d, i) => `
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
    .header { display: flex; align-items: center; gap: 18px; padding-bottom: 16px; margin-bottom: 20px; border-bottom: 3px solid #2563eb; }
    .logo { width: 72px; height: 72px; border-radius: 14px; object-fit: cover; border: 2px solid #e2e8f0; }
    .logo-fallback { width: 72px; height: 72px; border-radius: 14px; background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 900; letter-spacing: -1px; flex-shrink: 0; }
    .header-text h1 { font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px; }
    .header-text p { font-size: 11px; color: #64748b; font-weight: 600; }
    .header-text .gstin { font-size: 11px; color: #475569; font-weight: 700; margin-top: 2px; }
    .section-title { font-size: 13px; font-weight: 800; color: #0f172a; margin: 22px 0 10px; padding: 6px 12px; background: #f1f5f9; border-left: 4px solid #2563eb; border-radius: 0 6px 6px 0; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; margin-bottom: 8px; }
    .info-item { padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
    .info-label { font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px; }
    .info-value { font-size: 12px; font-weight: 700; color: #1e293b; margin-top: 1px; }
    .info-item.full { grid-column: span 2; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th { background: #f8fafc; text-align: left; font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px; padding: 7px 10px; border-bottom: 2px solid #e2e8f0; }
    td { padding: 8px 10px; font-size: 11px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    tr:last-child td { border-bottom: none; }
    .badge-active { display: inline-block; background: #d1fae5; color: #065f46; font-size: 9px; font-weight: 800; padding: 2px 8px; border-radius: 4px; }
    .footer { margin-top: 30px; padding-top: 12px; border-top: 2px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
    .footer-left { font-size: 10px; color: #94a3b8; font-weight: 600; }
    .footer-right { font-size: 10px; color: #94a3b8; font-weight: 600; }
    .confidential { font-size: 9px; color: #cbd5e1; text-align: center; margin-top: 6px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    ${logoHtml}
    <div class="header-text">
      <h1>${companyProfile.companyName}</h1>
      <p>${companyProfile.legalName}</p>
      <div class="gstin">GSTIN / Tax ID: ${companyProfile.taxIdGstin || 'Not Provided'}</div>
    </div>
  </div>
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
  ${masterData.branches.length > 0 ? `
    <div class="section-title">Regional Branches & Offices (${masterData.branches.length})</div>
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
  ${masterData.departments.length > 0 ? `
    <div class="section-title">Department Allocations (${masterData.departments.length})</div>
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
          <p className="text-sm text-slate-600 font-medium">Manage company profile and configurations on a unified page.</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'profile' ? (
            <>
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
                {saving ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </>
          ) : (
            <button
              onClick={handleOpenAdd}
              disabled={loading || saving}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md shadow-blue-600/20 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> Add {TABS.find(t => t.key === activeTab)?.label} Item
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tab Bar */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const TabIcon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key)
                setSearchQuery('')
              }}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
              }`}
            >
              <span className={`p-1 rounded-lg border ${isActive ? 'bg-white/20 border-white/30 text-white' : tab.color}`}>
                <TabIcon className="w-3.5 h-3.5" />
              </span>
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Main Content Area */}
      {activeTab === 'profile' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Logo brand card */}
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

          {/* Profile details card */}
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
      ) : (
        /* Unified Master Lists View Card */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 justify-between bg-slate-50/50">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={`Search ${TABS.find(t => t.key === activeTab)?.label.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={loadCompanySettings}
              title="Refresh database records"
              className="p-2 border border-slate-200 rounded-xl bg-white text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition cursor-pointer self-end sm:self-auto"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>

          {loading ? (
            <div className="py-20 text-center text-xs text-slate-500 font-bold">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
              Loading real master data from Supabase...
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-20 text-center max-w-md mx-auto space-y-4">
              <div className="size-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                <FolderOpen className="w-8 h-8" />
              </div>
              <div>
                <p className="font-extrabold text-slate-900 text-sm">No items found</p>
                <p className="text-xs text-slate-500 mt-1">There are currently no records listed in this category. Click "Add Item" to initialize your first database entry.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">ID</th>
                    <th className="px-6 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Name</th>
                    {activeTab === 'branches' && (
                      <>
                        <th className="px-6 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Type</th>
                        <th className="px-6 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Location</th>
                      </>
                    )}
                    {activeTab === 'departments' && (
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Dept Lead</th>
                    )}
                    {activeTab === 'products' && (
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Standard Price</th>
                    )}
                    <th className="px-6 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 text-center">Status</th>
                    <th className="px-6 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                  {filteredList.map((item, index) => (
                    <tr key={item.id || index} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4 text-slate-400 font-mono">{item.id || index + 1}</td>
                      <td className="px-6 py-4 text-slate-900">{item.name}</td>
                      {activeTab === 'branches' && (
                        <>
                          <td className="px-6 py-4 text-slate-500 font-semibold">{item.type || 'Regional Office'}</td>
                          <td className="px-6 py-4 text-slate-600 font-medium">{item.location || '—'}</td>
                        </>
                      )}
                      {activeTab === 'departments' && (
                        <td className="px-6 py-4 text-teal-700">{item.lead || 'Unassigned'}</td>
                      )}
                      {activeTab === 'products' && (
                        <td className="px-6 py-4 text-slate-900 font-extrabold">{item.price || '—'}</td>
                      )}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(item)}
                          disabled={saving}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide border transition cursor-pointer ${
                            item.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {item.status === 'Active' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-rose-600" /> Inactive
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          disabled={saving}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 hover:text-blue-600 text-slate-500 transition cursor-pointer inline-flex items-center"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={saving}
                          className="p-1.5 rounded-lg border border-rose-100 hover:bg-rose-50 text-rose-500 transition cursor-pointer inline-flex items-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Master Data Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center justify-between">
              <span>{editingItem ? 'Edit' : 'Add New'} {TABS.find(t => t.key === activeTab)?.label} Item</span>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </h3>
            
            <form onSubmit={handleSubmitMasterItem} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Name / Label</label>
                <input
                  type="text"
                  placeholder="e.g. Pune Regional Office / Human Resources"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-blue-600 text-xs font-semibold"
                  required
                />
              </div>

              {activeTab === 'branches' && (
                <>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5">Branch Type</label>
                    <select
                      value={itemType}
                      onChange={(e) => setItemType(e.target.value)}
                      className="w-full h-10 border border-slate-300 rounded-xl px-2.5 text-slate-950 focus:outline-none focus:border-blue-600 text-xs font-bold"
                    >
                      <option value="Headquarters">Headquarters</option>
                      <option value="Regional Office">Regional Office</option>
                      <option value="Sales Hub">Sales Hub</option>
                      <option value="Support Center">Support Center</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5">Location / Address Details</label>
                    <input
                      type="text"
                      placeholder="e.g. Yerawada, Pune"
                      value={itemLocation}
                      onChange={(e) => setItemLocation(e.target.value)}
                      className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-blue-600 text-xs font-semibold"
                      required
                    />
                  </div>
                </>
              )}

              {activeTab === 'departments' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Department Head / Manager</label>
                  <input
                    type="text"
                    placeholder="e.g. Suresh Raina"
                    value={itemLead}
                    onChange={(e) => setItemLead(e.target.value)}
                    className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-blue-600 text-xs font-semibold"
                  />
                </div>
              )}

              {activeTab === 'products' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Standard Price / Fee</label>
                  <input
                    type="text"
                    placeholder="e.g. ₹5,000 / Month"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    className="w-full h-10 border border-slate-300 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-blue-600 text-xs font-semibold"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Activation Status</label>
                <select
                  value={itemStatus}
                  onChange={(e) => setItemStatus(e.target.value)}
                  className="w-full h-10 border border-slate-300 rounded-xl px-2.5 text-slate-950 focus:outline-none focus:border-blue-600 text-xs font-bold"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Record'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CompanyOverview
