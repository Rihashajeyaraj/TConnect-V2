import React, { useState, useEffect } from 'react'
import {
  Target,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { reportAPI } from '../../services/api.js'

const initialLeads = [
  { id: '1', name: 'ABC Industries', company: 'ABC Pvt Ltd', category: 'Hot', sales_manager: 'Vikram Singh', sales_executive: 'Ananya Roy', phone: '+91 98765 43210', date: '28 Apr 2026', status: 'New' },
  { id: '2', name: 'Tech Solutions', company: 'Tech Solutions', category: 'Warm', sales_manager: 'Suresh V', sales_executive: 'Karthik Raja', phone: '+91 87654 32109', date: '28 Apr 2026', status: 'Contacted' },
  { id: '3', name: 'Global Corp', company: 'Global Corp', category: 'Cold', sales_manager: 'Vikram Singh', sales_executive: 'Ananya Roy', phone: '+91 76543 21098', date: '27 Apr 2026', status: 'Qualified' },
  { id: '4', name: 'Prime Systems', company: 'Prime Systems', category: 'Hot', sales_manager: 'Suresh V', sales_executive: 'Karthik Raja', phone: '+91 65432 10987', date: '27 Apr 2026', status: 'Proposal' },
  { id: '5', name: 'Next Gen Tech', company: 'Next Gen Tech', category: 'Warm', sales_manager: 'Vikram Singh', sales_executive: 'Ananya Roy', phone: '+91 54321 09876', date: '26 Apr 2026', status: 'Negotiation' },
  { id: '6', name: 'Bright Infotech', company: 'Bright Infotech', category: 'Cold', sales_manager: 'Suresh V', sales_executive: 'Karthik Raja', phone: '+91 43210 98765', date: '26 Apr 2026', status: 'Won' },
]

function Leads() {
  const [leads, setLeads] = useState(initialLeads)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('All') // 'All', 'Hot', 'Warm', 'Cold'
  const [searchQuery, setSearchQuery] = useState('')
  const [showTable, setShowTable] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await reportAPI.getCeoDashboard()
      if (res && res.data && res.data.leads) {
        setLeads(res.data.leads)
      }
    } catch (e) {
      console.error('Error fetching leads:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filter list
  const filteredLeads = leads.filter((lead) => {
    const leadCat = lead.category || 'Warm'
    const matchesCategory = categoryFilter === 'All' || leadCat.toLowerCase() === categoryFilter.toLowerCase()
    const matchesSearch = 
      (lead.company_name || lead.company || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.name || lead.contact_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.sales_executive || lead.assigned_to || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.sales_manager || lead.manager_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Format date helper
  const formatDateString = (dt) => {
    if (!dt) return 'N/A'
    if (dt.includes('T')) return dt.split('T')[0]
    return dt
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 animate-in fade-in duration-200">
      {/* Header Panel */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Leads Registry</h2>
          <p className="mt-1 text-xs font-semibold text-slate-400">Home &gt; Leads</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setRefreshing(true)
              loadData()
            }}
            disabled={refreshing}
            className="p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
            title="Refresh Leads"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin text-[#004749]' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards section - ONLY Total Leads Card (Click to expand/collapse table) */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div 
          onClick={() => {
            setShowTable(!showTable)
          }}
          className={`rounded-2xl border p-6 shadow-sm hover:shadow-md transition duration-300 cursor-pointer group flex items-center justify-between ${
            showTable ? 'border-[#004749] bg-slate-50/40' : 'border-[#b09b72]/40 bg-white'
          }`}
        >
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Active Leads</p>
            <p className="text-3xl font-black text-slate-900 mt-2 tracking-tight">{leads.length}</p>
            <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1.5">
              <span>{showTable ? 'Click to collapse table' : 'Click to display HOT, COLD, WARM table'}</span>
              {showTable ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </p>
          </div>
          <span className={`grid size-12 place-items-center rounded-xl shadow-2xs group-hover:scale-105 transition ${
            showTable ? 'bg-[#004749]/10 border border-[#004749]/20 text-[#004749]' : 'bg-[#b09b72]/10 border border-[#b09b72]/20 text-[#b09b72]'
          }`}>
            <Target className="size-5" />
          </span>
        </div>
      </div>

      {/* Conditional rendering of table & toggles */}
      {showTable && (
        <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
          {/* Filter and search controls with Category Toggle */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center justify-between bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
            {/* Toggle Category Buttons */}
            <div className="flex bg-slate-50 border border-slate-200 p-0.5 rounded-xl self-start lg:self-auto shrink-0">
              {['All', 'Hot', 'Warm', 'Cold'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-4 py-1.5 text-xs font-black uppercase rounded-lg transition cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-[#004749] text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-955'
                  }`}
                >
                  {cat} Leads
                </button>
              ))}
            </div>

            {/* Search Field */}
            <div className="relative w-full lg:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search leads, SM, SE..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-150"
              />
            </div>
          </div>

          {/* Main Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Sales Manager</th>
                    <th className="px-6 py-4">Sales Executive</th>
                    <th className="px-6 py-4">Lead Details</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-600">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="text-center py-12">
                        <RefreshCw className="size-6 animate-spin text-[#004749] mx-auto" />
                        <p className="text-xs text-slate-400 font-bold mt-2">Loading leads registry...</p>
                      </td>
                    </tr>
                  ) : filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-slate-400 font-semibold italic">No matching leads found</td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => (
                      <tr key={lead.id || lead.lead_id} className="hover:bg-slate-50/50 transition">
                        <td className="px-6 py-4 text-slate-500 font-semibold">
                          {formatDateString(lead.date || lead.created_at)}
                        </td>
                        <td className="px-6 py-4 text-[#540000] font-black">
                          {lead.sales_manager || lead.manager_name || 'Direct/Unassigned'}
                        </td>
                        <td className="px-6 py-4 text-slate-900 font-black">
                          {lead.sales_executive || lead.assigned || 'Unassigned'}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-slate-900 font-black">{lead.company_name || lead.company || 'Prospect Client'}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{lead.name || lead.contact_name || 'Point of Contact'}</p>
                            {lead.phone && <p className="text-[10px] text-slate-400 mt-0.5">📞 {lead.phone}</p>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase ${
                            (lead.category || 'Warm').toLowerCase() === 'hot'
                              ? 'bg-red-50 text-red-700 border border-red-100'
                              : (lead.category || 'Warm').toLowerCase() === 'warm'
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : 'bg-blue-50 text-blue-700 border border-blue-100'
                          }`}>
                            {lead.category || 'Warm'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-lg border border-slate-200 px-2.5 py-0.5 text-[10px] font-bold bg-slate-50 text-slate-650">
                            {lead.status || 'New'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination at bottom */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4 text-xs font-bold text-slate-500">
              <span>Showing {filteredLeads.length} of {leads.length} entries</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Leads
