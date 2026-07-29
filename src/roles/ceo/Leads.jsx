import { useState, useEffect } from 'react'
import {
  Target,
  Plus,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Mail,
  Phone,
  Calendar,
  Download,
  Upload,
  RefreshCw,
} from 'lucide-react'

// Match reference image ceo.png exactly
const kpiData = [
  { label: 'Total Leads', value: '1,520', change: '12% vs last month', up: true, icon: Target },
  { label: 'New Leads', value: '320', change: '8% vs last month', up: true, icon: Target },
  { label: 'Contacted', value: '410', change: '10% vs last month', up: true, icon: Target },
  { label: 'Qualified', value: '280', change: '6% vs last month', up: true, icon: Target },
  { label: 'Won', value: '180', change: '15% vs last month', up: true, icon: Target },
  { label: 'Lost', value: '330', change: '4% vs last month', up: false, icon: Target },
]

const initialLeads = [
  { id: '1', name: 'ABC Industries', company: 'ABC Pvt Ltd', status: 'New', source: 'Website', assigned: 'John Doe', phone: '+91 98765 43210', date: '28 Apr 2026', color: 'bg-blue-500' },
  { id: '2', name: 'Tech Solutions', company: 'Tech Solutions', status: 'Contacted', source: 'Referral', assigned: 'Mary Jane', phone: '+91 87654 32109', date: '28 Apr 2026', color: 'bg-emerald-500' },
  { id: '3', name: 'Global Corp', company: 'Global Corp', status: 'Qualified', source: 'Cold Call', assigned: 'Robert Smith', phone: '+91 76543 21098', date: '27 Apr 2026', color: 'bg-purple-500' },
  { id: '4', name: 'Prime Systems', company: 'Prime Systems', status: 'Proposal', source: 'Walk-In', assigned: 'David Brown', phone: '+91 65432 10987', date: '27 Apr 2026', color: 'bg-orange-500' },
  { id: '5', name: 'Next Gen Tech', company: 'Next Gen Tech', status: 'Negotiation', source: 'Referral', assigned: 'Mary Jane', phone: '+91 54321 09876', date: '26 Apr 2026', color: 'bg-indigo-500' },
  { id: '6', name: 'Bright Infotech', company: 'Bright Infotech', status: 'Won', source: 'Website', assigned: 'John Doe', phone: '+91 43210 98765', date: '26 Apr 2026', color: 'bg-pink-500' },
  { id: '7', name: 'Omega Pvt Ltd', company: 'Omega Pvt Ltd', status: 'Lost', source: 'Advertisement', assigned: 'Robert Smith', phone: '+91 32109 87654', date: '25 Apr 2026', color: 'bg-red-500' },
  { id: '8', name: 'Vertex Systems', company: 'Vertex Systems', status: 'Qualified', source: 'Cold Call', assigned: 'David Brown', phone: '+91 21098 76543', date: '25 Apr 2026', color: 'bg-cyan-500' },
  { id: '9', name: 'InnoTech', company: 'InnoTech Pvt Ltd', status: 'New', source: 'Instagram', assigned: 'Mary Jane', phone: '+91 10987 65432', date: '24 Apr 2026', color: 'bg-teal-500' },
  { id: '10', name: 'Delta Softwares', company: 'Delta Softwares', status: 'Contacted', source: 'Facebook', assigned: 'John Doe', phone: '+91 09876 54321', date: '24 Apr 2026', color: 'bg-amber-500' },
]

const STATUS_CLASSES = {
  New: 'bg-blue-50 text-blue-700 border-blue-200',
  Contacted: 'bg-orange-50 text-orange-700 border-orange-200',
  Qualified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Proposal: 'bg-purple-50 text-purple-700 border-purple-200',
  Negotiation: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Won: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  Lost: 'bg-rose-50 text-rose-700 border-rose-200',
}

function Leads() {
  const [leads, setLeads] = useState(() => {
    const saved = localStorage.getItem('tc_leads')
    if (saved) return JSON.parse(saved)
    localStorage.setItem('tc_leads', JSON.stringify(initialLeads))
    return initialLeads
  })

  // Listen for global state updates (from Quick Action modal)
  useEffect(() => {
    const handleUpdate = () => {
      const saved = localStorage.getItem('tc_leads')
      if (saved) setLeads(JSON.parse(saved))
    }
    window.addEventListener('tc_state_update', handleUpdate)
    return () => window.removeEventListener('tc_state_update', handleUpdate)
  }, [])

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [sourceFilter, setSourceFilter] = useState('All')
  const [assignedFilter, setAssignedFilter] = useState('All')

  // Filter lists
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          lead.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          lead.phone.includes(searchQuery)
    const matchesStatus = statusFilter === 'All' || lead.status === statusFilter
    const matchesSource = sourceFilter === 'All' || lead.source === sourceFilter
    const matchesAssigned = assignedFilter === 'All' || lead.assigned === assignedFilter
    return matchesSearch && matchesStatus && matchesSource && matchesAssigned
  })

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Leads</h2>
          <p className="mt-1 text-xs font-semibold text-slate-400">Home &gt; Leads</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
            <Upload className="size-4 text-slate-550" />
            Import Leads
          </button>
          <button className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
            <Download className="size-4 text-slate-550" />
            Export
          </button>
          <button className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#A8C2FF] to-[#3B82F6] px-5 py-2.5 text-sm font-semibold text-blue-950 shadow-md shadow-blue-500/25 border border-white/20 hover:from-[#95B6FF] hover:to-[#2563EB] hover:shadow-lg hover:shadow-blue-500/35 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
            <Plus className="size-4" />
            Add Lead
          </button>
        </div>
      </div>

      {/* KPI Cards exactly matching ceo.png */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-6">
        {kpiData.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-500/30 transition">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-2">{kpi.value}</p>
            <span className={`flex items-center gap-0.5 text-[0.65rem] font-bold mt-1 ${kpi.up ? 'text-emerald-600' : 'text-rose-600'}`}>
              {kpi.up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {kpi.change}
            </span>
          </div>
        ))}
      </div>

      {/* Filter and search controls matching image */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, company, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-600 outline-none focus:border-blue-500"
          >
            <option value="All">All Status</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Qualified">Qualified</option>
            <option value="Proposal">Proposal</option>
            <option value="Negotiation">Negotiation</option>
            <option value="Won">Won</option>
            <option value="Lost">Lost</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-600 outline-none focus:border-blue-500"
          >
            <option value="All">All Source</option>
            <option value="Website">Website</option>
            <option value="Referral">Referral</option>
            <option value="Cold Call">Cold Call</option>
            <option value="Walk-In">Walk-In</option>
            <option value="Instagram">Instagram</option>
            <option value="Facebook">Facebook</option>
            <option value="Advertisement">Advertisement</option>
          </select>

          <select
            value={assignedFilter}
            onChange={(e) => setAssignedFilter(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-600 outline-none focus:border-blue-500"
          >
            <option value="All">All Assigned To</option>
            <option value="John Doe">John Doe</option>
            <option value="Mary Jane">Mary Jane</option>
            <option value="Robert Smith">Robert Smith</option>
            <option value="David Brown">David Brown</option>
          </select>

          <button className="flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition active:scale-[0.98]">
            More Filters
          </button>
          
          <button className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition active:scale-[0.98]">
            <RefreshCw className="size-4" />
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="w-12 px-6 py-4">
                  <input type="checkbox" className="rounded border-slate-300" />
                </th>
                <th className="px-6 py-4">Lead Name</th>
                <th className="px-6 py-4">Company</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Source</th>
                <th className="px-6 py-4">Assigned To</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Created On</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.map((lead) => {
                const initials = lead.name.split(' ').map((n) => n[0]).join('').substring(0, 2)
                return (
                  <tr key={lead.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4">
                      <input type="checkbox" className="rounded border-slate-300" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className={`grid size-8 place-items-center rounded-full text-[10px] font-extrabold text-white ${lead.color}`}>
                          {initials}
                        </span>
                        <span className="font-bold text-slate-900">{lead.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{lead.company}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-bold ${STATUS_CLASSES[lead.status]}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700">
                        {lead.source}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="grid size-6 place-items-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                          {lead.assigned.split(' ').map((n) => n[0]).join('')}
                        </span>
                        <span className="font-semibold text-slate-800">{lead.assigned}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{lead.phone}</td>
                    <td className="px-6 py-4 font-semibold text-slate-500">{lead.date}</td>
                    <td className="px-6 py-4 text-center">
                      <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <MoreVertical className="size-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination at the bottom */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4 text-xs font-bold text-slate-500">
          <span>Showing 1 to {filteredLeads.length} of 1,520 entries</span>
          <div className="flex items-center gap-1">
            <button className="rounded border border-slate-200 bg-white px-2 py-1 hover:bg-slate-50">&lt;&lt;</button>
            <button className="rounded-full bg-gradient-to-r from-[#A8C2FF] to-[#3B82F6] px-3.5 py-1 text-blue-950 font-extrabold shadow-md shadow-blue-500/20 border border-white/25">1</button>
            <button className="rounded border border-slate-200 bg-white px-3 py-1 hover:bg-slate-50">2</button>
            <button className="rounded border border-slate-200 bg-white px-3 py-1 hover:bg-slate-50">3</button>
            <span className="px-1 text-slate-400">...</span>
            <button className="rounded border border-slate-200 bg-white px-3 py-1 hover:bg-slate-50">152</button>
            <button className="rounded border border-slate-200 bg-white px-2 py-1 hover:bg-slate-50">&gt;&gt;</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Leads
