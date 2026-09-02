import { useState, useEffect } from 'react'
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
  RefreshCw,
} from 'lucide-react'
import { userAPI, visitAPI } from '../../services/api.js'

const STATUS_CLASSES = {
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'On Field': 'bg-blue-50 text-blue-700 border-blue-200',
  Inactive: 'bg-slate-50 text-slate-400 border-slate-200',
}

function TeamPerformance() {
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [deptFilter, setDeptFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  const loadData = async () => {
    setLoading(true)
    try {
      const [userRes, visitRes] = await Promise.allSettled([
        userAPI.getUsers(),
        visitAPI.getVisits(),
      ])

      const userList = userRes.status === 'fulfilled' && userRes.value?.data && Array.isArray(userRes.value.data) ? userRes.value.data : []
      const visitList = visitRes.status === 'fulfilled' && visitRes.value?.data && Array.isArray(visitRes.value.data) ? visitRes.value.data : []

      const mapped = userList.map((u, idx) => {
        const uName = u.name || u.full_name || 'Sales Rep'
        const uVisits = visitList.filter(v => (v.sales_executive || v.executive_name || '').toLowerCase() === uName.toLowerCase()).length

        return {
          id: u.id || `USR-${idx + 1}`,
          name: uName,
          role: u.role || 'Sales Executive',
          dept: u.dept || u.department || 'Field Sales',
          leads: 0,
          visits: uVisits,
          target: 100,
          conversion: 0,
          status: u.status || 'Active',
        }
      })

      setTeam(mapped)
    } catch (e) {
      console.error('Error loading team performance:', e)
      setTeam([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

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
  const avgConversionRate = filteredTeam.length > 0 ? Math.round(filteredTeam.reduce((sum, m) => sum + m.conversion, 0) / filteredTeam.length) : 0
  const avgTargetCompletion = filteredTeam.length > 0 ? Math.round(filteredTeam.reduce((sum, m) => sum + m.target, 0) / filteredTeam.length) : 0

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Team Performance Analytics</h2>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            Monitor field actions, visits, and team presence directly from real user assignments.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 transition cursor-pointer"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Staff</span>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-2">{activeExecutives}</h3>
          <p className="text-xs text-slate-500 font-medium mt-1">Total registered active personnel</p>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Field Visits Logged</span>
            <Activity className="w-5 h-5 text-emerald-600" />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-2">{totalVisits}</h3>
          <p className="text-xs text-slate-500 font-medium mt-1">Verified check-in visits</p>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Quota Base</span>
            <Percent className="w-5 h-5 text-purple-600" />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-2">{avgTargetCompletion}%</h3>
          <p className="text-xs text-slate-500 font-medium mt-1">Standard baseline targets</p>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conversion Efficiency</span>
            <Award className="w-5 h-5 text-amber-600" />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-2">{avgConversionRate}%</h3>
          <p className="text-xs text-slate-500 font-medium mt-1">Organization conversion rate</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search representatives..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#832D51]"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#832D51] cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Team Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-xs font-bold text-slate-400">
              <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-[#832D51]" />
              Loading team analytics from database...
            </div>
          ) : filteredTeam.length === 0 ? (
            <div className="p-12 text-center text-xs font-bold text-slate-400">
              No team members found in database.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/70 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="px-5 py-3">Representative</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3 text-center">Field Visits</th>
                  <th className="px-5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredTeam.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{member.name}</td>
                    <td className="px-5 py-3.5 text-slate-600">{member.role}</td>
                    <td className="px-5 py-3.5 text-slate-600">{member.dept}</td>
                    <td className="px-5 py-3.5 text-center font-black">{member.visits}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_CLASSES[member.status] || STATUS_CLASSES.Active}`}>
                        {member.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default TeamPerformance
