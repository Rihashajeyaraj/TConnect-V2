import React, { useState, useEffect, useMemo } from 'react'
import {
  Building2,
  Briefcase,
  Layers,
  ShoppingBag,
  Target,
  Bookmark,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  RefreshCw,
  FolderOpen
} from 'lucide-react'
import { settingsAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'

const TABS = [
  { key: 'branches', label: 'Branches & Locations', icon: Building2, color: 'text-blue-600 bg-blue-50 border-blue-100' },
  { key: 'departments', label: 'Departments', icon: Briefcase, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  { key: 'designations', label: 'Designations', icon: Layers, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
  { key: 'products', label: 'Products & Services', icon: ShoppingBag, color: 'text-rose-600 bg-rose-50 border-rose-100' },
  { key: 'lead_sources', label: 'Lead Sources', icon: Target, color: 'text-amber-600 bg-amber-50 border-amber-100' },
  { key: 'customer_categories', label: 'Customer Categories', icon: Bookmark, color: 'text-purple-600 bg-purple-50 border-purple-100' }
]

function OrganizationMasterData() {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState('branches')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // State holding all master lists
  const [masterData, setMasterData] = useState({
    branches: [],
    departments: [],
    designations: [],
    products: [],
    lead_sources: [],
    customer_categories: []
  })

  // Modal control states
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  
  // Modal form input states
  const [itemName, setItemName] = useState('')
  const [itemType, setItemType] = useState('Regional Office') // for branch
  const [itemLocation, setItemLocation] = useState('') // for branch
  const [itemLead, setItemLead] = useState('') // for department
  const [itemPrice, setItemPrice] = useState('') // for product
  const [itemStatus, setItemStatus] = useState('Active')

  // Load settings and master data lists from Supabase
  const loadMasterData = async () => {
    setLoading(true)
    try {
      const res = await settingsAPI.getSettings()
      if (res && res.data) {
        setMasterData({
          branches: Array.isArray(res.data.branches) ? res.data.branches : [],
          departments: Array.isArray(res.data.departments) ? res.data.departments : [],
          designations: Array.isArray(res.data.designations) ? res.data.designations : [],
          products: Array.isArray(res.data.products) ? res.data.products : [],
          lead_sources: Array.isArray(res.data.lead_sources) ? res.data.lead_sources : [],
          customer_categories: Array.isArray(res.data.customer_categories) ? res.data.customer_categories : []
        })
      }
    } catch (err) {
      showToast('Error loading master data settings from Supabase', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMasterData()
  }, [])

  // Filter current active list based on search query
  const filteredList = useMemo(() => {
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

  // Handle Form Submission (Add or Edit)
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!itemName.trim()) {
      showToast('Name field is required', 'error')
      return
    }

    setSaving(true)
    const currentList = [...masterData[activeTab]]

    let updatedList
    if (editingItem) {
      // Edit mode
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
      // Add mode
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
      // Build the settings update payload for this tab
      const payload = { [activeTab]: updatedList }
      await settingsAPI.updateSettings(payload)
      
      // Update local state reactive flow
      setMasterData((prev) => ({
        ...prev,
        [activeTab]: updatedList
      }))
      
      showToast(
        editingItem ? 'Item updated successfully!' : 'New item created successfully!', 
        'success'
      )
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

  // Delete item from list
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

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Organization & Master Data</h1>
          <p className="text-xs text-slate-500 mt-1">Configure company structural settings, designations, products, and CRM parameters.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md shadow-blue-600/20 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Tabs */}
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

      {/* Filter and Content Area */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 justify-between bg-slate-50/50">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${TABS.find(t => t.key === activeTab)?.label.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={loadMasterData}
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
            <table className="w-full min-w-[700px] border-collapse text-left whitespace-nowrap">
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
                    <th className="px-6 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Price / Rate</th>
                  )}
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/50 transition duration-150">
                    <td className="px-6 py-4 text-xs font-mono text-slate-400">{item.id}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-900">{item.name}</td>
                    {activeTab === 'branches' && (
                      <>
                        <td className="px-6 py-4 text-xs text-slate-600">{item.type || 'Regional Office'}</td>
                        <td className="px-6 py-4 text-xs text-slate-600">{item.location || '—'}</td>
                      </>
                    )}
                    {activeTab === 'departments' && (
                      <td className="px-6 py-4 text-xs text-slate-600">{item.lead || 'Unassigned'}</td>
                    )}
                    {activeTab === 'products' && (
                      <td className="px-6 py-4 text-xs text-slate-600">{item.price || '—'}</td>
                    )}
                    <td className="px-6 py-4 text-xs">
                      <button
                        onClick={() => handleToggleStatus(item)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border transition cursor-pointer ${
                          item.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
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
                    <td className="px-6 py-4 text-xs text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition cursor-pointer inline-flex"
                        title="Edit"
                      >
                        <Edit2 className="w-4.5 h-4.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer inline-flex"
                        title="Delete"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in zoom-in duration-200"
          >
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center justify-between border-b border-slate-100 pb-3">
              <span>{editingItem ? 'Edit Master Record' : `Add New ${TABS.find(t => t.key === activeTab)?.label.slice(0, -1)}`}</span>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </h3>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sales, Enterprise CRM, Regional Branch"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {activeTab === 'branches' && (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Branch Type</label>
                    <select
                      value={itemType}
                      onChange={(e) => setItemType(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-hidden focus:border-blue-500"
                    >
                      <option value="Head Office">Head Office</option>
                      <option value="Regional Office">Regional Office</option>
                      <option value="Branch Office">Branch Office</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Location Address</label>
                    <input
                      type="text"
                      placeholder="e.g. Guindy, Chennai"
                      value={itemLocation}
                      onChange={(e) => setItemLocation(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {activeTab === 'departments' && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Department Lead</label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Kumar"
                    value={itemLead}
                    onChange={(e) => setItemLead(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              {activeTab === 'products' && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Price (INR / Rate Details)</label>
                  <input
                    type="text"
                    placeholder="e.g. ₹12,000 / user / year"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Status</label>
                <select
                  value={itemStatus}
                  onChange={(e) => setItemStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-hidden focus:border-blue-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100 justify-end">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-md shadow-blue-600/20 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Item'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default OrganizationMasterData
