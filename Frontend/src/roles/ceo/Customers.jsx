import React, { useState, useEffect } from 'react'
import {
  Users,
  Search,
  RefreshCw,
  Building2,
  ChevronDown,
  ChevronRight,
  Filter,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  Calendar,
  X,
  Sparkles,
  Info,
  Layers,
  UserCheck,
  Briefcase
} from 'lucide-react'
import { customerAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'

function CeoCustomers() {
  const { showToast } = useToast()
  
  // Raw Data State
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedManager, setSelectedManager] = useState('All')
  const [selectedExecutive, setSelectedExecutive] = useState('All')
  const [selectedProduct, setSelectedProduct] = useState('All')

  // Expansion States
  const [expandedManagers, setExpandedManagers] = useState({})
  const [expandedExecutives, setExpandedExecutives] = useState({})

  // Detail Drawer State
  const [selectedCust, setSelectedCust] = useState(null)

  const loadCustomerDirectory = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await customerAPI.getCeoCustomerDirectory()
      if (res && res.data) {
        setData(res.data)
        
        // Auto-expand all managers by default so CEO gets full immediate visibility
        const mgrExpand = {}
        const execExpand = {}
        ;(res.data.managers || []).forEach(m => {
          mgrExpand[m.manager_id] = true
          ;(m.executives || []).forEach((e, ei) => {
            if (e.customer_count > 0) {
              execExpand[`${m.manager_id}_${e.executive_id || e.executive_name || 'ex'}_${ei}`] = true
            }
          })
        })
        setExpandedManagers(mgrExpand)
        setExpandedExecutives(execExpand)
      } else {
        setData({ managers: [], totals: { managers: 0, executives: 0, customers: 0, revenue: 0 } })
      }
    } catch (err) {
      console.error('Failed to load customer directory:', err)
      setError(err?.message || 'Failed to fetch customer directory')
      showToast('Error loading customer directory', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomerDirectory()
  }, [])

  const toggleManagerExpand = (mgrId) => {
    setExpandedManagers(prev => ({
      ...prev,
      [mgrId]: !prev[mgrId]
    }))
  }

  const toggleExecutiveExpand = (key) => {
    setExpandedExecutives(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  // Extract filter dropdown options
  const managers = data?.managers || []
  const allManagersList = Array.from(new Set(managers.map(m => m.manager_name))).filter(Boolean)
  
  const allExecutivesList = Array.from(new Set(
    managers.flatMap(m => (m.executives || []).map(e => e.executive_name))
  )).filter(Boolean)

  const allProductsList = Array.from(new Set(
    managers.flatMap(m => (m.executives || []).flatMap(e => (e.customers || []).map(c => c.product)))
  )).filter(Boolean)

  // Apply filters on hierarchy
  const q = searchQuery.toLowerCase().trim()

  const filteredManagers = managers.map(mgr => {
    if (selectedManager !== 'All' && mgr.manager_name !== selectedManager) {
      return null
    }

    const filteredExecs = (mgr.executives || []).map(exec => {
      if (selectedExecutive !== 'All' && exec.executive_name !== selectedExecutive) {
        return null
      }

      const filteredCustomers = (exec.customers || []).filter(cust => {
        if (selectedProduct !== 'All' && cust.product !== selectedProduct) {
          return false
        }
        if (q) {
          const matchCust = (cust.customer_name || '').toLowerCase().includes(q)
          const matchComp = (cust.company_name || '').toLowerCase().includes(q)
          const matchExec = (exec.executive_name || '').toLowerCase().includes(q)
          const matchMgr = (mgr.manager_name || '').toLowerCase().includes(q)
          const matchProd = (cust.product || '').toLowerCase().includes(q)
          return matchCust || matchComp || matchExec || matchMgr || matchProd
        }
        return true
      })

      // If search query is active, only include executive if customer matches OR executive name matches
      if (q && filteredCustomers.length === 0 && !exec.executive_name.toLowerCase().includes(q)) {
        return null
      }

      return {
        ...exec,
        customer_count: filteredCustomers.length,
        customers: filteredCustomers
      }
    }).filter(Boolean)

    if (filteredExecs.length === 0 && (selectedExecutive !== 'All' || selectedProduct !== 'All' || q)) {
      // If searching and manager name matches, show manager with 0 execs matching, otherwise hide
      if (q && mgr.manager_name.toLowerCase().includes(q)) {
        return {
          ...mgr,
          executive_count: 0,
          customer_count: 0,
          executives: []
        }
      }
      return null
    }

    const totalCustsInMgr = new Set(
      filteredExecs.flatMap(e => e.customers.map(c => c.customer_id))
    ).size

    return {
      ...mgr,
      executive_count: filteredExecs.length,
      customer_count: totalCustsInMgr,
      executives: filteredExecs
    }
  }).filter(Boolean)

  // Reconciled live totals from filtered data
  const liveUniqueCustomers = new Set(
    filteredManagers.flatMap(m => m.executives.flatMap(e => e.customers.map(c => c.customer_id)))
  ).size

  const liveTotalRevenue = filteredManagers.reduce(
    (sum, m) => sum + m.executives.reduce(
      (esum, e) => esum + e.customers.reduce((csum, c) => csum + (c.amount || 0), 0), 0
    ), 0
  )

  const liveManagersCount = filteredManagers.filter(m => m.manager_id !== 'unassigned').length
  const liveExecutivesCount = filteredManagers.reduce((sum, m) => sum + m.executives.length, 0)

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-[#F8CAE4]/20 text-[#832D51]">
              <Building2 className="size-4.5" />
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Customers Directory
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Centralized organization-wide customer directory grouped by Sales Manager & Executive hierarchy
          </p>
        </div>

        <button
          onClick={loadCustomerDirectory}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Directory
        </button>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Customers</span>
            <Building2 className="size-4.5 text-[#832D51]" />
          </div>
          <p className="text-2xl font-black tracking-tight mt-3 text-slate-900">
            {liveUniqueCustomers}
          </p>
          <p className="text-[10px] font-bold text-slate-500 mt-1">Unique customer accounts</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Revenue Portfolio</span>
            <DollarSign className="size-4.5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black tracking-tight mt-3 text-slate-900">
            ₹{liveTotalRevenue.toLocaleString()}
          </p>
          <p className="text-[10px] font-bold text-slate-500 mt-1">Contract value portfolio</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Sales Managers</span>
            <Briefcase className="size-4.5 text-[#832D51]" />
          </div>
          <p className="text-2xl font-black tracking-tight mt-3 text-slate-900">
            {liveManagersCount}
          </p>
          <p className="text-[10px] font-bold text-slate-500 mt-1">Active sales managers</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Sales Executives</span>
            <UserCheck className="size-4.5 text-blue-600" />
          </div>
          <p className="text-2xl font-black tracking-tight mt-3 text-slate-900">
            {liveExecutivesCount}
          </p>
          <p className="text-[10px] font-bold text-slate-500 mt-1">Team sales executives</p>
        </div>
      </div>

      {/* Filters Strip */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Customer / Company / Executive..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#832D51] transition"
          />
        </div>

        <select
          value={selectedManager}
          onChange={(e) => setSelectedManager(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#832D51] cursor-pointer"
        >
          <option value="All">All Sales Managers</option>
          {allManagersList.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <select
          value={selectedExecutive}
          onChange={(e) => setSelectedExecutive(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#832D51] cursor-pointer"
        >
          <option value="All">All Sales Executives</option>
          {allExecutivesList.map(ex => (
            <option key={ex} value={ex}>{ex}</option>
          ))}
        </select>

        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#832D51] cursor-pointer"
        >
          <option value="All">All Products</option>
          {allProductsList.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Hierarchical Customer Directory List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-bold text-xs">
            <RefreshCw className="size-6 animate-spin mx-auto mb-3 text-[#832D51]" />
            Loading organization customer hierarchy...
          </div>
        ) : filteredManagers.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-bold text-xs">
            No matching manager or customer records found.
          </div>
        ) : (
          filteredManagers.map((mgr) => {
            const isExpanded = !!expandedManagers[mgr.manager_id]

            return (
              <div
                key={mgr.manager_id}
                className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden transition"
              >
                {/* Manager Header Accordion Button */}
                <button
                  type="button"
                  onClick={() => toggleManagerExpand(mgr.manager_id)}
                  className="w-full flex items-center justify-between p-4.5 bg-slate-50/70 hover:bg-slate-100/70 transition text-left cursor-pointer border-b border-slate-200/70"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-8 place-items-center rounded-lg bg-[#F8CAE4]/25 text-[#832D51] font-black text-xs">
                      <Briefcase className="size-4" />
                    </span>
                    <div>
                      <h2 className="text-sm font-black text-slate-900 tracking-tight">
                        Sales Manager — {mgr.manager_name}
                      </h2>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">
                        {mgr.executive_count} {mgr.executive_count === 1 ? 'Executive' : 'Executives'} · {mgr.customer_count} {mgr.customer_count === 1 ? 'Customer' : 'Customers'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#832D51] bg-[#F8CAE4]/20 px-2.5 py-1 rounded-lg">
                      {isExpanded ? 'Collapse' : 'Expand'}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="size-4.5 text-slate-500" />
                    ) : (
                      <ChevronRight className="size-4.5 text-slate-500" />
                    )}
                  </div>
                </button>

                {/* Manager Body: List of Executives */}
                {isExpanded && (
                  <div className="p-4 space-y-3 bg-white">
                    {mgr.executives.length === 0 ? (
                      <p className="text-xs text-slate-400 font-bold py-4 text-center">
                        No sales executives assigned under this manager.
                      </p>
                    ) : (
                      mgr.executives.map((exec, ei) => {
                        const execKey = `${mgr.manager_id}_${exec.executive_id || exec.executive_name || 'ex'}_${ei}`
                        const isExecExpanded = !!expandedExecutives[execKey]

                        return (
                          <div
                            key={execKey}
                            className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs"
                          >
                            {/* Executive Accordion Header */}
                            <button
                              type="button"
                              onClick={() => toggleExecutiveExpand(execKey)}
                              className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50/80 transition text-left cursor-pointer border-b border-slate-100"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="grid size-6 place-items-center rounded-md bg-blue-50 text-blue-700 font-black text-[11px]">
                                  <UserCheck className="size-3.5" />
                                </span>
                                <div>
                                  <span className="text-xs font-black text-slate-900">
                                    Executive: {exec.executive_name}
                                  </span>
                                  <span className="text-[11px] text-slate-500 font-bold ml-2">
                                    ({exec.customer_count} {exec.customer_count === 1 ? 'Customer' : 'Customers'})
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 text-slate-400">
                                {isExecExpanded ? (
                                  <ChevronDown className="size-4 text-slate-500" />
                                ) : (
                                  <ChevronRight className="size-4 text-slate-500" />
                                )}
                              </div>
                            </button>

                            {/* Executive Body: Customers Table */}
                            {isExecExpanded && (
                              <div className="overflow-x-auto">
                                {exec.customers.length === 0 ? (
                                  <p className="text-[11px] text-slate-400 font-semibold py-4 text-center">
                                    No customer accounts assigned to this executive.
                                  </p>
                                ) : (
                                  <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                      <tr className="bg-slate-50/80 border-b border-slate-200/70 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                        <th className="px-4 py-2.5">Customer Name</th>
                                        <th className="px-4 py-2.5">Company</th>
                                        <th className="px-4 py-2.5">Product / Service</th>
                                        <th className="px-4 py-2.5">Status</th>
                                        <th className="px-4 py-2.5">Date</th>
                                        <th className="px-4 py-2.5 text-right">Amount</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                      {exec.customers.map((cust, ci) => (
                                        <tr
                                          key={`${execKey}_${cust.customer_id || 'cust'}_${ci}`}
                                          onClick={() => setSelectedCust(cust)}
                                          className="hover:bg-slate-50/60 cursor-pointer transition"
                                        >
                                          <td className="px-4 py-3 font-bold text-slate-900">
                                            {cust.customer_name}
                                          </td>
                                          <td className="px-4 py-3 text-slate-600">
                                            {cust.company_name}
                                          </td>
                                          <td className="px-4 py-3 text-slate-600">
                                            {cust.product}
                                          </td>
                                          <td className="px-4 py-3">
                                            <span className="inline-flex items-center rounded-md bg-[#CFDD9D]/20 px-2 py-0.5 font-extrabold text-[#3a7d63] text-[10px]">
                                              {cust.status}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 text-slate-500">
                                            {cust.date || 'N/A'}
                                          </td>
                                          <td className="px-4 py-3 text-right font-black text-slate-950">
                                            ₹{(cust.amount || 0).toLocaleString()}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Customer Detail Drawer */}
      {selectedCust && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-xs transition-opacity">
          <div className="h-full w-full max-w-md bg-white p-6 shadow-2xl overflow-y-auto space-y-6 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-lg bg-[#F8CAE4]/25 text-[#832D51]">
                  <Building2 className="size-4.5" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {selectedCust.customer_name}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">{selectedCust.company_name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCust(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Assignment Hierarchy
                </span>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Sales Manager:</span>
                  <span className="text-slate-900 font-black">{selectedCust.manager_name || 'Unassigned'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Sales Executive:</span>
                  <span className="text-slate-900 font-black">{selectedCust.executive_name || 'Unassigned'}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Product / Service:</span>
                  <span className="text-slate-900 font-bold">{selectedCust.product}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Contract / Deal Value:</span>
                  <span className="text-[#832D51] font-black text-sm">₹{(selectedCust.amount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Account Status:</span>
                  <span className="text-emerald-700 font-black">{selectedCust.status}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Onboarding Date:</span>
                  <span className="text-slate-900 font-bold">{selectedCust.date || 'N/A'}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Customer ID:</span>
                  <span className="text-slate-400 font-mono text-[10px]">{selectedCust.customer_id}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CeoCustomers
