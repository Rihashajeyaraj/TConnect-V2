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
  { 
    key: 'profile', 
    label: 'Company Profile', 
    icon: Building2, 
    activeClass: 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/35 scale-[1.02] hover:bg-blue-700',
    inactiveClass: 'bg-blue-50/50 text-blue-700 border-blue-200/80 hover:bg-blue-100 hover:text-blue-800 hover:border-blue-300'
  },
  { 
    key: 'branches', 
    label: 'Branches & Locations', 
    icon: Building2, 
    activeClass: 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/35 scale-[1.02] hover:bg-blue-700',
    inactiveClass: 'bg-blue-50/50 text-blue-700 border-blue-200/80 hover:bg-blue-100 hover:text-blue-800 hover:border-blue-300'
  },
  { 
    key: 'departments', 
    label: 'Departments', 
    icon: Briefcase, 
    activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/35 scale-[1.02] hover:bg-emerald-700',
    inactiveClass: 'bg-emerald-50/50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100 hover:text-emerald-800 hover:border-emerald-300'
  },
  { 
    key: 'designations', 
    label: 'Designations', 
    icon: Layers, 
    activeClass: 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/35 scale-[1.02] hover:bg-indigo-700',
    inactiveClass: 'bg-indigo-50/50 text-indigo-700 border-indigo-200/80 hover:bg-indigo-100 hover:text-indigo-800 hover:border-indigo-300'
  },
  { 
    key: 'products', 
    label: 'Products & Services', 
    icon: ShoppingBag, 
    activeClass: 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-500/35 scale-[1.02] hover:bg-rose-700',
    inactiveClass: 'bg-rose-50/50 text-rose-700 border-rose-200/80 hover:bg-rose-100 hover:text-rose-800 hover:border-rose-300'
  },
  { 
    key: 'lead_sources', 
    label: 'Lead Sources', 
    icon: Target, 
    activeClass: 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/35 scale-[1.02] hover:bg-amber-600',
    inactiveClass: 'bg-amber-50/50 text-amber-700 border-amber-200/80 hover:bg-amber-100 hover:text-amber-800 hover:border-amber-300'
  },
  { 
    key: 'customer_categories', 
    label: 'Customer Categories', 
    icon: Bookmark, 
    activeClass: 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/35 scale-[1.02] hover:bg-purple-700',
    inactiveClass: 'bg-purple-50/50 text-purple-700 border-purple-200/80 hover:bg-purple-100 hover:text-purple-800 hover:border-purple-300'
  }
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
    <div className="space-y-6 font-sans pb-12">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleLogoFileChange}
        className="hidden"
      />

      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-white via-white to-[#D4ECFC]/25 p-5 px-6 rounded-3xl shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-[#0B2545] tracking-tight flex items-center gap-2">
            <Building2 className="w-5.5 h-5.5 text-[#1E88E5]" /> Company Administration
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Configure your company profile, locations, branches, departments, and custom dropdown values.</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'profile' ? (
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="px-4.5 py-2.5 bg-gradient-to-r from-[#0B2545] to-[#1E88E5] hover:from-[#1E88E5] hover:to-[#64B5F6] text-white font-extrabold rounded-xl text-xs shadow-md shadow-[#0B2545]/15 flex items-center gap-2 disabled:opacity-50 cursor-pointer transition duration-200"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          ) : (
            <button
              onClick={() => handleOpenAdd(activeTab)}
              className="px-4.5 py-2.5 bg-gradient-to-r from-[#0B2545] to-[#1E88E5] hover:from-[#1E88E5] hover:to-[#64B5F6] text-white font-extrabold rounded-xl text-xs shadow-md shadow-[#0B2545]/15 flex items-center gap-2 cursor-pointer transition duration-200"
            >
              <Plus className="w-4 h-4" /> Add New Item
            </button>
          )}
          <button
            onClick={handlePrint}
            className="p-2.5 rounded-xl border border-slate-250 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer"
            title="Print Profile Summary"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button
            onClick={handlePopulateSampleData}
            disabled={saving}
            className="px-3.5 py-2.5 border border-dashed border-[#64B5F6]/45 hover:border-[#1E88E5] text-[#0B2545] rounded-xl text-[10px] font-black uppercase transition cursor-pointer flex items-center gap-1"
            title="Reset default configuration setup values"
          >
            <RefreshCw className="w-3 h-3" /> Reset Setup
          </button>
        </div>
      </div>

      {/* Tabs Row Navigation */}
      <div className="flex gap-2 border-b border-slate-200 pb-1.5 overflow-x-auto scrollbar-none">
        {TABS.map((tab) => {
          const IconComp = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key)
                setSearchQuery('')
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition duration-200 cursor-pointer whitespace-nowrap border ${
                isActive
                  ? tab.activeClass
                  : tab.inactiveClass
              }`}
            >
              <IconComp className="w-4 h-4 text-current" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Main Single Tab Panel Container */}
      <div className="bg-white p-6 rounded-3xl shadow-xs">
        
        {/* Tab 1: Company Profile Details */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-center gap-6 p-5 bg-[#EEF4F8]/30 rounded-2xl border border-[#64B5F6]/15">
              <div className="relative group shrink-0">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-[#0B2545] to-[#1E88E5] text-white flex items-center justify-center font-black text-2xl shadow-md overflow-hidden border-2 border-white">
                  {companyProfile.logoUrl ? (
                    <img src={companyProfile.logoUrl} alt="Company Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span>TC</span>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1.5 -right-1.5 p-2 bg-[#0B2545] hover:bg-[#1E88E5] text-white rounded-full shadow-md border border-white transition cursor-pointer"
                  title="Upload Logo"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-center md:text-left space-y-1">
                <h3 className="text-base font-extrabold text-[#0B2545]">{companyProfile.companyName}</h3>
                <p className="text-xs text-slate-500 font-semibold">{companyProfile.legalName}</p>
                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-bold text-slate-500">
                  <span>Currency: <strong className="text-[#0B2545]">{companyProfile.currency}</strong></span>
                  <span>·</span>
                  <span>Zone: <strong className="text-[#0B2545]">{companyProfile.timezone}</strong></span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#0B2545] mb-1.5">Registered Company Name</label>
                <input
                  type="text"
                  value={companyProfile.companyName}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, companyName: e.target.value })}
                  className="w-full h-10.5 bg-[#EEF4F8]/30 border border-[#64B5F6]/20 rounded-xl px-3.5 text-xs font-semibold text-[#0B2545] focus:bg-white focus:border-[#1E88E5] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0B2545] mb-1.5">GSTIN / Tax ID</label>
                <input
                  type="text"
                  value={companyProfile.taxIdGstin}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, taxIdGstin: e.target.value })}
                  className="w-full h-10.5 bg-[#EEF4F8]/30 border border-[#64B5F6]/20 rounded-xl px-3.5 text-xs font-semibold text-[#0B2545] focus:bg-white focus:border-[#1E88E5] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0B2545] mb-1.5">Official Support Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={companyProfile.email}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, email: e.target.value })}
                    className="w-full h-10.5 bg-[#EEF4F8]/30 border border-[#64B5F6]/20 rounded-xl pl-9 pr-3.5 text-xs font-semibold text-[#0B2545] focus:bg-white focus:border-[#1E88E5] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0B2545] mb-1.5">Contact Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={companyProfile.phone}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, phone: e.target.value })}
                    className="w-full h-10.5 bg-[#EEF4F8]/30 border border-[#64B5F6]/20 rounded-xl pl-9 pr-3.5 text-xs font-semibold text-[#0B2545] focus:bg-white focus:border-[#1E88E5] focus:outline-none"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#0B2545] mb-1.5">Website URL</label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={companyProfile.website}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, website: e.target.value })}
                    className="w-full h-10.5 bg-[#EEF4F8]/30 border border-[#64B5F6]/20 rounded-xl pl-9 pr-3.5 text-xs font-semibold text-[#0B2545] focus:bg-white focus:border-[#1E88E5] focus:outline-none"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#0B2545] mb-1.5">Head Office Address</label>
                <textarea
                  rows={3}
                  value={companyProfile.address}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, address: e.target.value })}
                  className="w-full bg-[#EEF4F8]/30 border border-[#64B5F6]/20 rounded-xl p-3.5 text-xs font-semibold text-[#0B2545] focus:bg-white focus:border-[#1E88E5] focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Branches List Table View */}
        {activeTab === 'branches' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3.5">
              <h3 className="font-extrabold text-[#0B2545] text-sm">Branches & Location Nodes</h3>
              <input
                type="text"
                placeholder="Search branches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3.5 py-1.5 border border-slate-200 bg-slate-50/50 rounded-xl text-xs focus:outline-none focus:border-[#1E88E5] w-56 font-semibold"
              />
            </div>

            {filteredList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-semibold bg-[#EEF4F8]/10 rounded-xl border border-dashed">
                No locations match the query. Click "Add New Item" to create one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2.5 font-bold">Branch Office</th>
                      <th className="py-2.5 font-bold">Type</th>
                      <th className="py-2.5 font-bold">Address / Coordinates</th>
                      <th className="py-2.5 font-bold text-center">Status</th>
                      <th className="py-2.5 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.map((b) => (
                      <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50/50 font-semibold">
                        <td className="py-3 text-[#0B2545] font-black">{b.name}</td>
                        <td className="py-3 text-slate-500">{b.type || 'Regional Office'}</td>
                        <td className="py-3 text-slate-700">{b.location || '—'}</td>
                        <td className="py-3 text-center">
                          <button
                            onClick={() => handleToggleStatus('branches', b)}
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black border cursor-pointer transition ${
                              b.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-250' : 'bg-rose-50 text-rose-700 border-rose-250'
                            }`}
                          >
                            {b.status || 'Active'}
                          </button>
                        </td>
                        <td className="py-3 text-right space-x-1.5">
                          <button
                            onClick={() => handleOpenEdit('branches', b)}
                            className="p-1 rounded bg-slate-50 border border-slate-200 text-slate-500 hover:text-[#1E88E5] transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem('branches', b.id)}
                            className="p-1 rounded bg-rose-50/50 border border-rose-100 text-rose-550 transition cursor-pointer"
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

        {/* Tab 3: Departments View */}
        {activeTab === 'departments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3.5">
              <h3 className="font-extrabold text-[#0B2545] text-sm">Departments & Leads</h3>
              <input
                type="text"
                placeholder="Search departments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3.5 py-1.5 border border-slate-200 bg-slate-50/50 rounded-xl text-xs focus:outline-none focus:border-[#1E88E5] w-56 font-semibold"
              />
            </div>

            {filteredList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-semibold bg-[#EEF4F8]/10 rounded-xl border border-dashed">
                No matching departments found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2.5 font-bold">Department</th>
                      <th className="py-2.5 font-bold">Manager / Lead</th>
                      <th className="py-2.5 font-bold text-center">Staff Count</th>
                      <th className="py-2.5 font-bold text-center">Status</th>
                      <th className="py-2.5 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.map((d) => (
                      <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50/50 font-semibold">
                        <td className="py-3 text-[#0B2545] font-black">{d.name}</td>
                        <td className="py-3 text-[#1E88E5]">{d.lead || 'Unassigned'}</td>
                        <td className="py-3 text-center text-slate-500">{d.staffCount || 0}</td>
                        <td className="py-3 text-center">
                          <button
                            onClick={() => handleToggleStatus('departments', d)}
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black border cursor-pointer transition ${
                              d.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-250' : 'bg-rose-50 text-rose-700 border-rose-250'
                            }`}
                          >
                            {d.status || 'Active'}
                          </button>
                        </td>
                        <td className="py-3 text-right space-x-1.5">
                          <button
                            onClick={() => handleOpenEdit('departments', d)}
                            className="p-1 rounded bg-slate-50 border border-slate-200 text-slate-500 hover:text-[#1E88E5] transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem('departments', d.id)}
                            className="p-1 rounded bg-rose-50/50 border border-rose-100 text-rose-550 transition cursor-pointer"
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

        {/* Tab 4: Designations View */}
        {activeTab === 'designations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3.5">
              <h3 className="font-extrabold text-[#0B2545] text-sm">Employment Designations</h3>
              <input
                type="text"
                placeholder="Search designations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3.5 py-1.5 border border-slate-200 bg-slate-50/50 rounded-xl text-xs focus:outline-none focus:border-[#1E88E5] w-56 font-semibold"
              />
            </div>

            {filteredList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-semibold bg-[#EEF4F8]/10 rounded-xl border border-dashed">
                No designations matches setup query.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2.5 font-bold">Designation Title</th>
                      <th className="py-2.5 font-bold">Standard Role ID</th>
                      <th className="py-2.5 font-bold text-center">Status</th>
                      <th className="py-2.5 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.map((des) => (
                      <tr key={des.id} className="border-b border-slate-100 hover:bg-slate-50/50 font-semibold">
                        <td className="py-3 text-[#0B2545] font-black">{des.name}</td>
                        <td className="py-3 text-slate-500 font-mono">{des.id}</td>
                        <td className="py-3 text-center">
                          <button
                            onClick={() => handleToggleStatus('designations', des)}
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black border cursor-pointer transition ${
                              des.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-250' : 'bg-rose-50 text-rose-700 border-rose-250'
                            }`}
                          >
                            {des.status || 'Active'}
                          </button>
                        </td>
                        <td className="py-3 text-right space-x-1.5">
                          <button
                            onClick={() => handleOpenEdit('designations', des)}
                            className="p-1 rounded bg-slate-50 border border-slate-200 text-slate-500 hover:text-[#1E88E5] transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem('designations', des.id)}
                            className="p-1 rounded bg-rose-50/50 border border-rose-100 text-rose-550 transition cursor-pointer"
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

        {/* Tab 5: Products View */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3.5">
              <h3 className="font-extrabold text-[#0B2545] text-sm">Products & Services Catalog</h3>
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3.5 py-1.5 border border-slate-200 bg-slate-50/50 rounded-xl text-xs focus:outline-none focus:border-[#1E88E5] w-56 font-semibold"
              />
            </div>

            {filteredList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-semibold bg-[#EEF4F8]/10 rounded-xl border border-dashed">
                No items defined in catalog list.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2.5 font-bold">Item Name</th>
                      <th className="py-2.5 font-bold">Fee / Pricing</th>
                      <th className="py-2.5 font-bold">Classification</th>
                      <th className="py-2.5 font-bold">Assigned Offices</th>
                      <th className="py-2.5 font-bold text-center">Status</th>
                      <th className="py-2.5 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.map((p) => (
                      <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50 font-semibold">
                        <td className="py-3 text-[#0B2545] font-black">{p.name}</td>
                        <td className="py-3 text-[#1E88E5] font-extrabold">{p.price || '₹0'}</td>
                        <td className="py-3">
                          <span className="inline-flex items-center rounded-md bg-[#D4ECFC]/40 px-2 py-0.5 text-[9px] font-bold text-[#0B2545] border border-[#64B5F6]/25">
                            {p.product_type || 'Product'}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {p.branches && p.branches.length > 0 ? (
                              p.branches.map(brId => {
                                const brName = masterData.branches.find(b => b.id === brId)?.name || String(brId)
                                return (
                                  <span key={brId} className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                                    {brName}
                                  </span>
                                )
                              })
                            ) : (
                              <span className="text-slate-400 text-[10px]">All Branches</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <button
                            onClick={() => handleToggleStatus('products', p)}
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black border cursor-pointer transition ${
                              p.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-250' : 'bg-rose-50 text-rose-700 border-rose-250'
                            }`}
                          >
                            {p.status || 'Active'}
                          </button>
                        </td>
                        <td className="py-3 text-right space-x-1.5">
                          <button
                            onClick={() => handleOpenEdit('products', p)}
                            className="p-1 rounded bg-slate-50 border border-slate-200 text-slate-500 hover:text-[#1E88E5] transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem('products', p.id)}
                            className="p-1 rounded bg-rose-50/50 border border-rose-100 text-rose-550 transition cursor-pointer"
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

        {/* Tab 6: Lead Sources View */}
        {activeTab === 'lead_sources' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3.5">
              <h3 className="font-extrabold text-[#0B2545] text-sm">CRM Lead Sources</h3>
              <input
                type="text"
                placeholder="Search sources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3.5 py-1.5 border border-slate-200 bg-slate-50/50 rounded-xl text-xs focus:outline-none focus:border-[#1E88E5] w-56 font-semibold"
              />
            </div>

            {filteredList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-semibold bg-[#EEF4F8]/10 rounded-xl border border-dashed">
                No custom lead sources defined.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2.5 font-bold">Source Title</th>
                      <th className="py-2.5 font-bold">Standard ID</th>
                      <th className="py-2.5 font-bold text-center">Status</th>
                      <th className="py-2.5 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.map((src) => (
                      <tr key={src.id} className="border-b border-slate-100 hover:bg-slate-50/50 font-semibold">
                        <td className="py-3 text-[#0B2545] font-black">{src.name}</td>
                        <td className="py-3 text-slate-500 font-mono">{src.id}</td>
                        <td className="py-3 text-center">
                          <button
                            onClick={() => handleToggleStatus('lead_sources', src)}
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black border cursor-pointer transition ${
                              src.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-250' : 'bg-rose-50 text-rose-700 border-rose-250'
                            }`}
                          >
                            {src.status || 'Active'}
                          </button>
                        </td>
                        <td className="py-3 text-right space-x-1.5">
                          <button
                            onClick={() => handleOpenEdit('lead_sources', src)}
                            className="p-1 rounded bg-slate-50 border border-slate-200 text-slate-500 hover:text-[#1E88E5] transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem('lead_sources', src.id)}
                            className="p-1 rounded bg-rose-50/50 border border-rose-100 text-rose-550 transition cursor-pointer"
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

        {/* Tab 7: Customer Categories View */}
        {activeTab === 'customer_categories' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3.5">
              <h3 className="font-extrabold text-[#0B2545] text-sm">Customer Categories / Tiers</h3>
              <input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3.5 py-1.5 border border-slate-200 bg-slate-50/50 rounded-xl text-xs focus:outline-none focus:border-[#1E88E5] w-56 font-semibold"
              />
            </div>

            {filteredList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-semibold bg-[#EEF4F8]/10 rounded-xl border border-dashed">
                No categories defined.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2.5 font-bold">Category Title</th>
                      <th className="py-2.5 font-bold">Standard ID</th>
                      <th className="py-2.5 font-bold text-center">Status</th>
                      <th className="py-2.5 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.map((cat) => (
                      <tr key={cat.id} className="border-b border-slate-100 hover:bg-slate-50/50 font-semibold">
                        <td className="py-3 text-[#0B2545] font-black">{cat.name}</td>
                        <td className="py-3 text-slate-500 font-mono">{cat.id}</td>
                        <td className="py-3 text-center">
                          <button
                            onClick={() => handleToggleStatus('customer_categories', cat)}
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black border cursor-pointer transition ${
                              cat.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-250' : 'bg-rose-50 text-rose-700 border-rose-250'
                            }`}
                          >
                            {cat.status || 'Active'}
                          </button>
                        </td>
                        <td className="py-3 text-right space-x-1.5">
                          <button
                            onClick={() => handleOpenEdit('customer_categories', cat)}
                            className="p-1 rounded bg-slate-50 border border-slate-200 text-slate-500 hover:text-[#1E88E5] transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem('customer_categories', cat.id)}
                            className="p-1 rounded bg-rose-50/50 border border-rose-100 text-rose-550 transition cursor-pointer"
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

      </div>

      {/* Add / Edit Master Data Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center justify-between">
              <span>{editingItem ? 'Edit' : 'Add New'} {TABS.find(t => t.key === activeTab)?.label} Item</span>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-650 text-sm cursor-pointer">✕</button>
            </h3>
            
            <form onSubmit={handleSubmitMasterItem} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Name / Label</label>
                <input
                  type="text"
                  placeholder="e.g. Pune Regional Office / Human Resources"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full h-10 border border-slate-350 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-[#1E88E5] text-xs font-semibold"
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
                      className="w-full h-10 border border-slate-350 rounded-xl px-2.5 text-slate-950 focus:outline-none focus:border-[#1E88E5] text-xs font-bold"
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
                      className="w-full h-10 border border-slate-350 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-[#1E88E5] text-xs font-semibold"
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
                    className="w-full h-10 border border-slate-350 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-[#1E88E5] text-xs font-semibold"
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
                      className="w-full h-10 border border-slate-350 rounded-xl px-2.5 text-slate-950 focus:outline-none focus:border-[#1E88E5] text-xs font-bold"
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
                      className="w-full h-10 border border-slate-350 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-[#1E88E5] text-xs font-semibold"
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
                  className="w-full h-10 border border-slate-350 rounded-xl px-2.5 text-slate-950 focus:outline-none focus:border-[#1E88E5] text-xs font-bold"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-gradient-to-r from-[#0B2545] to-[#1E88E5] hover:from-[#1E88E5] hover:to-[#64B5F6] text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
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
