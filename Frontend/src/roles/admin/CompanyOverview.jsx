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
  const [selectedBranches, setSelectedBranches] = useState([]) // for product-branch assignment
  const [itemProductType, setItemProductType] = useState('Product') // for product ('Product', 'Service', 'Subscription')

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
      
      try {
        localStorage.setItem('tconnect_company_profile', JSON.stringify(companyProfile))
      } catch (e) {}
      
      showToast('Company profile saved successfully!', 'success')
    } catch (err) {
      const errorMsg = err?.message || err?.detail || 'Failed to save company profile'
      showToast(errorMsg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handlePopulateSampleData = async () => {
    if (!window.confirm('Do you want to pre-populate the master configuration settings with standard company defaults (branches, departments, designations, products, lead sources, and categories)? This will initialize system dropdown fields.')) return
    setSaving(true)
    const sampleSetup = {
      branches: [
        { id: 1, name: 'Chennai HQ', type: 'Headquarters', location: 'OMR IT Expressway, Chennai', staffCount: 15, status: 'Active' },
        { id: 2, name: 'Bangalore Office', type: 'Regional Office', location: 'Whitefield, Bangalore', staffCount: 8, status: 'Active' },
        { id: 3, name: 'Mumbai Hub', type: 'Sales Hub', location: 'Andheri East, Mumbai', staffCount: 3, status: 'Active' }
      ],
      departments: [
        { id: 101, name: 'Sales & Business Development', lead: 'Arun Kumar', staffCount: 18, budget: '₹15,00,000', status: 'Active' },
        { id: 102, name: 'Human Resources', lead: 'Siva Murugan', staffCount: 2, budget: '₹3,00,050', status: 'Active' },
        { id: 103, name: 'Engineering & Tech', lead: 'Jeeva Nathan', staffCount: 4, budget: '₹8,00,000', status: 'Active' },
        { id: 104, name: 'Finance & Accounts', lead: 'Bavani R', staffCount: 1, budget: '₹2,00,000', status: 'Active' }
      ],
      designations: [
        { id: 'DES-1', name: 'Sales Executive', status: 'Active' },
        { id: 'DES-2', name: 'Sales Manager', status: 'Active' },
        { id: 'DES-3', name: 'System Administrator', status: 'Active' },
        { id: 'DES-4', name: 'CEO & Managing Director', status: 'Active' },
        { id: 'DES-5', name: 'HR Manager', status: 'Active' }
      ],
      products: [
        { id: 'PRO-1', name: 'TConnect Core ERP Suite', price: '₹4,500/user/month', status: 'Active' },
        { id: 'PRO-2', name: 'GPS Field Tracker Plugin', price: '₹950/user/month', status: 'Active' },
        { id: 'PRO-3', name: 'Custom CRM Portal', price: '₹12,000/month flat', status: 'Active' }
      ],
      lead_sources: [
        { id: 'LSD-1', name: 'Direct Sales Outreach', status: 'Active' },
        { id: 'LSD-2', name: 'Corporate Website Form', status: 'Active' },
        { id: 'LSD-3', name: 'Existing Customer Referral', status: 'Active' },
        { id: 'LSD-4', name: 'LinkedIn Professional Campaign', status: 'Active' }
      ],
      customer_categories: [
        { id: 'CAT-1', name: 'Enterprise Tier-1', status: 'Active' },
        { id: 'CAT-2', name: 'SME Tier-2', status: 'Active' },
        { id: 'CAT-3', name: 'Retail Client Tier-3', status: 'Active' }
      ]
    }

    try {
      await settingsAPI.updateSettings(sampleSetup)
      setMasterData(sampleSetup)
      showToast('Master configuration settings pre-populated with standard defaults!', 'success')
    } catch (err) {
      setMasterData(sampleSetup)
      showToast('Loaded sample configuration settings onto page!', 'success')
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
  const handleOpenAdd = (categoryKey) => {
    setActiveTab(categoryKey)
    setItemName('')
    setItemType('Regional Office')
    setItemLocation('')
    setItemLead('')
    setItemPrice('')
    setItemProductType('Product')
    setItemStatus('Active')
    setSelectedBranches([])
    setEditingItem(null)
    setShowAddModal(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (categoryKey, item) => {
    setActiveTab(categoryKey)
    setEditingItem(item)
    setItemName(item.name || '')
    setItemType(item.type || 'Regional Office')
    setItemLocation(item.location || '')
    setItemLead(item.lead || '')
    setItemPrice(item.price || '')
    setItemProductType(item.product_type || item.type || 'Product')
    setItemStatus(item.status || 'Active')
    setSelectedBranches(item.branches || [])
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
            updated.product_type = itemProductType
            updated.branches = selectedBranches
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
        newItem.product_type = itemProductType
        newItem.branches = selectedBranches
      }
      updatedList = [...currentList, newItem]
    }

    try {
      let savedItem
      if (activeTab === 'branches') {
        if (editingItem) {
          const itemToSave = updatedList.find(x => x.id === editingItem.id)
          const res = await settingsAPI.updateBranch(editingItem.id, itemToSave)
          savedItem = res.data
        } else {
          const newItem = updatedList[updatedList.length - 1]
          const res = await settingsAPI.createBranch(newItem)
          savedItem = res.data
        }
      } else if (activeTab === 'products') {
        if (editingItem) {
          const itemToSave = updatedList.find(x => x.id === editingItem.id)
          const res = await settingsAPI.updateProduct(editingItem.id, itemToSave)
          savedItem = res.data
        } else {
          const newItem = updatedList[updatedList.length - 1]
          const res = await settingsAPI.createProduct(newItem)
          savedItem = res.data
        }
      } else {
        const payload = { [activeTab]: updatedList }
        await settingsAPI.updateSettings(payload)
      }

      // Map backend fields to UI format if needed
      let finalItem
      if (savedItem) {
        finalItem = {
          id: savedItem.id,
          name: savedItem.branch_name || savedItem.product_name || savedItem.name,
          status: savedItem.status || 'Active'
        }
        if (activeTab === 'branches') {
          finalItem.type = savedItem.branch_type || 'Regional Office'
          finalItem.location = savedItem.address || ''
          finalItem.staffCount = 0
        } else if (activeTab === 'products') {
          finalItem.price = savedItem.base_price !== undefined ? `₹${savedItem.base_price}` : savedItem.price
          finalItem.product_type = savedItem.product_type || 'Product'
          finalItem.branches = savedItem.branches || []
        }
      }

      setMasterData((prev) => {
        let newList
        if (editingItem) {
          newList = prev[activeTab].map(item => item.id === editingItem.id ? (finalItem || item) : item)
        } else {
          newList = [...prev[activeTab], finalItem || updatedList[updatedList.length - 1]]
        }
        return {
          ...prev,
          [activeTab]: newList
        }
      })
      
      showToast(editingItem ? 'Item updated successfully!' : 'New item created successfully!', 'success')
      setShowAddModal(false)
    } catch (err) {
      const errorMsg = err?.message || err?.detail || 'Failed to save master data list to database'
      showToast(errorMsg, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Toggle Activation status
  const handleToggleStatus = async (categoryKey, item) => {
    setSaving(true)
    const currentList = [...masterData[categoryKey]]
    const nextStatus = item.status === 'Active' ? 'Inactive' : 'Active'
    
    const updatedList = currentList.map((x) => 
      x.id === item.id ? { ...x, status: nextStatus } : x
    )

    try {
      if (categoryKey === 'branches') {
        await settingsAPI.updateBranch(item.id, { status: nextStatus })
      } else if (categoryKey === 'products') {
        await settingsAPI.updateProduct(item.id, { status: nextStatus })
      } else {
        const payload = { [categoryKey]: updatedList }
        await settingsAPI.updateSettings(payload)
      }
      
      setMasterData((prev) => ({
        ...prev,
        [categoryKey]: updatedList
      }))
      
      showToast(`Status updated to ${nextStatus}`, 'success')
    } catch (err) {
      const errorMsg = err?.message || err?.detail || 'Failed to toggle status in Supabase'
      showToast(errorMsg, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Delete Item
  const handleDeleteItem = async (categoryKey, itemId) => {
    if (!window.confirm('Are you sure you want to delete this master data item?')) return
    
    setSaving(true)
    const currentList = [...masterData[categoryKey]]
    const updatedList = currentList.filter((x) => x.id !== itemId)

    try {
      if (categoryKey === 'branches') {
        await settingsAPI.deleteBranch(itemId)
      } else if (categoryKey === 'products') {
        await settingsAPI.deleteProduct(itemId)
      } else {
        const payload = { [categoryKey]: updatedList }
        await settingsAPI.updateSettings(payload)
      }
      
      setMasterData((prev) => ({
        ...prev,
        [categoryKey]: updatedList
      }))
      
      showToast('Item deleted successfully', 'success')
    } catch (err) {
      const errorMsg = err?.message || err?.detail || 'Failed to delete item from database'
      showToast(errorMsg, 'error')
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#DCE3EF] p-5.5 rounded-2xl shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-[#071A45] tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#123A8C]" /> Company Overview
          </h1>
          <p className="text-xs text-[#64748B] font-medium mt-1">Manage your company's profile, locations, teams and business configuration from one place.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="px-5 py-2.5 bg-[#061A4D] hover:bg-[#123A8C] text-white font-extrabold rounded-xl text-xs shadow-md shadow-[#061A4D]/25 flex items-center gap-2 disabled:opacity-50 cursor-pointer shrink-0 transition duration-200"
          >
            <CheckCircle2 className="w-4 h-4 text-[#F2C76E]" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 1: Company Profile & Branding */}
        <div className="bg-white border border-[#DCE3EF] p-6 rounded-2xl shadow-xs space-y-4 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-[#D9A441] opacity-90" />
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-[#071A45] text-sm">Company Profile & Branding</h3>
          </div>
          <div className="flex flex-col items-center text-center p-5 bg-[#F7F9FC] rounded-2xl border border-slate-150 space-y-3">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-[#061A4D] to-[#123A8C] text-white flex items-center justify-center font-black text-2xl shadow-md overflow-hidden border-2 border-white">
              {companyProfile.logoUrl ? (
                <img src={companyProfile.logoUrl} alt="Company Logo" className="w-full h-full object-cover" />
              ) : (
                <span>TC</span>
              )}
            </div>
            <div>
              <h4 className="font-extrabold text-[#071A45] text-base leading-snug">{companyProfile.companyName}</h4>
              <p className="text-xs text-[#64748B] font-semibold mt-1">{companyProfile.legalName || 'TwiteConnect Software Solution'}</p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-2 cursor-pointer transition duration-200"
            >
              <Upload className="w-3.5 h-3.5 text-[#123A8C]" /> Change / Upload Logo
            </button>
          </div>
          <div className="space-y-2 text-xs pt-2">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-[#64748B] font-semibold">Operating Currency</span>
              <span className="font-bold text-[#071A45]">₹ INR</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-[#64748B] font-semibold">Time Zone</span>
              <span className="font-bold text-[#071A45]">Asia/Kolkata (IST)</span>
            </div>
          </div>
        </div>

        {/* Section 2: Business Details Form */}
        <div className="lg:col-span-2 bg-white border border-[#DCE3EF] p-6 rounded-2xl shadow-xs space-y-5 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-[#D9A441] opacity-90" />
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-[#071A45] text-sm">Business Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#071A45] mb-1.5">Registered Company Name</label>
              <input
                type="text"
                value={companyProfile.companyName}
                onChange={(e) => setCompanyProfile({ ...companyProfile, companyName: e.target.value })}
                className="w-full h-10.5 bg-[#F7F9FC] border border-[#DCE3EF] rounded-xl px-3.5 text-xs font-semibold text-[#071A45] focus:bg-white focus:border-[#123A8C] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#071A45] mb-1.5">GSTIN / Tax Registration</label>
              <input
                type="text"
                value={companyProfile.taxIdGstin}
                onChange={(e) => setCompanyProfile({ ...companyProfile, taxIdGstin: e.target.value })}
                className="w-full h-10.5 bg-[#F7F9FC] border border-[#DCE3EF] rounded-xl px-3.5 text-xs font-semibold text-[#071A45] focus:bg-white focus:border-[#123A8C] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#071A45] mb-1.5">Official Support Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={companyProfile.email}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, email: e.target.value })}
                  className="w-full h-10.5 bg-[#F7F9FC] border border-[#DCE3EF] rounded-xl pl-9 pr-3.5 text-xs font-semibold text-[#071A45] focus:bg-white focus:border-[#123A8C] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#071A45] mb-1.5">Contact Phone Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={companyProfile.phone}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, phone: e.target.value })}
                  className="w-full h-10.5 bg-[#F7F9FC] border border-[#DCE3EF] rounded-xl pl-9 pr-3.5 text-xs font-semibold text-[#071A45] focus:bg-white focus:border-[#123A8C] focus:outline-none"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#071A45] mb-1.5">Website URL</label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={companyProfile.website}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, website: e.target.value })}
                  className="w-full h-10.5 bg-[#F7F9FC] border border-[#DCE3EF] rounded-xl pl-9 pr-3.5 text-xs font-semibold text-[#071A45] focus:bg-white focus:border-[#123A8C] focus:outline-none"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#071A45] mb-1.5">Head Office Address</label>
              <textarea
                rows={2}
                value={companyProfile.address}
                onChange={(e) => setCompanyProfile({ ...companyProfile, address: e.target.value })}
                className="w-full bg-[#F7F9FC] border border-[#DCE3EF] rounded-xl p-3 text-xs font-semibold text-[#071A45] focus:bg-white focus:border-[#123A8C] focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Branches & Locations */}
      <div className="bg-white border border-[#DCE3EF] p-6 rounded-2xl shadow-xs space-y-4 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-[#D9A441] opacity-90" />
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-[#071A45] text-sm">Branches & Locations</h3>
            <p className="text-[11px] text-[#64748B] mt-0.5">Define your regional offices, branches and site coordinates for staff tracking.</p>
          </div>
          <button
            onClick={() => handleOpenAdd('branches')}
            className="px-3.5 py-2 bg-[#061A4D] hover:bg-[#123A8C] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition duration-200 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-[#F2C76E]" /> Add Branch
          </button>
        </div>

        {masterData.branches.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#64748B] font-semibold bg-[#F7F9FC]/60 rounded-xl border border-dashed border-[#DCE3EF]">
            No branch offices added yet. Click "Add Branch" to start.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {masterData.branches.map((b) => (
              <div key={b.id} className="p-4 bg-[#F7F9FC]/40 rounded-xl border border-[#DCE3EF] hover:border-slate-350 transition relative flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-[#071A45]">{b.name}</span>
                    <button
                      onClick={() => handleToggleStatus('branches', b)}
                      disabled={saving}
                      className={`px-2 py-0.5 rounded-full text-[9px] font-black border transition cursor-pointer ${
                        b.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {b.status || 'Active'}
                    </button>
                  </div>
                  <div className="text-[10px] text-[#64748B] font-bold flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#123A8C]" /> {b.type || 'Regional Office'}
                  </div>
                  <div className="text-[11px] text-[#071A45] font-semibold leading-relaxed">
                    {b.location || 'Address unspecified'}
                  </div>
                </div>
                <div className="flex justify-end gap-1.5 mt-4 pt-3 border-t border-[#DCE3EF]">
                  <button
                    onClick={() => handleOpenEdit('branches', b)}
                    disabled={saving}
                    className="p-1.5 rounded-lg border border-slate-250 bg-white hover:bg-slate-50 hover:text-[#123A8C] text-slate-500 transition cursor-pointer inline-flex items-center"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteItem('branches', b.id)}
                    disabled={saving}
                    className="p-1.5 rounded-lg border border-rose-100 bg-white hover:bg-rose-50 text-rose-500 transition cursor-pointer inline-flex items-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grid for Departments, Designations & Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 4: Departments */}
        <div className="bg-white border border-[#DCE3EF] p-6 rounded-2xl shadow-xs space-y-4 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 inset-x-0 h-1 bg-[#D9A441] opacity-90" />
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-[#071A45] text-sm">Departments</h3>
              <button
                onClick={() => handleOpenAdd('departments')}
                disabled={saving}
                className="p-1.5 bg-[#061A4D] hover:bg-[#123A8C] text-white rounded-lg text-xs font-bold transition duration-200 cursor-pointer shadow-sm flex items-center justify-center"
              >
                <Plus className="w-3.5 h-3.5 text-[#F2C76E]" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
              {masterData.departments.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#64748B] font-semibold bg-[#F7F9FC]/60 rounded-xl border border-dashed border-[#DCE3EF]">
                  No departments added yet.
                </div>
              ) : (
                masterData.departments.map((d) => (
                  <div key={d.id} className="p-3 bg-[#F7F9FC]/40 rounded-xl border border-[#DCE3EF] flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="font-extrabold text-[#071A45] text-xs">{d.name}</div>
                      <div className="text-[10px] text-[#64748B] font-bold">
                        Head: <span className="text-[#123A8C]">{d.lead || 'Unassigned'}</span> · Staff: {d.staffCount || 0}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleToggleStatus('departments', d)}
                        disabled={saving}
                        className={`px-1.5 py-0.5 rounded-full text-[9px] font-black border transition cursor-pointer ${
                          d.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {d.status || 'Active'}
                      </button>
                      <button
                        onClick={() => handleOpenEdit('departments', d)}
                        disabled={saving}
                        className="p-1 rounded-md border border-slate-250 bg-white hover:bg-slate-50 text-slate-500 transition cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem('departments', d.id)}
                        disabled={saving}
                        className="p-1 rounded-md border border-rose-100 bg-white hover:bg-rose-50 text-rose-500 transition cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Section 5: Designations */}
        <div className="bg-white border border-[#DCE3EF] p-6 rounded-2xl shadow-xs space-y-4 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 inset-x-0 h-1 bg-[#D9A441] opacity-90" />
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-[#071A45] text-sm">Designations</h3>
              <button
                onClick={() => handleOpenAdd('designations')}
                disabled={saving}
                className="p-1.5 bg-[#061A4D] hover:bg-[#123A8C] text-white rounded-lg text-xs font-bold transition duration-200 cursor-pointer shadow-sm flex items-center justify-center"
              >
                <Plus className="w-3.5 h-3.5 text-[#F2C76E]" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
              {masterData.designations.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#64748B] font-semibold bg-[#F7F9FC]/60 rounded-xl border border-dashed border-[#DCE3EF]">
                  No designations added yet.
                </div>
              ) : (
                masterData.designations.map((des) => (
                  <div key={des.id} className="p-3 bg-[#F7F9FC]/40 rounded-xl border border-[#DCE3EF] flex items-center justify-between gap-3">
                    <div>
                      <div className="font-extrabold text-[#071A45] text-xs">{des.name}</div>
                      <div className="text-[9px] text-[#64748B] mt-0.5">ID: {des.id}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleToggleStatus('designations', des)}
                        disabled={saving}
                        className={`px-1.5 py-0.5 rounded-full text-[9px] font-black border transition cursor-pointer ${
                          des.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {des.status || 'Active'}
                      </button>
                      <button
                        onClick={() => handleOpenEdit('designations', des)}
                        disabled={saving}
                        className="p-1 rounded-md border border-slate-250 bg-white hover:bg-slate-50 text-slate-500 transition cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem('designations', des.id)}
                        disabled={saving}
                        className="p-1 rounded-md border border-rose-100 bg-white hover:bg-rose-50 text-rose-500 transition cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Section 6: Products & Services */}
        <div className="bg-white border border-[#DCE3EF] p-6 rounded-2xl shadow-xs space-y-4 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 inset-x-0 h-1 bg-[#D9A441] opacity-90" />
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-[#071A45] text-sm">Products & Services</h3>
              <button
                onClick={() => handleOpenAdd('products')}
                disabled={saving}
                className="p-1.5 bg-[#061A4D] hover:bg-[#123A8C] text-white rounded-lg text-xs font-bold transition duration-200 cursor-pointer shadow-sm flex items-center justify-center"
              >
                <Plus className="w-3.5 h-3.5 text-[#F2C76E]" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
              {masterData.products.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#64748B] font-semibold bg-[#F7F9FC]/60 rounded-xl border border-dashed border-[#DCE3EF]">
                  No products defined yet.
                </div>
              ) : (
                masterData.products.map((p) => (
                  <div key={p.id} className="p-3 bg-[#F7F9FC]/40 rounded-xl border border-[#DCE3EF] flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="font-extrabold text-[#071A45] text-xs">{p.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-[#123A8C] font-extrabold">{p.price || '₹0'}</span>
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-700 border border-slate-200">
                          {p.product_type || 'Product'}
                        </span>
                      </div>
                      {p.branches && p.branches.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {p.branches.map(brId => {
                            const brName = masterData.branches.find(b => b.id === brId)?.name || String(brId)
                            return (
                              <span key={brId} className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-medium text-blue-700 border border-blue-100">
                                {brName}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleToggleStatus('products', p)}
                        disabled={saving}
                        className={`px-1.5 py-0.5 rounded-full text-[9px] font-black border transition cursor-pointer ${
                          p.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {p.status || 'Active'}
                      </button>
                      <button
                        onClick={() => handleOpenEdit('products', p)}
                        disabled={saving}
                        className="p-1 rounded-md border border-slate-250 bg-white hover:bg-slate-50 text-slate-500 transition cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem('products', p.id)}
                        disabled={saving}
                        className="p-1 rounded-md border border-rose-100 bg-white hover:bg-rose-50 text-rose-500 transition cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

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
                <>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5">Product Type</label>
                    <select
                      value={itemProductType}
                      onChange={(e) => setItemProductType(e.target.value)}
                      className="w-full h-10 border border-slate-300 rounded-xl px-2.5 text-slate-950 focus:outline-none focus:border-blue-600 text-xs font-bold"
                    >
                      <option value="Product">Product</option>
                      <option value="Service">Service</option>
                      <option value="Subscription">Subscription</option>
                    </select>
                  </div>
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
                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5">Applicable Branches</label>
                    <div className="space-y-2 border border-slate-200 rounded-xl p-3 max-h-40 overflow-y-auto bg-slate-50">
                      {masterData.branches.map((b) => (
                        <label key={b.id} className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedBranches.includes(b.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBranches([...selectedBranches, b.id])
                              } else {
                                setSelectedBranches(selectedBranches.filter(id => id !== b.id))
                              }
                            }}
                            className="rounded text-blue-650 border-slate-300 focus:ring-blue-500"
                          />
                          <span>{b.name}</span>
                        </label>
                      ))}
                      {masterData.branches.length === 0 && (
                        <div className="text-slate-400 text-[10px]">No branches defined yet.</div>
                      )}
                    </div>
                  </div>
                </>
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
