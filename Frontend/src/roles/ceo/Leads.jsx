import React, { useState, useEffect } from 'react'
import {
  Target,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { crmAPI, hrmsAPI, reportAPI } from '../../services/api.js'
import { formatDate } from '../../utils/dateUtils.js'
import { useToast } from '../../common/ToastContext.jsx'

function Leads() {
  const { showToast } = useToast()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('All') // 'All', 'Hot', 'Warm', 'Cold', 'Not Assigned'
  const [searchQuery, setSearchQuery] = useState('')
  const [showTable, setShowTable] = useState(false)

  // Reassignment states
  const [employees, setEmployees] = useState([])
  const [selectedLeadIds, setSelectedLeadIds] = useState([])
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [selectedExecutiveId, setSelectedExecutiveId] = useState('')
  const [assigning, setAssigning] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await crmAPI.getLeads().catch(() => null)
      if (res && res.data && Array.isArray(res.data)) {
        setLeads(res.data)
      } else {
        const dRes = await reportAPI.getCeoDashboard().catch(() => null)
        if (dRes && dRes.data && dRes.data.leads) {
          setLeads(dRes.data.leads)
        } else {
          setLeads([])
        }
      }

      // Load active employees for assignment dropdown
      const empRes = await hrmsAPI.getEmployees().catch(() => null)
      if (empRes && (empRes.data || empRes)) {
        const rawEmps = empRes.data || empRes
        if (Array.isArray(rawEmps)) {
          setEmployees(rawEmps)
        }
      }
    } catch (e) {
      console.error('Error fetching leads:', e)
      setLeads([])
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
    
    let matchesCategory = false
    if (categoryFilter === 'All') {
      matchesCategory = true
    } else if (categoryFilter === 'Not Assigned') {
      matchesCategory = !lead.sales_executive && !lead.assigned_to && !lead.assigned_to_email && !lead.employee_code
    } else {
      matchesCategory = leadCat.toLowerCase() === categoryFilter.toLowerCase()
    }

    const matchesSearch = 
      (lead.company_name || lead.company || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.name || lead.contact_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.sales_executive || lead.assigned_to || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.sales_manager || lead.manager_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Filter active Sales Executives
  const activeExecutives = employees.filter(emp => {
    const isInactive = ['inactive', 'deactivated', 'terminated', 'disabled'].includes((emp.status || '').toLowerCase())
    const isNotActive = emp.is_active === false
    const isExec = (emp.role || emp.designation || '').toLowerCase().includes('executive')
    return !isInactive && !isNotActive && isExec
  })

  // Format date helper
  const formatDateString = (dt) => {
    return formatDate(dt)
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
            <RefreshCw size={15} className={refreshing ? 'animate-spin text-[#832D51]' : ''} />
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
            showTable ? 'border-[#832D51] bg-slate-50/40' : 'border-[#EA6993]/40 bg-white'
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
            showTable ? 'bg-[#832D51]/10 border border-[#832D51]/20 text-[#832D51]' : 'bg-[#EA6993]/10 border border-[#EA6993]/20 text-[#EA6993]'
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
            <div className="flex bg-slate-50 border border-slate-200 p-0.5 rounded-xl self-start lg:self-auto shrink-0 flex-wrap gap-0.5">
              {['All', 'Hot', 'Warm', 'Cold', 'Not Assigned'].map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    setCategoryFilter(cat)
                    setSelectedLeadIds([])
                  }}
                  className={`px-4 py-1.5 text-xs font-black uppercase rounded-lg transition cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-[#832D51] text-white shadow-xs'
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

          {selectedLeadIds.length > 0 && (
            <div className="flex items-center justify-between bg-[#832D51]/10 border border-[#832D51]/20 rounded-2xl p-4 animate-in slide-in-from-top-2 duration-200">
              <span className="text-xs font-black text-[#832D51]">
                {selectedLeadIds.length} {selectedLeadIds.length === 1 ? 'Lead' : 'Leads'} selected
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedExecutiveId('')
                  setIsAssignModalOpen(true)
                }}
                className="px-4 py-2 bg-[#832D51] text-white rounded-xl text-xs font-black shadow-sm hover:bg-[#6c2442] transition cursor-pointer"
              >
                Assign Selected
              </button>
            </div>
          )}

          {/* Main Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 w-12">
                      <input 
                        type="checkbox"
                        checked={filteredLeads.length > 0 && selectedLeadIds.length === filteredLeads.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLeadIds(filteredLeads.map(l => l.id || l.lead_id).filter(Boolean))
                          } else {
                            setSelectedLeadIds([])
                          }
                        }}
                        className="rounded border-slate-300 text-[#832D51] focus:ring-[#832D51] cursor-pointer"
                      />
                    </th>
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
                      <td colSpan="7" className="text-center py-12">
                        <RefreshCw className="size-6 animate-spin text-[#832D51] mx-auto" />
                        <p className="text-xs text-slate-400 font-bold mt-2">Loading leads registry...</p>
                      </td>
                    </tr>
                  ) : filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-12 text-slate-400 font-semibold italic">No matching leads found</td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => {
                      const leadId = lead.id || lead.lead_id
                      const hasOwner = !!(lead.sales_executive || lead.assigned_to || lead.assigned_to_email || lead.employee_code)
                      return (
                        <tr key={leadId} className="hover:bg-slate-50/50 transition">
                          <td className="px-6 py-4">
                            <input 
                              type="checkbox"
                              checked={selectedLeadIds.includes(leadId)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedLeadIds(prev => [...prev, leadId])
                                } else {
                                  setSelectedLeadIds(prev => prev.filter(id => id !== leadId))
                                }
                              }}
                              className="rounded border-slate-300 text-[#832D51] focus:ring-[#832D51] cursor-pointer"
                            />
                          </td>
                          <td className="px-6 py-4 text-slate-500 font-semibold">
                            {formatDateString(lead.date || lead.created_at)}
                          </td>
                          <td className="px-6 py-4 text-[#3a7d63] font-black">
                            {lead.sales_manager || lead.manager_name || 'Direct/Unassigned'}
                          </td>
                          <td className="px-6 py-4 text-slate-900 font-black">
                            {hasOwner ? (
                              lead.sales_executive || lead.assigned || lead.assigned_to || 'Assigned'
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-slate-100 text-slate-500 border border-slate-200">
                                NOT ASSIGNED
                              </span>
                            )}
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
                      )
                    })
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

      {/* Reassignment Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl max-w-md w-full space-y-4 animate-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-sm font-black text-slate-900">Assign Selected Leads</h3>
              <p className="text-[11px] text-slate-500 font-semibold mt-1">
                Select an active Sales Executive to own these {selectedLeadIds.length} leads.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Active Sales Executive
              </label>
              <select
                value={selectedExecutiveId}
                onChange={(e) => setSelectedExecutiveId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#832D51] cursor-pointer"
              >
                <option value="">-- Select Active Executive --</option>
                {activeExecutives.map(exec => (
                  <option key={exec.employee_id || exec.id} value={exec.employee_id || exec.id}>
                    {exec.name} ({exec.employee_code || 'No Code'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedExecutiveId || assigning}
                onClick={async () => {
                  setAssigning(true)
                  try {
                    const res = await crmAPI.reassignLeads({
                      lead_ids: selectedLeadIds,
                      new_employee_id: selectedExecutiveId
                    })
                    if (res && (res.success || res.data)) {
                      showToast(`Successfully reassigned ${selectedLeadIds.length} leads`, 'success')
                      setSelectedLeadIds([])
                      setIsAssignModalOpen(false)
                      loadData()
                    } else {
                      showToast(res?.message || 'Reassignment failed', 'error')
                    }
                  } catch (err) {
                    console.error('Reassignment error:', err)
                    showToast('Failed to complete lead reassignment', 'error')
                  } finally {
                    setAssigning(false)
                  }
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm disabled:opacity-50 transition cursor-pointer"
              >
                {assigning ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Leads
