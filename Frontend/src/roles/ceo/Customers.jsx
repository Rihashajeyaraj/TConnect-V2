import React, { useState, useEffect } from 'react'
import {
  Users,
  Search,
  RefreshCw,
  Building2,
  TrendingUp,
  Award,
  ChevronRight,
  ArrowUpRight,
  Filter,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  Calendar,
  X,
  Target,
  CheckCircle2,
  Eye,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import { customerAPI, reportAPI, visitAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'

const MOCK_CUSTOMERS = [
  {
    id: 'CUST-101',
    company: 'Apex Technologies Pvt Ltd',
    contact: 'Rajesh Kumar',
    email: 'rajesh@apextech.com',
    phone: '+91 98765 43210',
    location: 'Chennai, TN',
    sales_manager: 'Vikram Singh',
    sales_executive: 'Ananya Roy',
    revenue: 450000,
    status: 'Active Customer',
    is_new: false,
    onboarding_date: '2026-04-15',
    notes: 'Enterprise ERP License & Annual Maintenance contract',
  },
  {
    id: 'CUST-102',
    company: 'Global Corp Solutions',
    contact: 'Sarah Smith',
    email: 'sarah@globalcorp.net',
    phone: '+91 87654 32109',
    location: 'Bangalore, KA',
    sales_manager: 'Suresh V',
    sales_executive: 'Karthik Raja',
    revenue: 250000,
    status: 'Active Customer',
    is_new: false,
    onboarding_date: '2026-05-10',
    notes: 'SaaS Multi-branch CRM Deployment',
  },
  {
    id: 'CUST-103',
    company: 'Vertex Systems Group',
    contact: 'David Miller',
    email: 'david@vertex.org',
    phone: '+91 76543 21098',
    location: 'Mumbai, MH',
    sales_manager: 'Vikram Singh',
    sales_executive: 'Robert Smith',
    revenue: 300000,
    status: 'Active Customer',
    is_new: true,
    onboarding_date: '2026-08-01',
    notes: 'Cloud Migration & Retainer support',
  },
  {
    id: 'CUST-104',
    company: 'Star Tech Enterprises',
    contact: 'Deepa Roy',
    email: 'deepa@startech.in',
    phone: '+91 99887 76655',
    location: 'Hyderabad, TS',
    sales_manager: 'Vikram Singh',
    sales_executive: 'Ananya Roy',
    revenue: 380000,
    status: 'Active Customer',
    is_new: true,
    onboarding_date: '2026-08-03',
    notes: 'Field force tracking system implementation',
  },
  {
    id: 'CUST-105',
    company: 'Zenith Logistics Hub',
    contact: 'Alice Lee',
    email: 'alice@zenith.com',
    phone: '+91 91234 56789',
    location: 'Coimbatore, TN',
    sales_manager: 'Suresh V',
    sales_executive: 'Mary Jane',
    revenue: 180000,
    status: 'Active Customer',
    is_new: false,
    onboarding_date: '2026-06-20',
    notes: 'Logistics tracking software module',
  },
  {
    id: 'CUST-106',
    company: 'InnoTech Solutions',
    contact: 'Vikas Gupta',
    email: 'vikas@innotech.com',
    phone: '+91 94567 12345',
    location: 'Bangalore, KA',
    sales_manager: 'Suresh V',
    sales_executive: 'Karthik Raja',
    revenue: 140000,
    status: 'Inactive',
    is_new: false,
    onboarding_date: '2026-03-12',
    notes: 'Contract expired, under renewal discussion',
  },
]

const ACQUISITION_TREND = [
  { month: 'Jan', newCustomers: 3, totalCustomers: 32, revenue: 320000 },
  { month: 'Feb', newCustomers: 4, totalCustomers: 36, revenue: 380000 },
  { month: 'Mar', newCustomers: 3, totalCustomers: 39, revenue: 410000 },
  { month: 'Apr', newCustomers: 5, totalCustomers: 44, revenue: 490000 },
  { month: 'May', newCustomers: 4, totalCustomers: 48, revenue: 520000 },
  { month: 'Jun', newCustomers: 3, totalCustomers: 51, revenue: 510000 },
  { month: 'Jul', newCustomers: 5, totalCustomers: 56, revenue: 610000 },
  { month: 'Aug', newCustomers: 4, totalCustomers: 60, revenue: 580000 },
]

function CeoCustomers() {
  const { showToast } = useToast()
  const [customers, setCustomers] = useState(MOCK_CUSTOMERS)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All') // 'All' | 'Active' | 'New' | 'Inactive'
  const [managerFilter, setManagerFilter] = useState('All')

  // Customer Lifecycle modal state
  const [selectedCust, setSelectedCust] = useState(null)
  const [showLifecycleModal, setShowLifecycleModal] = useState(false)

  // Fetch real customer data if available
  useEffect(() => {
    async function loadCustomers() {
      try {
        setLoading(true)
        const res = await customerAPI.getCustomers().catch(() => null)
        if (res && res.data && res.data.length > 0) {
          // Merge with mock fields for rich display
          const loaded = res.data.map((c, i) => ({
            id: c.id || `CUST-${100 + i}`,
            company: c.company_name || c.name || c.company || 'Enterprise Account',
            contact: c.contact_person || c.contact || 'Primary Contact',
            email: c.email || 'contact@client.com',
            phone: c.phone || '+91 98765 00000',
            location: c.location || c.address || 'Chennai, TN',
            sales_manager: c.sales_manager || (i % 2 === 0 ? 'Vikram Singh' : 'Suresh V'),
            sales_executive: c.sales_executive || (i % 2 === 0 ? 'Ananya Roy' : 'Karthik Raja'),
            revenue: Number(c.contract_value || c.revenue || 250000),
            status: c.status || 'Active Customer',
            is_new: i >= res.data.length - 2,
            onboarding_date: c.created_at ? c.created_at.split('T')[0] : '2026-08-01',
            notes: c.notes || 'Enterprise Account Services',
          }))
          setCustomers(loaded)
        }
      } catch (err) {
        console.warn('Customer directory loaded with fallback store:', err)
      } finally {
        setLoading(false)
      }
    }
    loadCustomers()
  }, [])

  // Filtered customer list
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.sales_executive.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter === 'All'
        ? true
        : statusFilter === 'New'
        ? c.is_new
        : statusFilter === 'Active'
        ? c.status.includes('Active')
        : c.status.includes('Inactive')

    const matchesManager = managerFilter === 'All' || c.sales_manager === managerFilter

    return matchesSearch && matchesStatus && matchesManager
  })

  // Executive summary numbers
  const totalCustomersCount = customers.length
  const activeCustomersCount = customers.filter((c) => c.status.includes('Active')).length
  const newCustomersCount = customers.filter((c) => c.is_new).length
  const totalCustomerRevenue = customers.reduce((acc, curr) => acc + curr.revenue, 0)

  // Top Customers sorted by revenue
  const topCustomers = [...customers].sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-teal-50 text-[#004749]">
              <Building2 className="size-4.5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Customer Intelligence & Lifetime Value
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-medium max-w-3xl">
            Executive database of all corporate clients, onboarding acquisition trends, manager-wise revenue, and customer lifecycle journeys.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. All Customers */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">All Customers</span>
          <div className="mt-3">
            <p className="text-3xl font-black text-slate-900">{totalCustomersCount}</p>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Total Registered Accounts</p>
          </div>
        </div>

        {/* 2. New Customers This Quarter */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">New Customers</span>
          <div className="mt-3">
            <p className="text-3xl font-black text-[#004749]">+{newCustomersCount}</p>
            <p className="text-xs font-bold text-teal-700 mt-0.5">Onboarded in Recent Cycle</p>
          </div>
        </div>

        {/* 3. Active Accounts */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Accounts</span>
          <div className="mt-3">
            <p className="text-3xl font-black text-emerald-600">{activeCustomersCount}</p>
            <p className="text-xs font-semibold text-emerald-700 mt-0.5">
              {Math.round((activeCustomersCount / totalCustomersCount) * 100)}% Retention Rate
            </p>
          </div>
        </div>

        {/* 4. Total Realized Customer Revenue */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Customer Revenue</span>
          <div className="mt-3">
            <p className="text-3xl font-black text-slate-900">
              ₹{(totalCustomerRevenue / 100000).toFixed(1)}L
            </p>
            <p className="text-xs font-bold text-[#004749] mt-0.5">Cumulative Contract Value</p>
          </div>
        </div>
      </div>

      {/* Visual Customer Analytics: Acquisition Trend & Top Customers Leaderboard */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Customer Acquisition Trend Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Customer Acquisition Growth Trend
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Monthly new customer additions and cumulative client expansion
              </p>
            </div>
            <TrendingUp className="size-5 text-[#004749]" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ACQUISITION_TREND}>
                <defs>
                  <linearGradient id="custGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#004749" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#004749" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(val, name) => [val, name === 'newCustomers' ? 'New Additions' : 'Total Customers']}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: '12px',
                  }}
                />
                <Area type="monotone" dataKey="totalCustomers" stroke="#004749" strokeWidth={3} fillOpacity={1} fill="url(#custGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Customers Leaderboard */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Top Accounts Leaderboard
              </h3>
              <Award className="size-5 text-[#b09b72]" />
            </div>

            <div className="space-y-3">
              {topCustomers.map((cust, idx) => (
                <div
                  key={cust.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-6 place-items-center rounded-full bg-[#004749] text-[10px] font-black text-white">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="font-extrabold text-slate-900">{cust.company}</p>
                      <p className="text-[10px] text-slate-400">{cust.location}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-[#004749]">₹{cust.revenue.toLocaleString()}</span>
                    <p className="text-[10px] text-slate-400">{cust.sales_manager}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Customer Directory Table with Filters & Lifecycle Inspector */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Customer Accounts Roster
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Click any customer row to inspect their end-to-end lifecycle journey
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-xs font-semibold placeholder:text-slate-400 outline-none focus:border-[#004749]"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 outline-none"
            >
              <option value="All">All Status</option>
              <option value="Active">Active Accounts</option>
              <option value="New">New Accounts</option>
              <option value="Inactive">Inactive</option>
            </select>

            {/* Manager Filter */}
            <select
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 outline-none"
            >
              <option value="All">All Managers</option>
              <option value="Vikram Singh">Vikram Singh</option>
              <option value="Suresh V">Suresh V</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-3">Company & Contact</th>
                <th className="pb-3">Location</th>
                <th className="pb-3">Sales Hierarchy</th>
                <th className="pb-3">Contract Value</th>
                <th className="pb-3">Onboarded</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Lifecycle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredCustomers.map((cust) => (
                <tr
                  key={cust.id}
                  className="hover:bg-slate-50/80 transition cursor-pointer"
                  onClick={() => {
                    setSelectedCust(cust)
                    setShowLifecycleModal(true)
                  }}
                >
                  <td className="py-3.5">
                    <p className="font-extrabold text-slate-900">{cust.company}</p>
                    <p className="text-[11px] text-slate-500">{cust.contact} · {cust.phone}</p>
                  </td>
                  <td className="py-3.5 text-slate-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="size-3.5 text-slate-400" />
                      {cust.location}
                    </div>
                  </td>
                  <td className="py-3.5">
                    <p className="font-bold text-slate-800">{cust.sales_executive}</p>
                    <p className="text-[10px] text-slate-400">Mgr: {cust.sales_manager}</p>
                  </td>
                  <td className="py-3.5 font-black text-[#004749]">
                    ₹{cust.revenue.toLocaleString()}
                  </td>
                  <td className="py-3.5 text-slate-500 font-medium">{cust.onboarding_date}</td>
                  <td className="py-3.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                        cust.status.includes('Active')
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {cust.status}
                    </span>
                  </td>
                  <td className="py-3.5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedCust(cust)
                        setShowLifecycleModal(true)
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-black text-[#004749] hover:bg-teal-100 transition"
                    >
                      <Eye className="size-3.5" />
                      View Journey
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Lifecycle Modal */}
      {showLifecycleModal && selectedCust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#004749] bg-teal-50 px-2 py-0.5 rounded">
                  Customer Lifecycle Journey
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">{selectedCust.company}</h3>
                <p className="text-xs text-slate-500">{selectedCust.contact} · {selectedCust.location}</p>
              </div>
              <button
                onClick={() => setShowLifecycleModal(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Lifecycle Stages */}
            <div className="space-y-4">
              {/* Step 1: Lead */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="grid size-8 place-items-center rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
                    1
                  </span>
                  <div className="w-0.5 flex-1 bg-slate-200 my-1" />
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 flex-1 border border-slate-200/70">
                  <span className="text-xs font-black text-blue-700">Stage 1: Lead Ingestion & Qualification</span>
                  <p className="text-xs text-slate-600 mt-1">
                    Registered as high-priority corporate prospect. Handled by {selectedCust.sales_executive} under guidance of {selectedCust.sales_manager}.
                  </p>
                </div>
              </div>

              {/* Step 2: Visits & Field Demo */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="grid size-8 place-items-center rounded-full bg-teal-100 text-teal-700 font-bold text-xs">
                    2
                  </span>
                  <div className="w-0.5 flex-1 bg-slate-200 my-1" />
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 flex-1 border border-slate-200/70">
                  <span className="text-xs font-black text-teal-700">Stage 2: Client Demos & Spatial Visits</span>
                  <p className="text-xs text-slate-600 mt-1">
                    On-site architectural demos and requirements gathering executed at {selectedCust.location}.
                  </p>
                </div>
              </div>

              {/* Step 3: Contract Won */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="grid size-8 place-items-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs">
                    3
                  </span>
                </div>
                <div className="bg-emerald-50/60 rounded-2xl p-4 flex-1 border border-emerald-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-800">Stage 3: Contract Won & Active SLA</span>
                    <span className="font-black text-emerald-900 text-sm">₹{selectedCust.revenue.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-emerald-700 mt-1">
                    Active contract onboarded on {selectedCust.onboarding_date}. {selectedCust.notes}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowLifecycleModal(false)}
                className="rounded-xl bg-[#004749] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#013b3f]"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CeoCustomers
