import { useState } from 'react'
import {
  Users,
  Search,
  Filter,
  ArrowUpRight,
  TrendingUp,
  Percent,
  CheckCircle,
  MoreVertical,
  Activity,
  Award,
} from 'lucide-react'

const initialTeam = [
  { id: '1', name: 'John Doe', role: 'Sales Executive', dept: 'Field Sales', leads: 42, visits: 28, target: 92, conversion: 14, status: 'On Field' },
  { id: '2', name: 'Mary Jane', role: 'Sales Executive', dept: 'Inside Sales', leads: 56, visits: 12, target: 110, conversion: 18, status: 'Active' },
  { id: '3', name: 'Robert Smith', role: 'Sales Specialist', dept: 'Enterprise Sales', leads: 24, visits: 15, target: 85, conversion: 22, status: 'Active' },
  { id: '4', name: 'David Brown', role: 'Sales Executive', dept: 'Field Sales', leads: 38, visits: 32, target: 98, conversion: 12, status: 'On Field' },
  { id: '5', name: 'Karthik R', role: 'Sales Executive', dept: 'Field Sales', leads: 40, visits: 24, target: 102, conversion: 15, status: 'On Field' },
  { id: '6', name: 'Priya S', role: 'Sales Executive', dept: 'Inside Sales', leads: 48, visits: 8, target: 90, conversion: 10, status: 'Active' },
  { id: '7', name: 'Vikram Singh', role: 'Sales Executive', dept: 'Field Sales', leads: 35, visits: 20, target: 95, conversion: 11, status: 'Inactive' },
]

const STATUS_CLASSES = {
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'On Field': 'bg-blue-50 text-blue-700 border-blue-200',
  Inactive: 'bg-slate-50 text-slate-400 border-slate-200',
}

function TeamPerformance() {
  const [team, setTeam] = useState(initialTeam)
  const [searchQuery, setSearchQuery] = useState('')
  const [deptFilter, setDeptFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  // Filters
  const filteredTeam = team.filter((member) => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          member.role.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDept = deptFilter === 'All' || member.dept === deptFilter
    const matchesStatus = statusFilter === 'All' || member.status === statusFilter
    return matchesSearch && matchesDept && matchesStatus
  })

  // Summary Metrics
  const activeExecutives = team.filter(m => m.status !== 'Inactive').length
  const totalVisits = filteredTeam.reduce((sum, m) => sum + m.visits, 0)
  const avgConversionRate = Math.round(filteredTeam.reduce((sum, m) => sum + m.conversion, 0) / filteredTeam.length) || 0
  const avgTargetCompletion = Math.round(filteredTeam.reduce((sum, m) => sum + m.target, 0) / filteredTeam.length) || 0

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Team Performance Analytics</h2>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            Monitor target achievements, conversion rates, and field actions for sales representatives.
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-3.5 py-1.5 text-xs font-bold text-blue-700">
          <Activity className="size-4" />
          {activeExecutives} Active Reps Today
        </div>
      </div>

      {/* Summary Analytics Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="grid size-12 place-items-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <Users className="size-6" />
          </span>
          <div>
            <p className="text-2xl font-extrabold text-slate-900">{totalVisits}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Client Visits Completed</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="grid size-12 place-items-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Percent className="size-6" />
          </span>
          <div>
            <p className="text-2xl font-extrabold text-slate-900">{avgConversionRate}%</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Conversion Rate</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="grid size-12 place-items-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <Award className="size-6" />
          </span>
          <div>
            <p className="text-2xl font-extrabold text-slate-900">{avgTargetCompletion}%</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Achievement Average</p>
          </div>
        </div>
      </div>

      {/* Filtering and Controls Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search representatives by name, role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Dept:</span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="All">All Departments</option>
              <option value="Field Sales">Field Sales</option>
              <option value="Inside Sales">Inside Sales</option>
              <option value="Enterprise Sales">Enterprise Sales</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="On Field">On Field</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Representative Name</th>
                <th className="px-6 py-4">Role & Department</th>
                <th className="px-6 py-4 text-center">Active Leads</th>
                <th className="px-6 py-4 text-center">Client Visits</th>
                <th className="px-6 py-4">Target Achievement</th>
                <th className="px-6 py-4 text-center">Conversion</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTeam.map((member) => {
                const initials = member.name.split(' ').map(n => n[0]).join('')
                return (
                  <tr key={member.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 place-items-center rounded-full bg-blue-50 text-xs font-bold text-blue-600 border border-blue-100">
                          {initials}
                        </span>
                        <div>
                          <p className="m-0 font-bold text-slate-900 leading-none">{member.name}</p>
                          <p className="m-0 mt-1 text-[0.65rem] font-semibold text-slate-400">ID: #TC-00{member.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="m-0 font-semibold text-slate-700 leading-none">{member.role}</p>
                        <p className="m-0 mt-1 text-[0.65rem] font-bold text-slate-400 uppercase">{member.dept}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-900">
                      {member.leads}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-900">
                      {member.visits}
                    </td>
                    <td className="px-6 py-4 min-w-[150px]">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden max-w-[100px]">
                          <div
                            className={`h-full rounded-full ${
                              member.target >= 100 ? 'bg-emerald-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(member.target, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-800">{member.target}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-blue-600">
                      {member.conversion}%
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-bold ${STATUS_CLASSES[member.status]}`}>
                        {member.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <MoreVertical className="size-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filteredTeam.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-400 font-semibold">
                    No representatives found matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default TeamPerformance
