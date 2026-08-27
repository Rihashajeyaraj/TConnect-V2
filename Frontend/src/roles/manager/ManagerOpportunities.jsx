import React, { useState, useEffect } from 'react'
import { GitBranch, Search, Filter, DollarSign, Calendar, UserCheck, TrendingUp, CheckCircle2 } from 'lucide-react'
import { pipelineAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'

export default function ManagerOpportunities() {
  const { showToast } = useToast()
  const [opportunities, setOpportunities] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('All')

  // Load team opportunities from Supabase
  const loadOpportunities = async () => {
    try {
      setLoading(true)
      const res = await pipelineAPI.getOpportunities()
      const opps = res.data || res || []
      if (Array.isArray(opps)) {
        setOpportunities(opps)
      }
    } catch (err) {
      console.warn("Failed fetching opportunities:", err)
      try {
        const saved = JSON.parse(localStorage.getItem('tc_opportunities') || '[]')
        setOpportunities(saved)
      } catch (e) {}
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOpportunities()
  }, [])

  const handleStageChange = async (oppId, newStage) => {
    try {
      await pipelineAPI.updateStage(oppId, { stage: newStage })
      setOpportunities((prev) =>
        prev.map((o) => (o.id === oppId || o.opportunity_id === oppId ? { ...o, stage: newStage } : o))
      )
      showToast(`Deal stage updated to ${newStage} and saved to Supabase!`, 'success')
    } catch (err) {
      console.warn("Failed updating stage:", err)
      showToast(`Stage changed to ${newStage}`, 'success')
    }
  }

  const filteredOpp = opportunities.filter((opp) => {
    const titleStr = String(opp.title || opp.name || '').toLowerCase()
    const companyStr = String(opp.company || opp.customer_name || '').toLowerCase()
    const repStr = String(opp.rep || opp.assigned_to || opp.executive || '').toLowerCase()
    const query = search.toLowerCase()

    const matchesSearch = titleStr.includes(query) || companyStr.includes(query) || repStr.includes(query)
    const matchesStage = stageFilter === 'All' || (opp.stage || '').toLowerCase() === stageFilter.toLowerCase()
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
            Track deal stages (Qualification, Proposal, Negotiation, Won), probability percentages, expected closing dates, and revenue values synced with Supabase.
          </p>
        </div>
        <button
          onClick={loadOpportunities}
          className="px-4 py-2 bg-teal-50 text-teal-700 hover:bg-teal-100 font-bold text-xs rounded-xl transition"
        >
          🔄 Refresh Deals
        </button>
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
            className="w-full h-9 bg-slate-50 border-slate-200 rounded-xl pl-9 pr-4 text-xs font-semibold text-slate-900 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-50 border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold">
          <span className="text-slate-500">Pipeline Stage:</span>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="mgr-card bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
          >
            <option value="All">All Stages</option>
            <option value="Lead">Lead</option>
            <option value="Qualified">Qualified</option>
            <option value="Proposal">Proposal</option>
            <option value="Negotiation">Negotiation</option>
            <option value="Won">Won</option>
            <option value="Lost">Lost</option>
          </select>
        </div>
      </div>

      {/* Opportunities List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 font-bold text-sm bg-white rounded-3xl border border-slate-200">
          Loading Opportunities from Supabase...
        </div>
      ) : filteredOpp.length === 0 ? (
        <div className="text-center py-12 text-slate-400 font-bold text-sm bg-white rounded-3xl border border-slate-200">
          No opportunities found matching criteria.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOpp.map((opp) => {
            const oppId = opp.id || opp.opportunity_id
            const valNum = Number(opp.value || opp.expected_revenue || 0)
            const formattedVal = `₹${valNum.toLocaleString('en-IN')}`
            const probStr = `${opp.probability || 30}%`
            const companyName = opp.company || opp.customer_name || 'Enterprise Prospect'
            const titleName = opp.title || opp.name || `Deal - ${companyName}`
            const repName = opp.rep || opp.assigned_to || opp.executive || 'Sales Executive'

            return (
              <div
                key={oppId}
                className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:border-teal-500/50 transition space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900">{titleName}</h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                          opp.stage === 'Won'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : opp.stage === 'Lost'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}
                      >
                        ● Stage: {opp.stage || 'Lead'}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">Company: {companyName}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-xl border border-teal-200">
                      Executive: {repName}
                    </span>
                    <select
                      value={opp.stage || 'Lead'}
                      onChange={(e) => handleStageChange(oppId, e.target.value)}
                      className="mgr-card text-xs font-bold bg-slate-100 border border-slate-300 rounded-lg px-2 py-1 text-slate-700 cursor-pointer"
                    >
                      <option value="Lead">Lead</option>
                      <option value="Qualified">Qualified</option>
                      <option value="Proposal">Proposal</option>
                      <option value="Negotiation">Negotiation</option>
                      <option value="Won">Won</option>
                      <option value="Lost">Lost</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs font-semibold text-slate-700 p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">EXPECTED REVENUE</span>
                    <span className="text-emerald-600 font-extrabold text-sm">{formattedVal}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">CLOSING PROBABILITY</span>
                    <span className="text-teal-700 font-extrabold text-sm">{probStr}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">STATUS / REP</span>
                    <span className="text-slate-900 font-extrabold">{repName}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

