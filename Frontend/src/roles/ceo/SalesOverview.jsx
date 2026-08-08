import React, { useState, useEffect } from 'react'
import { useToast } from '../../common/ToastContext.jsx'
import {
  TrendingUp,
  Target,
  Users,
  Briefcase,
  Search,
  Filter,
  DollarSign,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ChevronRight,
  Plus,
  RefreshCw,
  Layers,
  Kanban,
  ListFilter,
  SlidersHorizontal,
} from 'lucide-react'
import { crmAPI, pipelineAPI, reportAPI } from '../../services/api.js'

const DEFAULT_OPPORTUNITIES = [
  { id: '1', company: 'Apex Technologies', contact: 'Rajesh Kumar', rep: 'Ananya Roy', manager: 'Vikram Singh', value: 450000, stage: 'Won', probability: 100, date: '2026-08-05' },
  { id: '2', company: 'Global Corp Solutions', contact: 'Sarah Smith', rep: 'Karthik Raja', manager: 'Suresh V', value: 250000, stage: 'Won', probability: 100, date: '2026-08-04' },
  { id: '3', company: 'Star Tech Solutions', contact: 'Deepa Roy', rep: 'Ananya Roy', manager: 'Vikram Singh', value: 600000, stage: 'Proposal', probability: 60, date: '2026-08-20' },
  { id: '4', company: 'Techno Systems', contact: 'Rohan Joshi', rep: 'Robert Smith', manager: 'Vikram Singh', value: 120000, stage: 'Negotiation', probability: 75, date: '2026-08-15' },
  { id: '5', company: 'Zenith Logistics Hub', contact: 'Alice Lee', rep: 'Mary Jane', manager: 'Suresh V', value: 350000, stage: 'Qualified', probability: 50, date: '2026-08-22' },
  { id: '6', company: 'InnoTech Solutions', contact: 'Vikas Gupta', rep: 'Karthik Raja', manager: 'Suresh V', value: 280000, stage: 'Lead', probability: 30, date: '2026-08-25' },
  { id: '7', company: 'Prime Industrial Corp', contact: 'Manoj Pillai', rep: 'Robert Smith', manager: 'Vikram Singh', value: 180000, stage: 'Lost', probability: 0, date: '2026-08-01' },
]

const STAGES = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost']

const STAGE_CONFIG = {
  Lead: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', bar: '#3b82f6' },
  Qualified: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', bar: '#0d9488' },
  Proposal: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', bar: '#9333ea' },
  Negotiation: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', bar: '#d97706' },
  Won: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', bar: '#10b981' },
  Lost: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', bar: '#f43f5e' },
}

function SalesOverview({ initialSection }) {
  const { showToast } = useToast()
  const [opportunities, setOpportunities] = useState(() => {
    try {
      const saved = localStorage.getItem('tc_opportunities')
      return saved ? JSON.parse(saved) : DEFAULT_OPPORTUNITIES
    } catch {
      return DEFAULT_OPPORTUNITIES
    }
  })

  const [viewMode, setViewMode] = useState('kanban') // 'kanban' | 'table'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStage, setSelectedStage] = useState('All')
  const [selectedManager, setSelectedManager] = useState('All')

  // Calculated Executive Sales KPIs
  const totalLeads = 142
  const qualifiedLeads = 86
  const activeOpportunities = opportunities.filter((o) => o.stage !== 'Won' && o.stage !== 'Lost').length
  const wonDeals = opportunities.filter((o) => o.stage === 'Won').length
  const lostDeals = opportunities.filter((o) => o.stage === 'Lost').length
  const totalPipelineValue = opportunities
    .filter((o) => o.stage !== 'Lost')
    .reduce((acc, curr) => acc + (Number(curr.value) || 0), 0)
  const wonRevenue = opportunities
    .filter((o) => o.stage === 'Won')
    .reduce((acc, curr) => acc + (Number(curr.value) || 0), 0)
  const conversionRate = Math.round((wonDeals / (wonDeals + lostDeals || 1)) * 100)

  // Manager-wise Performance Summary
  const managerStats = [
    {
      name: 'Vikram Singh',
      region: 'South Region',
      assignedLeads: 82,
      qualified: 52,
      wonDeals: 14,
      lostDeals: 2,
      totalRevenue: 1650000,
      pipeline: 2450000,
      winRate: 87.5,
    },
    {
      name: 'Suresh V',
      region: 'Tech & Western Region',
      assignedLeads: 60,
      qualified: 34,
      wonDeals: 10,
      lostDeals: 3,
      totalRevenue: 1190000,
      pipeline: 1800000,
      winRate: 76.9,
    },
  ]

  // Executive-wise Performance Summary
  const executiveStats = [
    {
      name: 'Ananya Roy',
      manager: 'Vikram Singh',
      leads: 44,
      visits: 28,
      wonDeals: 8,
      revenue: 940000,
      pipeline: 1350000,
      winRate: 88.9,
    },
    {
      name: 'Karthik Raja',
      manager: 'Suresh V',
      leads: 36,
      visits: 22,
      wonDeals: 6,
      revenue: 710000,
      pipeline: 980000,
      winRate: 75.0,
    },
    {
      name: 'Robert Smith',
      manager: 'Vikram Singh',
      leads: 38,
      visits: 20,
      wonDeals: 6,
      revenue: 710000,
      pipeline: 1100000,
      winRate: 85.7,
    },
    {
      name: 'Mary Jane',
      manager: 'Suresh V',
      leads: 24,
      visits: 18,
      wonDeals: 4,
      revenue: 480000,
      pipeline: 820000,
      winRate: 80.0,
    },
  ]

  // Filtered Opportunities
  const filteredOpps = opportunities.filter((opp) => {
    const matchesSearch =
      (opp.company || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (opp.rep || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (opp.manager || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStage = selectedStage === 'All' || opp.stage === selectedStage
    const matchesManager = selectedManager === 'All' || opp.manager === selectedManager
    return matchesSearch && matchesStage && matchesManager
  })

  // Handle stage change
  const handleStageChange = (id, newStage) => {
    const updated = opportunities.map((opp) => {
      if (opp.id === id) {
        return {
          ...opp,
          stage: newStage,
          probability: newStage === 'Won' ? 100 : newStage === 'Lost' ? 0 : opp.probability,
        }
      }
      return opp
    })
    setOpportunities(updated)
    localStorage.setItem('tc_opportunities', JSON.stringify(updated))
    showToast(`Deal moved to stage: ${newStage}`, 'success')
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-teal-50 text-[#004749]">
              <TrendingUp className="size-4.5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Executive Sales Overview & Pipeline
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-medium max-w-3xl">
            Strategic tracking of organizational leads, pipeline opportunities, conversion stages, and manager/executive performance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                viewMode === 'kanban' ? 'bg-[#004749] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="size-3.5" />
              Pipeline Kanban
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                viewMode === 'table' ? 'bg-[#004749] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListFilter className="size-3.5" />
              Detailed Deals
            </button>
          </div>
        </div>
      </div>

      {/* Primary Sales KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Total Leads & Qualified */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Leads & Qualification</span>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <p className="text-2xl font-black text-slate-900">{totalLeads}</p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">Ingested Leads</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-extrabold text-[#004749]">{qualifiedLeads}</p>
              <p className="text-xs font-bold text-teal-700 mt-0.5">Qualified (60.5%)</p>
            </div>
          </div>
        </div>

        {/* 2. Active Opportunities */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Opportunities</span>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900">{activeOpportunities} Active Deals</p>
            <p className="text-xs font-bold text-amber-600 mt-0.5">
              In Proposal & Negotiation Stages
            </p>
          </div>
        </div>

        {/* 3. Won vs Lost Deals */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Deals Won & Closed</span>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <p className="text-2xl font-black text-emerald-600">{wonDeals} Won</p>
              <p className="text-xs font-bold text-emerald-700 mt-0.5">₹{wonRevenue.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-extrabold text-rose-600">{lostDeals} Lost</p>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">Drop-offs</p>
            </div>
          </div>
        </div>

        {/* 4. Total Pipeline Value & Conversion Rate */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pipeline Value & Win Rate</span>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900">
              ₹{(totalPipelineValue / 100000).toFixed(1)} Lakhs
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex rounded bg-emerald-50 px-2 py-0.5 text-xs font-black text-emerald-700 border border-emerald-200">
                {conversionRate}% Win Rate
              </span>
              <span className="text-xs text-slate-400 font-medium">overall closed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search deals, companies, reps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-xs font-semibold placeholder:text-slate-400 outline-none focus:border-[#004749]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {/* Stage Filter */}
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 outline-none"
          >
            <option value="All">All Stages</option>
            {STAGES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          {/* Manager Filter */}
          <select
            value={selectedManager}
            onChange={(e) => setSelectedManager(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 outline-none"
          >
            <option value="All">All Managers</option>
            <option value="Vikram Singh">Vikram Singh</option>
            <option value="Suresh V">Suresh V</option>
          </select>
        </div>
      </div>

      {/* Main View: Kanban Board or Table */}
      {viewMode === 'kanban' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6 overflow-x-auto pb-2">
          {STAGES.map((stage) => {
            const stageOpps = filteredOpps.filter((o) => o.stage === stage)
            const stageTotal = stageOpps.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0)
            const conf = STAGE_CONFIG[stage]

            return (
              <div
                key={stage}
                className="flex flex-col rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3 min-w-[240px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ backgroundColor: conf.bar }} />
                    <span className="text-xs font-black text-slate-900">{stage}</span>
                  </div>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-slate-600 border border-slate-200">
                    {stageOpps.length}
                  </span>
                </div>

                <div className="text-[11px] font-bold text-slate-500 mb-2 px-1">
                  Vol: ₹{stageTotal.toLocaleString()}
                </div>

                {/* Cards List */}
                <div className="flex-1 space-y-2.5">
                  {stageOpps.map((opp) => (
                    <div
                      key={opp.id}
                      className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition hover:shadow-md space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="text-xs font-black text-slate-900 leading-snug">{opp.company}</h4>
                      </div>

                      <div className="flex items-baseline justify-between text-xs">
                        <span className="font-extrabold text-[#004749]">
                          ₹{Number(opp.value).toLocaleString()}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {opp.probability}% Prob
                        </span>
                      </div>

                      <div className="border-t border-slate-100 pt-2 text-[10px] space-y-1">
                        <div className="flex justify-between text-slate-500 font-medium">
                          <span>Rep: {opp.rep}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Mgr: {opp.manager}</span>
                        </div>
                      </div>

                      {/* Quick Move Dropdown */}
                      <div className="pt-1 flex justify-end">
                        <select
                          value={opp.stage}
                          onChange={(e) => handleStageChange(opp.id, e.target.value)}
                          className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700 outline-none"
                        >
                          {STAGES.map((s) => (
                            <option key={s} value={s}>
                              Move to {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}

                  {stageOpps.length === 0 && (
                    <div className="py-8 text-center text-[11px] text-slate-400 font-medium">
                      No deals in {stage}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-3">Company / Client</th>
                <th className="pb-3">Deal Value</th>
                <th className="pb-3">Stage</th>
                <th className="pb-3">Assigned Rep</th>
                <th className="pb-3">Sales Manager</th>
                <th className="pb-3">Est. Close Date</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredOpps.map((opp) => {
                const conf = STAGE_CONFIG[opp.stage] || STAGE_CONFIG.Lead
                return (
                  <tr key={opp.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 font-extrabold text-slate-900">{opp.company}</td>
                    <td className="py-3 font-black text-[#004749]">₹{Number(opp.value).toLocaleString()}</td>
                    <td className="py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black ${conf.bg} ${conf.text} border ${conf.border}`}>
                        {opp.stage}
                      </span>
                    </td>
                    <td className="py-3 text-slate-700">{opp.rep}</td>
                    <td className="py-3 text-slate-500">{opp.manager}</td>
                    <td className="py-3 text-slate-400">{opp.date || 'Aug 2026'}</td>
                    <td className="py-3 text-right">
                      <select
                        value={opp.stage}
                        onChange={(e) => handleStageChange(opp.id, e.target.value)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-700 outline-none"
                      >
                        {STAGES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Performance Section: Manager-wise & Executive-wise Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Manager-wise Performance */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Manager-wise Sales Performance
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Team assigned leads, won revenue, and win rates
              </p>
            </div>
            <Award className="size-5 text-[#004749]" />
          </div>

          <div className="space-y-4">
            {managerStats.map((mgr, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{mgr.name}</h4>
                    <span className="text-xs text-slate-500">{mgr.region}</span>
                  </div>
                  <span className="rounded-md bg-teal-50 px-2.5 py-1 text-xs font-black text-[#004749]">
                    {mgr.winRate}% Win Rate
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2 border-t border-slate-200/60 pt-2.5 text-center text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Leads</span>
                    <p className="font-extrabold text-slate-900 mt-0.5">{mgr.assignedLeads}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Won</span>
                    <p className="font-extrabold text-emerald-600 mt-0.5">{mgr.wonDeals}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Revenue</span>
                    <p className="font-extrabold text-slate-900 mt-0.5">₹{(mgr.totalRevenue / 100000).toFixed(1)}L</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Pipeline</span>
                    <p className="font-extrabold text-[#004749] mt-0.5">₹{(mgr.pipeline / 100000).toFixed(1)}L</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Executive-wise Performance */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Executive-wise Sales Breakdown
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Field visits, deals converted, and revenue contribution
              </p>
            </div>
            <Users className="size-5 text-[#b09b72]" />
          </div>

          <div className="space-y-3">
            {executiveStats.map((exec, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 text-xs">
                <div>
                  <p className="font-extrabold text-slate-900">{exec.name}</p>
                  <p className="text-[10px] text-slate-500 font-medium">Mgr: {exec.manager} · {exec.visits} Visits</p>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="font-black text-slate-900">₹{(exec.revenue / 100000).toFixed(1)}L Won</span>
                    <p className="text-[10px] text-slate-400">{exec.wonDeals} Closed Deals</p>
                  </div>
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-black text-emerald-700 border border-emerald-200">
                    {exec.winRate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SalesOverview
