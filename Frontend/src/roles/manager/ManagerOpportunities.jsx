import React, { useState } from 'react'
import { GitBranch, Search, Filter, DollarSign, Calendar, UserCheck, TrendingUp, CheckCircle2 } from 'lucide-react'

const TEAM_OPPORTUNITIES = []

export default function ManagerOpportunities() {
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('All')

  const filteredOpp = TEAM_OPPORTUNITIES.filter((opp) => {
    const matchesSearch =
      opp.name.toLowerCase().includes(search.toLowerCase()) ||
      opp.company.toLowerCase().includes(search.toLowerCase()) ||
      opp.executive.toLowerCase().includes(search.toLowerCase())
    const matchesStage = stageFilter === 'All' || opp.stage === stageFilter
    return matchesSearch && matchesStage
  })

  return (
    <div className="space-y-6 font-sans text-slate-900">
      {/* Header */}
      <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-teal-600" /> Team Sales Opportunities & Pipeline
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Track deal stages (Qualification, Proposal, Negotiation, Won), probability percentages, expected closing dates, and revenue values.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search opportunity, company, executive..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 text-xs font-semibold text-slate-900 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold">
          <span className="text-slate-500">Pipeline Stage:</span>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
          >
            <option value="All">All Stages</option>
            <option value="Proposal">Proposal</option>
            <option value="Negotiation">Negotiation</option>
            <option value="Qualification">Qualification</option>
            <option value="Won">Won</option>
            <option value="Lost">Lost</option>
          </select>
        </div>
      </div>

      {/* Opportunities List */}
      <div className="space-y-4">
        {filteredOpp.map((opp) => (
          <div
            key={opp.id}
            className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:border-teal-500/50 transition space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900">{opp.name}</h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                      opp.stage === 'Won'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-purple-50 text-purple-700 border-purple-200'
                    }`}
                  >
                    ● Stage: {opp.stage}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">Company: {opp.company}</p>
              </div>

              <span className="text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-xl border border-teal-200">
                Executive: {opp.executive}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs font-semibold text-slate-700 p-3 bg-slate-50 border border-slate-100 rounded-2xl">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">EXPECTED REVENUE</span>
                <span className="text-emerald-600 font-extrabold text-sm">{opp.expectedRevenue}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">CLOSING PROBABILITY</span>
                <span className="text-teal-700 font-extrabold text-sm">{opp.probability}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">EST. CLOSING DATE</span>
                <span className="text-slate-900 font-extrabold">{opp.closingDate}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
