import React, { useState, useEffect } from 'react'
import {
  Building2,
  Search,
  Filter,
  UserCheck,
  DollarSign,
  CalendarDays,
  CreditCard,
  FileText,
  Phone,
  Mail,
  MapPin,
  Eye,
  X,
  LayoutGrid,
  Table as TableIcon,
  Download,
  CheckCircle2,
  Users,
  Briefcase,
  Star,
  RefreshCw,
  Plus,
  TrendingUp,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react'
import { formatDate } from '../../utils/dateUtils.js'
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/exportUtils.js'
import { useToast } from '../../common/ToastContext.jsx'
import { useManagerFilter } from './ManagerFilterContext.jsx'

const DEFAULT_MANAGER_CUSTOMERS = []

export default function ManagerCustomers() {
  const { showToast } = useToast()
  const [viewMode, setViewMode] = useState('table') // 'table' (default) | 'card'
  const [search, setSearch] = useState('')
  const [executiveFilter, setExecutiveFilter] = useState('All')
  const [customExecInput, setCustomExecInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [customStatusInput, setCustomStatusInput] = useState('')
  const [dateFilterTab, setDateFilterTab] = useState('All Time')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)

  // New Customer Form State
  const [newCust, setNewCust] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    city: 'Chennai',
    assignedExecutive: 'Ashwini E',
    revenue: '₹5,00,000',
    tier: 'Standard Corporate Pack',
    status: 'Active',
    reachOutReason: '',
    specialRemarks: '',
  })

  const [customerList, setCustomerList] = useState(() => {
    try {
      const saved = localStorage.getItem('tc_customer_accounts')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const combined = [...parsed]
          DEFAULT_MANAGER_CUSTOMERS.forEach((d) => {
            if (!combined.some((c) => (c?.name || c?.company || '').toLowerCase() === (d?.name || d?.company || '').toLowerCase())) {
              combined.push(d)
            }
          })
          return combined
        }
      }
      return DEFAULT_MANAGER_CUSTOMERS
    } catch {
      return DEFAULT_MANAGER_CUSTOMERS
    }
  })

  // Synchronize state with local storage updates
  useEffect(() => {
    try {
      localStorage.setItem('tc_customer_accounts', JSON.stringify(customerList))
    } catch (e) { }
  }, [customerList])

  const filteredCustomers = customerList.filter((cust) => {
    const searchKw = search.toLowerCase()
    const matchesSearch =
      !searchKw ||
      (cust.name || cust.company || '').toLowerCase().includes(searchKw) ||
      (cust.contactPerson || cust.person || '').toLowerCase().includes(searchKw) ||
      (cust.city || '').toLowerCase().includes(searchKw) ||
      (cust.email || '').toLowerCase().includes(searchKw)

    // Executive Filter Logic
    let matchesExec = executiveFilter === 'All'
    if (executiveFilter === 'Other') {
      matchesExec = !customExecInput || (cust.assignedExecutive || '').toLowerCase().includes(customExecInput.toLowerCase().trim())
    } else if (executiveFilter !== 'All') {
      matchesExec = (cust.assignedExecutive || '').toLowerCase().includes(executiveFilter.toLowerCase())
    }

    // Status Filter Logic
    let matchesStatus = statusFilter === 'All'
    if (statusFilter === 'Other') {
      matchesStatus = !customStatusInput || (cust.status || '').toLowerCase().includes(customStatusInput.toLowerCase().trim())
    } else if (statusFilter !== 'All') {
      matchesStatus = cust.status === statusFilter
    }

    // Linear Date Sorting & Filter Logic
    const lastDateStr = String(cust.lastVisitDate || cust.date || '')
    let matchesDate = true
    if (dateFilterTab === 'Today') {
      matchesDate = lastDateStr.includes('2026-08-06') || lastDateStr.includes('06/08/2026') || lastDateStr.includes('02/08/2026')
    } else if (dateFilterTab === 'Yesterday') {
      matchesDate = lastDateStr.includes('2026-08-05') || lastDateStr.includes('05/08/2026') || lastDateStr.includes('01/08/2026')
    } else if (dateFilterTab === 'Tomorrow') {
      matchesDate = lastDateStr.includes('2026-08-07') || lastDateStr.includes('07/08/2026')
    } else if (dateFilterTab === 'This Month') {
      matchesDate = lastDateStr.includes('2026-08') || lastDateStr.includes('/08/') || lastDateStr.includes('/07/')
    } else if (dateFilterTab === 'Custom') {
      if (fromDate) matchesDate = matchesDate && lastDateStr >= fromDate
      if (toDate) matchesDate = matchesDate && lastDateStr <= toDate
    }

    return matchesSearch && matchesExec && matchesStatus && matchesDate
  })

  // Calculate Metrics
  const totalCustomers = customerList.length
  const totalRevenueNum = customerList.reduce((acc, c) => {
    const amt = parseFloat(String(c.revenue || '0').replace(/[^0-9.]/g, '')) || 0
    return acc + amt
  }, 0)
  const formattedTotalRevenue = `₹${totalRevenueNum.toLocaleString('en-IN')}`
  const activeCount = customerList.filter((c) => c.status === 'Active').length
  const enterpriseCount = customerList.filter((c) => (c.tier || '').toLowerCase().includes('enterprise')).length

  const handleCreateCustomer = (e) => {
    e.preventDefault()
    if (!newCust.name.trim() || !newCust.contactPerson.trim() || !newCust.phone.trim()) {
      showToast('Please fill all required customer fields!', 'error')
      return
    }

    const createdRecord = {
      id: `CUST-${Date.now().toString().slice(-4)}`,
      name: newCust.name,
      contactPerson: newCust.contactPerson,
      phone: newCust.phone,
      email: newCust.email || `${newCust.name.toLowerCase().replace(/\s+/g, '')}@client.com`,
      city: newCust.city,
      assignedExecutive: newCust.assignedExecutive,
      revenue: newCust.revenue,
      tier: newCust.tier,
      status: newCust.status,
      reachOutReason: newCust.reachOutReason || 'Direct onboarding via Sales Manager Portal.',
      lastVisitDate: formatDate(new Date()),
      totalVisits: 1,
      paymentStatus: 'Paid (Current)',
      specialRemarks: newCust.specialRemarks || 'Newly onboarded client account.',
      remarksHistory: [
        { date: formatDate(new Date()), note: `Account onboarded and assigned to ${newCust.assignedExecutive}.` },
      ],
    }

    setCustomerList((prev) => [createdRecord, ...prev])
    setShowAddModal(false)
    setNewCust({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      city: 'Chennai',
      assignedExecutive: 'Ashwini E',
      revenue: '₹5,00,000',
      tier: 'Standard Corporate Pack',
      status: 'Active',
      reachOutReason: '',
      specialRemarks: '',
    })
    showToast(`Customer "${createdRecord.name}" onboarded and assigned to ${createdRecord.assignedExecutive}!`, 'success')
  }

  return (
    <div className="space-y-6 font-sans text-slate-900 bg-slate-50 min-h-screen pb-12">
      {/* ── Header Banner (Warm Amber Theme) ────────────────────────────────── */}
      <div className="bg-white border border-amber-200 p-6 rounded-3xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-[#b45309]" /> Team Customer Accounts Directory
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Complete dossier of all customer accounts converted & managed by Sales Executives under your management.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-[#ca8a04] hover:bg-[#a16207] text-white font-black text-xs shadow-md shadow-yellow-600/20 flex items-center gap-1.5 cursor-pointer transition"
          >
            <Plus size={16} /> Onboard Customer Account
          </button>

          {/* Cards / Table View Toggle */}
          <div className="bg-amber-50 p-1 rounded-xl border border-amber-300 flex items-center gap-1">
            <button
              onClick={() => setViewMode('card')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${viewMode === 'card'
                  ? 'bg-[#ca8a04] text-white shadow-xs'
                  : 'text-amber-900 hover:bg-amber-100'
                }`}
            >
              <LayoutGrid size={14} /> Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${viewMode === 'table'
                  ? 'bg-[#ca8a04] text-white shadow-xs'
                  : 'text-amber-900 hover:bg-amber-100'
                }`}
            >
              <TableIcon size={14} /> Table
            </button>
          </div>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-xs"
            >
              <Download size={15} /> Export <span className="text-[10px]">▼</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-1 flex flex-col gap-0.5 text-slate-900">
                <button
                  type="button"
                  onClick={() => {
                    const exportRows = filteredCustomers.map((c) => ({
                      Customer_ID: c.id,
                      Company: c.name || c.company,
                      Contact_Person: c.contactPerson || c.person,
                      Executive: c.assignedExecutive,
                      City: c.city,
                      Revenue: c.revenue,
                      Tier: c.tier,
                      Status: c.status,
                    }))
                    exportToPDF(`Manager_Customers_Report_${new Date().toISOString().slice(0, 10)}`, 'Manager Team Customers Dossier', exportRows)
                    setShowExportMenu(false)
                  }}
                  className="px-3 py-2 rounded-lg text-left text-xs font-bold hover:bg-amber-50 hover:text-amber-900 transition cursor-pointer"
                >
                  📄 Export as PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const exportRows = filteredCustomers.map((c) => ({
                      Customer_ID: c.id,
                      Company: c.name || c.company,
                      Contact_Person: c.contactPerson || c.person,
                      Executive: c.assignedExecutive,
                      City: c.city,
                      Revenue: c.revenue,
                      Tier: c.tier,
                      Status: c.status,
                    }))
                    exportToExcel(`Manager_Customers_Report_${new Date().toISOString().slice(0, 10)}.xls`, exportRows)
                    setShowExportMenu(false)
                  }}
                  className="px-3 py-2 rounded-lg text-left text-xs font-bold hover:bg-amber-50 hover:text-amber-900 transition cursor-pointer"
                >
                  📊 Export as Excel (.xls)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const exportRows = filteredCustomers.map((c) => ({
                      Customer_ID: c.id,
                      Company: c.name || c.company,
                      Contact_Person: c.contactPerson || c.person,
                      Executive: c.assignedExecutive,
                      City: c.city,
                      Revenue: c.revenue,
                      Tier: c.tier,
                      Status: c.status,
                    }))
                    exportToCSV(`Manager_Customers_Report_${new Date().toISOString().slice(0, 10)}.csv`, exportRows)
                    setShowExportMenu(false)
                  }}
                  className="px-3 py-2 rounded-lg text-left text-xs font-bold hover:bg-amber-50 hover:text-amber-900 transition cursor-pointer"
                >
                  📝 Export as CSV (.csv)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI Summary Cards (2 CARDS) ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-[#fffdf5] border border-amber-300 p-4 rounded-2xl shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-[#7c2d12]">Total Accounts</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-[#b45309] flex items-center justify-center font-bold">
              <Building2 size={16} />
            </div>
          </div>
          <h2 className="text-2xl font-black text-slate-900">{totalCustomers} Clients</h2>
          <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black border border-emerald-300">
            ✅ {activeCount} Active
          </span>
        </div>

        <div className="bg-[#fffdf5] border border-amber-300 p-4 rounded-2xl shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-[#7c2d12]">Customer Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-[#b45309] flex items-center justify-center font-bold">
              <DollarSign size={16} />
            </div>
          </div>
          <h2 className="text-2xl font-black text-slate-900">{formattedTotalRevenue}</h2>
          <span className="inline-block px-2 py-0.5 rounded-full bg-amber-100 text-[#b45309] text-[9px] font-black border border-amber-300">
            📈 Annualized Account Portfolio
          </span>
        </div>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Executive & Status Filters (Positioned on Left Side) */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Executive Filter (With 'Other' Custom Search Option) */}
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 rounded-xl px-3 py-1.5 font-extrabold text-amber-900">
              <span className="text-amber-800 font-bold">Executive:</span>
              <select
                value={executiveFilter}
                onChange={(e) => setExecutiveFilter(e.target.value)}
                className="bg-transparent text-amber-950 font-black focus:outline-none cursor-pointer"
              >
                <option value="All">All Executives</option>
                <option value="Ashwini E">Ashwini E</option>
                <option value="Suresh Raina">Suresh Raina</option>
                <option value="Vikram Singh">Vikram Singh</option>
                <option value="Abi hastro">Abi hastro</option>
                <option value="Ananya Roy">Ananya Roy</option>
                <option value="Karthik Raja">Karthik Raja</option>
                <option value="Other">Other (Type Custom...)</option>
              </select>
            </div>

            {/* Custom Executive Input Box (Visible when 'Other' is selected) */}
            {executiveFilter === 'Other' && (
              <input
                type="text"
                value={customExecInput}
                onChange={(e) => setCustomExecInput(e.target.value)}
                placeholder="Type SE name or code..."
                className="h-8 bg-white border border-amber-300 rounded-xl px-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
              />
            )}

            {/* Status Filter (With 'Other' Custom Search Option) */}
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 rounded-xl px-3 py-1.5 font-extrabold text-amber-900">
              <span className="text-amber-800 font-bold">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-amber-950 font-black focus:outline-none cursor-pointer"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Other">Other (Type Custom...)</option>
              </select>
            </div>

            {/* Custom Status Input Box (Visible when 'Other' is selected) */}
            {statusFilter === 'Other' && (
              <input
                type="text"
                value={customStatusInput}
                onChange={(e) => setCustomStatusInput(e.target.value)}
                placeholder="Type custom status..."
                className="h-8 bg-white border border-amber-300 rounded-xl px-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
              />
            )}
          </div>

          {/* Search Input (Positioned on Right Side) */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search company, contact person, email, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 bg-amber-50/50 border border-amber-300 rounded-xl pl-9 pr-4 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* ── LINEAR DATE SORTING & FILTER PILLS ──────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5 bg-amber-50/60 p-1 rounded-xl border border-amber-200/80 text-xs font-black">
            <span className="text-amber-900 px-2 py-0.5 font-black uppercase tracking-wider text-[10px]">
              Date Filter:
            </span>
            {['All Time', 'Today', 'Yesterday', 'Tomorrow', 'This Month', 'Custom'].map((tab) => (
              <button
                key={tab}
                onClick={() => setDateFilterTab(tab)}
                className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                  dateFilterTab === tab
                    ? 'bg-[#ca8a04] text-white shadow-2xs'
                    : 'text-amber-950 hover:bg-amber-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Custom Date Range Picker Inputs */}
          {dateFilterTab === 'Custom' && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 rounded-xl px-3 py-1.5 font-bold text-xs">
              <span className="text-amber-900 font-extrabold">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent text-slate-800 focus:outline-none cursor-pointer font-bold text-xs"
              />
              <span className="text-amber-900 font-extrabold ml-1">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent text-slate-800 focus:outline-none cursor-pointer font-bold text-xs"
              />
            </div>
          )}

          {/* Reset Filters Button */}
          {(executiveFilter !== 'All' || statusFilter !== 'All' || customExecInput || customStatusInput || dateFilterTab !== 'All Time' || search || fromDate || toDate) && (
            <button
              onClick={() => {
                setExecutiveFilter('All')
                setStatusFilter('All')
                setCustomExecInput('')
                setCustomStatusInput('')
                setDateFilterTab('All Time')
                setSearch('')
                setFromDate('')
                setToDate('')
              }}
              className="text-[11px] font-extrabold text-rose-700 hover:underline cursor-pointer ml-auto"
            >
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* ── CARD VIEW ───────────────────────────────────────────────────────── */}
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredCustomers.map((cust) => {
            const initials = (cust.name || cust.company || 'C').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
            return (
              <div
                key={cust.id}
                className="bg-[#fffdf5] border border-amber-300 rounded-3xl p-5 shadow-2xs hover:shadow-md hover:border-amber-400 transition-all space-y-4 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white font-black text-base flex items-center justify-center shadow-md shrink-0">
                        {initials}
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-900 group-hover:text-[#b45309] transition leading-tight">
                          {cust.name || cust.company}
                        </h3>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">{cust.contactPerson || cust.person}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-950 border border-amber-300">
                      {cust.tier || 'Enterprise Suite'}
                    </span>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-300">
                      {cust.revenue || '₹4,50,000'}
                    </span>
                  </div>

                  <div className="space-y-1.5 mt-3 text-xs font-semibold text-slate-700">
                    <div className="flex items-center gap-2">
                      <UserCheck size={14} className="text-[#b45309]" />
                      <span className="text-amber-950 font-black">Sales Exec: {cust.assignedExecutive}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-blue-600" />
                      <span>{cust.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-rose-500" />
                      <span>{cust.city}</span>
                    </div>
                  </div>

                  {/* Initial Manager Reach-Out Reason */}
                  <div className="mt-3.5 p-3 bg-amber-100/70 border border-amber-300 rounded-xl text-[11px] font-medium text-amber-950 space-y-0.5">
                    <span className="text-[10px] font-black text-[#b45309] block uppercase tracking-wider">
                      ❓ WHY THEY REACHED OUT TO US
                    </span>
                    <p className="leading-relaxed font-semibold">{cust.reachOutReason || 'Needed multi-device GPS field tracking & real-time visit reports.'}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-amber-200/60 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500">Converted: {cust.lastVisitDate || 'Active'}</span>
                  <button
                    onClick={() => setSelectedCustomer(cust)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#ca8a04] hover:bg-[#a16207] text-white font-black text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  >
                    <Eye size={13} /> View Full Dossier
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ── TABLE VIEW ──────────────────────────────────────────────────────── */
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-amber-50/80 text-[10px] font-black uppercase text-amber-950 border-b border-amber-300">
                <th className="py-3 px-4">Customer / Company</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Assigned Sales Executive</th>
                <th className="py-3 px-4">City</th>
                <th className="py-3 px-4">Revenue</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredCustomers.map((cust) => (
                <tr key={cust.id} className="hover:bg-amber-50/40 transition">
                  <td className="py-3.5 px-4">
                    <p className="font-black text-slate-900">{cust.name || cust.company}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{cust.id}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-extrabold text-slate-800">{cust.contactPerson || cust.person}</p>
                    <p className="text-[10px] text-slate-500">{cust.email}</p>
                  </td>
                  <td className="py-3.5 px-4 font-black text-amber-900">{cust.assignedExecutive}</td>
                  <td className="py-3.5 px-4">{cust.city}</td>
                  <td className="py-3.5 px-4 font-black text-emerald-700">{cust.revenue || '₹4,50,000'}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                      ✅ {cust.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setSelectedCustomer(cust)}
                      className="px-3 py-1 rounded-xl bg-[#ca8a04] hover:bg-[#a16207] text-white font-black text-[11px] cursor-pointer transition inline-flex items-center gap-1 shadow-2xs"
                    >
                      <Eye size={12} /> View Dossier
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── CUSTOMER DOSSIER MODAL ───────────────────────────────────────────── */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">{selectedCustomer.name || selectedCustomer.company}</h3>
                <p className="text-xs font-bold text-[#b45309]">Active Account Dossier & Telemetry</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs font-semibold text-slate-700 max-h-[60vh] overflow-y-auto pr-1">
              {/* Why They Reached Out */}
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl space-y-1">
                <span className="text-[10px] font-black text-[#b45309] uppercase tracking-wider block">
                  ❓ WHY THEY REACHED OUT TO US
                </span>
                <p className="text-xs text-amber-950 font-bold leading-relaxed">
                  {selectedCustomer.reachOutReason || 'Needed multi-device GPS field tracking for medical reps & real-time visit reports.'}
                </p>
              </div>

              {/* Package Tier & Account Executive */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Package Tier</span>
                  <p className="text-xs font-extrabold text-slate-900">{selectedCustomer.tier || 'Enterprise Platinum Suite'}</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Assigned Sales Executive</span>
                  <p className="text-xs font-black text-amber-900">{selectedCustomer.assignedExecutive}</p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Contact Details</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Contact Person</span>
                    <span className="font-bold text-slate-900">{selectedCustomer.contactPerson || selectedCustomer.person}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Phone</span>
                    <span className="font-bold text-slate-900">{selectedCustomer.phone}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Email</span>
                    <span className="font-bold text-slate-900 truncate block">{selectedCustomer.email}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">City</span>
                    <span className="font-bold text-slate-900">{selectedCustomer.city}</span>
                  </div>
                </div>
              </div>

              {/* Special Account Remarks */}
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-1">
                <span className="text-[10px] font-extrabold text-purple-800 uppercase tracking-wider block">SPECIAL ACCOUNT REMARKS</span>
                <p className="text-xs text-purple-950 font-medium">
                  {selectedCustomer.specialRemarks || 'Prefers monthly automated CSV report exports. Priority support assigned.'}
                </p>
              </div>

              {/* Remarks History */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">REMARKS & ACTIVITY LOGS</span>
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {(selectedCustomer.remarksHistory || []).map((r, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-0.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                        <span>Logged Note</span>
                        <span>{r.date}</span>
                      </div>
                      <p className="text-slate-800 font-semibold">{r.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-extrabold text-xs cursor-pointer transition"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ONBOARD NEW CUSTOMER MODAL ───────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">Onboard New Customer Account</h3>
                <p className="text-xs font-bold text-[#b45309]">Assign account to territory Sales Executive</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3.5 text-xs font-semibold">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Company / Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zenith Global Infratech"
                  value={newCust.name}
                  onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                  className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Contact Person *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mr. Rajesh Kumar"
                    value={newCust.contactPerson}
                    onChange={(e) => setNewCust({ ...newCust, contactPerson: e.target.value })}
                    className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-semibold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98765 00000"
                    value={newCust.phone}
                    onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                    className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-semibold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="client@company.com"
                    value={newCust.email}
                    onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
                    className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-semibold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">City / Territory</label>
                  <input
                    type="text"
                    placeholder="e.g. Chennai"
                    value={newCust.city}
                    onChange={(e) => setNewCust({ ...newCust, city: e.target.value })}
                    className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-semibold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Assigned Sales Executive</label>
                  <select
                    value={newCust.assignedExecutive}
                    onChange={(e) => setNewCust({ ...newCust, assignedExecutive: e.target.value })}
                    className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl px-2 text-xs font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="Ashwini E">Ashwini E</option>
                    <option value="Suresh Raina">Suresh Raina</option>
                    <option value="Vikram Singh">Vikram Singh</option>
                    <option value="Abi hastro">Abi hastro</option>
                    <option value="Ananya Roy">Ananya Roy</option>
                    <option value="Karthik Raja">Karthik Raja</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Revenue Value</label>
                  <input
                    type="text"
                    placeholder="e.g. ₹6,50,000"
                    value={newCust.revenue}
                    onChange={(e) => setNewCust({ ...newCust, revenue: e.target.value })}
                    className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-semibold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Reason They Reached Out</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Requested multi-device field visit GPS tracking and EOD reports."
                  value={newCust.reachOutReason}
                  onChange={(e) => setNewCust({ ...newCust, reachOutReason: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs cursor-pointer hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#ca8a04] hover:bg-[#a16207] text-white rounded-xl font-black text-xs cursor-pointer transition shadow-md shadow-yellow-600/20"
                >
                  Onboard Customer Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
