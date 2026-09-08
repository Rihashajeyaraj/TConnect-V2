import React, { useState, useEffect } from 'react'
import { normalizePhoneNumber } from '../../utils/formatUtils.js'
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
  User,
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
import { customerAPI, crmAPI, hrmsAPI } from '../../services/api.js'
import { collectManagerSubordinates } from '../../utils/managerScoping.js'
import useCurrentUser from '../../hooks/useCurrentUser.js'

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
  const [popupOpen, setPopupOpen] = useState(false)
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

  const currentUser = useCurrentUser()
  const [executives, setExecutives] = useState([])

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

  // Get current manager info helper
  const getStoredUser = () => {
    try {
      const u = localStorage.getItem('user') || localStorage.getItem('tc_user')
      return u ? JSON.parse(u) : {}
    } catch (e) { return {} }
  }

  // Load executives and customers from backend API
  useEffect(() => {
    // 1. Fetch executives reporting to manager
    hrmsAPI.getEmployees()
      .then(res => {
        const raw = Array.isArray(res) ? res : (res?.data || [])
        const assigned = collectManagerSubordinates(raw, currentUser).filter(e => {
          const roleLower = String(e.role || e.designation || '').toLowerCase()
          return !roleLower.includes('team lead') && !roleLower.includes('lead') && !roleLower.includes('tl') && !roleLower.includes('manager')
        })
        setExecutives(assigned)
        if (assigned.length > 0) {
          setNewCust(prev => ({ ...prev, assignedExecutive: assigned[0].name || assigned[0].full_name }))
        }
      })
      .catch(err => {
        console.error("Failed to load executives for manager:", err)
      })

    // 2. Fetch customers and merge with local
    customerAPI.getCustomers()
      .then(res => {
        const raw = Array.isArray(res) ? res : (res?.data || [])
        const normalized = raw.map(c => ({
          id: c.customer_id || c.id,
          customer_id: c.customer_id || c.id,
          name: c.name || c.company || c.company_name || "Client Account",
          company: c.company || c.name || c.company_name || "Client Account",
          contactPerson: c.person || c.contactPerson || c.contact_person || "—",
          phone: c.phone || c.mobile || "—",
          email: c.email || "—",
          city: c.city || (c.billing_address || "").split(",")[0] || "Chennai",
          status: c.status || "Active",
          assignedExecutive: c.sales_executive_name || c.executive_name || c.assignedExecutive || "—",
          revenue: c.contractValue || c.revenue || (c.contract_value ? `₹${c.contract_value.toLocaleString()}` : "₹5,00,000"),
          tier: c.packageTier || c.tier || "Standard Corporate Pack",
          reachOutReason: c.notes || c.reachOutReason || "Onboarded customer account.",
          lastVisitDate: c.lastVisitDate || c.date || "",
          totalVisits: c.totalVisits || 1,
          paymentStatus: c.paymentStatus || "Paid (Current)",
          specialRemarks: c.specialRemarks || c.notes || "Newly onboarded client account.",
          remarksHistory: c.remarksHistory || [],
          date: c.created_at || c.created_date || c.conversion_date || c.date || "",
          created_at: c.created_at || c.created_date || c.conversion_date || c.date || "",
          conversion_date: c.conversion_date || c.created_at || c.date || "",
        }))

        setCustomerList(prev => {
          const merged = [...normalized]
          // Sync any local records that don't exist in Supabase database
          prev.forEach(lc => {
            const exists = merged.some(
              sc =>
                (sc.customer_id && sc.customer_id === lc.customer_id) ||
                (sc.id && sc.id === lc.id) ||
                ((sc.name || "").toLowerCase().trim() === (lc.name || lc.company || "").toLowerCase().trim())
            )
            if (!exists && lc.name) {
              merged.push(lc)
              customerAPI.createCustomer({
                name: lc.name || lc.company,
                company: lc.name || lc.company,
                company_name: lc.name || lc.company,
                person: lc.contactPerson,
                contact_person: lc.contactPerson,
                phone: lc.phone,
                mobile: lc.phone,
                email: lc.email,
                city: lc.city,
                status: lc.status,
                sales_executive_name: lc.assignedExecutive,
                executive_name: lc.assignedExecutive,
                revenue: lc.revenue,
                contractValue: lc.revenue,
                packageTier: lc.tier,
                notes: lc.reachOutReason,
                specialRemarks: lc.specialRemarks,
                remarksHistory: lc.remarksHistory,
              }).catch(() => null)
            }
          })
          return merged
        })
      })
      .catch(err => {
        console.error("Failed to load customers from Supabase:", err)
      })
  }, [currentUser])

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

    // Linear Date Sorting & Filter Logic (dynamic, always uses current date)
    const lastDateStr = String(cust.lastVisitDate || cust.date || cust.created_at || '')
    let matchesDate = true
    const nowDt = new Date()
    const todayISO = nowDt.toISOString().slice(0, 10)
    const yesterdayISO = new Date(nowDt.getFullYear(), nowDt.getMonth(), nowDt.getDate() - 1).toISOString().slice(0, 10)
    const monthStartISO = new Date(nowDt.getFullYear(), nowDt.getMonth(), 1).toISOString().slice(0, 10)
    const monthEndISO = new Date(nowDt.getFullYear(), nowDt.getMonth() + 1, 0).toISOString().slice(0, 10)
    // Normalize lastDateStr to YYYY-MM-DD for comparison
    let normDate = lastDateStr
    if (normDate && normDate.includes('/')) {
      const parts = normDate.split('/').map(p => p.split('T')[0])
      if (parts.length === 3) {
        if (parts[2].length === 4) normDate = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`
        else if (parts[0].length === 4) normDate = `${parts[0]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}`
      }
    } else if (normDate && normDate.includes('T')) {
      normDate = normDate.split('T')[0]
    }
    if (dateFilterTab === 'Today') {
      matchesDate = !normDate || normDate === todayISO
    } else if (dateFilterTab === 'Yesterday') {
      matchesDate = !normDate || normDate === yesterdayISO
    } else if (dateFilterTab === 'This Month') {
      matchesDate = !normDate || (normDate >= monthStartISO && normDate <= monthEndISO)
    } else if (dateFilterTab === 'Custom') {
      if (fromDate) matchesDate = matchesDate && (!normDate || normDate >= fromDate)
      if (toDate) matchesDate = matchesDate && (!normDate || normDate <= toDate)
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

  const handleCreateCustomer = async (e) => {
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

    // Save to local state first
    setCustomerList((prev) => [createdRecord, ...prev])
    setShowAddModal(false)

    // Save to Supabase DB via customerAPI
    try {
      await customerAPI.createCustomer({
        name: createdRecord.name,
        company: createdRecord.name,
        company_name: createdRecord.name,
        person: createdRecord.contactPerson,
        contact_person: createdRecord.contactPerson,
        phone: createdRecord.phone,
        mobile: createdRecord.phone,
        email: createdRecord.email,
        city: createdRecord.city,
        status: createdRecord.status,
        sales_executive_name: createdRecord.assignedExecutive,
        executive_name: createdRecord.assignedExecutive,
        revenue: createdRecord.revenue,
        contractValue: createdRecord.revenue,
        packageTier: createdRecord.tier,
        notes: createdRecord.reachOutReason,
        specialRemarks: createdRecord.specialRemarks,
        remarksHistory: createdRecord.remarksHistory,
      })
      showToast(`Customer "${createdRecord.name}" successfully onboarded and saved to database!`, 'success')
    } catch (err) {
      showToast(`Customer onboarded locally: ${err.message || err}`, 'info')
    }

    setNewCust({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      city: 'Chennai',
      assignedExecutive: executives.length > 0 ? executives[0].name : 'Ashwini E',
      revenue: '₹5,00,000',
      tier: 'Standard Corporate Pack',
      status: 'Active',
      reachOutReason: '',
      specialRemarks: 'Newly onboarded client account.',
      remarksHistory: [],
    })
  }

  return (
    <div className="space-y-6 font-sans text-slate-900 bg-slate-50 min-h-screen px-4 md:px-6 pt-6 pb-12">
      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            Client Directory & Accounts
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Oversee team client accounts, onboard new clients, and inspect conversion revenue.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="mgr-card px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
        >
          <Plus size={16} /> Onboard New Client
        </button>
      </div>

      {/* ── METRICS SUMMARY GRID ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-black">Total Accounts</div>
            <div className="text-2xl font-black text-blue-600 mt-1">{totalCustomers}</div>
            <div className="text-[11px] text-slate-500 font-bold mt-0.5">Clients Onboarded</div>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-black">Active Accounts</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{activeCount}</div>
            <div className="text-[11px] text-slate-500 font-bold mt-0.5">Active Status</div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-black">Total Revenue</div>
            <div className="text-2xl font-black text-teal-600 mt-1">{formattedTotalRevenue}</div>
            <div className="text-[11px] text-slate-500 font-bold mt-0.5">Team Revenue</div>
          </div>
          <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl border border-teal-100">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-black">Enterprise Packs</div>
            <div className="text-2xl font-black text-purple-600 mt-1">{enterpriseCount}</div>
            <div className="text-[11px] text-slate-500 font-bold mt-0.5">Corporate Tier</div>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100">
            <Briefcase className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ── CLIENT ACCOUNTS LEDGER TABLE CONTAINER ─────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-600" /> Client Accounts Directory & Ledger
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Filter by sales executive and date range to inspect team account conversions
            </p>
          </div>
        </div>

        {/* Filter Control Options */}
        <div className="flex flex-col gap-2.5 pb-3 border-b border-slate-100">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Executive & Date Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Executive Filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Executive:</span>
                <select
                  value={executiveFilter}
                  onChange={(e) => setExecutiveFilter(e.target.value)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 focus:outline-none cursor-pointer font-bold rounded-lg px-2.5 py-1.5 text-xs transition border border-slate-200 max-w-[160px] truncate"
                >
                  <option value="All">All Executives</option>
                  {executives.map((ex) => (
                    <option key={ex.id || ex.name} value={ex.name || ex.full_name}>
                      {ex.name || ex.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Pills */}
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 whitespace-nowrap">Date:</span>
                {['All Time', 'Today', 'Yesterday', 'This Month', 'Custom'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setDateFilterTab(tab)}
                    className={`mgr-card px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer shrink-0 ${
                      dateFilterTab === tab
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
                {dateFilterTab === 'Custom' && (
                  <div className="flex items-center gap-1.5 ml-1 flex-wrap sm:flex-nowrap pt-1 sm:pt-0">
                    <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                      className="bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none cursor-pointer" />
                    <span className="text-slate-400 text-xs">→</span>
                    <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                      className="bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none cursor-pointer" />
                  </div>
                )}
              </div>
            </div>

            {/* Search & Reset Controls */}
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search client, person..."
                  className="w-full h-8 bg-slate-100 border border-slate-200 rounded-lg pl-8 pr-3 text-xs text-slate-900 focus:outline-none font-semibold placeholder-slate-400"
                />
              </div>

              {/* Reset */}
              {(executiveFilter !== 'All' || dateFilterTab !== 'All Time' || search || fromDate || toDate) && (
                <button
                  onClick={() => { setExecutiveFilter('All'); setDateFilterTab('All Time'); setSearch(''); setFromDate(''); setToDate('') }}
                  className="mgr-card px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg cursor-pointer transition shrink-0 whitespace-nowrap"
                >
                  ✕ Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-y-auto overflow-x-auto min-h-[250px] border border-slate-200 rounded-2xl shadow-2xs">
          <table className="w-full text-left text-sm text-slate-800 min-w-[850px]">
            <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-700 z-10">
              <tr>
                <th className="px-5 py-4">Sales Executive name</th>
                <th className="px-5 py-4">Client Details</th>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Revenue</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-16 text-slate-400 font-bold text-xs">
                    No client account records match your selected filters.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50/70 transition">
                    
                    {/* 1. Sales Executive name */}
                    <td className="px-5 py-4.5 font-black text-slate-900 text-sm">
                      {cust.assignedExecutive || '—'}
                    </td>

                    {/* 2. Customer Details */}
                    <td className="px-5 py-4.5 max-w-[320px]">
                      <div className="font-black text-slate-900 text-sm">
                        {cust.name || cust.company}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold font-mono">
                        ID: {cust.id}
                      </div>
                      <div className="text-xs text-slate-600 font-semibold mt-1 space-y-0.5">
                        <p className="flex items-center gap-1">
                          <User size={12} className="text-mgr-primary-700 shrink-0" />
                          <span>{cust.contactPerson || cust.person || '—'}</span>
                        </p>
                        <p className="flex items-center gap-1">
                          <Mail size={12} className="text-mgr-primary-700 shrink-0" />
                          <span className="truncate">{cust.email || '—'}</span>
                        </p>
                        <p className="flex items-center gap-1">
                          <MapPin size={12} className="text-mgr-primary-700 shrink-0" />
                          <span>{cust.city || '—'}</span>
                        </p>
                      </div>
                    </td>

                    {/* 3. Date Column */}
                    <td className="px-5 py-4.5 font-bold font-mono text-slate-800 text-xs whitespace-nowrap">
                      🗓️ {formatDate(cust.date || cust.created_at || cust.conversion_date || cust.lastVisitDate)}
                    </td>

                    {/* 4. Revenue */}
                    <td className="px-5 py-4.5 font-black text-emerald-700 text-base">
                      {cust.revenue || '₹5,00,000'}
                    </td>

                    {/* 5. Action */}
                    <td className="px-5 py-4.5">
                      <button
                        onClick={() => setSelectedCustomer(cust)}
                        className="mgr-card px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] cursor-pointer transition flex items-center gap-1"
                      >
                        <Eye size={12} /> View Details
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                className="mgr-card p-1 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs font-semibold text-slate-700 max-h-[60vh] overflow-y-auto pr-1">
              {/* Why They Reached Out */}
              <div className="p-3.5 bg-mgr-primary-50 border border-mgr-primary-300 rounded-2xl space-y-1">
                <span className="text-[10px] font-black text-[#b45309] uppercase tracking-wider block">
                  ❓ WHY THEY REACHED OUT TO US
                </span>
                <p className="text-xs text-mgr-primary-950 font-bold leading-relaxed">
                  {selectedCustomer.reachOutReason || 'Needed multi-device GPS field tracking for medical reps & real-time visit reports.'}
                </p>
              </div>

              {/* Package Tier & Account Executive */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-slate-50 border-slate-200 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Package Tier</span>
                  <p className="text-xs font-extrabold text-slate-900">{selectedCustomer.tier || 'Enterprise Platinum Suite'}</p>
                </div>
                <div className="p-3 bg-slate-50 border-slate-200 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Assigned Sales Executive</span>
                  <p className="text-xs font-black text-mgr-primary-900">{selectedCustomer.assignedExecutive}</p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="p-3 bg-slate-50 border-slate-200 rounded-xl space-y-1.5">
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
                className="mgr-card px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-extrabold text-xs cursor-pointer transition"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ONBOARD NEW CUSTOMER MODAL ───────────────────────────────────────── */}
      {showAddModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false) }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl my-auto cursor-default"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">Onboard New Client Account</h3>
                <p className="text-xs font-bold text-[#b45309]">Assign account to territory Sales Executive</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="mgr-card p-1 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3.5 text-xs font-semibold">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Company / Client Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zenith Global Infratech"
                  value={newCust.name}
                  onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                  className="w-full h-9 bg-slate-50 border-slate-200 rounded-xl px-3 text-xs font-semibold focus:outline-none focus:border-mgr-primary-500"
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
                    className="w-full h-9 bg-slate-50 border-slate-200 rounded-xl px-3 text-xs font-semibold focus:outline-none focus:border-mgr-primary-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit number e.g. 9876543210"
                    value={newCust.phone}
                    onChange={(e) => setNewCust({ ...newCust, phone: normalizePhoneNumber(e.target.value) })}
                    className="w-full h-9 bg-slate-50 border-slate-200 rounded-xl px-3 text-xs font-semibold focus:outline-none focus:border-mgr-primary-500"
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
                    className="w-full h-9 bg-slate-50 border-slate-200 rounded-xl px-3 text-xs font-semibold focus:outline-none focus:border-mgr-primary-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">City / Territory</label>
                  <input
                    type="text"
                    placeholder="e.g. Chennai"
                    value={newCust.city}
                    onChange={(e) => setNewCust({ ...newCust, city: e.target.value })}
                    className="w-full h-9 bg-slate-50 border-slate-200 rounded-xl px-3 text-xs font-semibold focus:outline-none focus:border-mgr-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Assigned Sales Executive</label>
                  <select
                    value={newCust.assignedExecutive}
                    onChange={(e) => setNewCust({ ...newCust, assignedExecutive: e.target.value })}
                    className="mgr-card w-full h-9 bg-slate-50 border-slate-200 rounded-xl px-2 text-xs font-bold focus:outline-none cursor-pointer"
                  >
                    {executives.map((ex) => (
                      <option key={ex.id || ex.name} value={ex.name}>
                        {ex.name}
                      </option>
                    ))}
                    {executives.length === 0 && (
                      <>
                        <option value="Ashwini E">Ashwini E</option>
                        <option value="Suresh Raina">Suresh Raina</option>
                        <option value="Vikram Singh">Vikram Singh</option>
                        <option value="Abi hastro">Abi hastro</option>
                        <option value="Ananya Roy">Ananya Roy</option>
                        <option value="Karthik Raja">Karthik Raja</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Revenue Value</label>
                  <input
                    type="text"
                    placeholder="e.g. ₹6,50,000"
                    value={newCust.revenue}
                    onChange={(e) => setNewCust({ ...newCust, revenue: e.target.value })}
                    className="w-full h-9 bg-slate-50 border-slate-200 rounded-xl px-3 text-xs font-semibold focus:outline-none focus:border-mgr-primary-500"
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
                  className="w-full bg-slate-50 border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-mgr-primary-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="mgr-card px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs cursor-pointer hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="mgr-card px-4 py-2 bg-mgr-primary-700 hover:bg-mgr-primary-800 text-white rounded-xl font-black text-xs cursor-pointer transition shadow-md shadow-yellow-600/20"
                >
                  Onboard Client Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
