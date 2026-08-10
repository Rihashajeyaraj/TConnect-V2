import { useState, useEffect } from 'react'
import { useToast } from '../../common/ToastContext.jsx'
import { pipelineAPI } from '../../services/api.js'
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  Percent,
  X,
  PlusCircle,
  MoveRight,
  Trash2,
} from 'lucide-react'

// Initial mock opportunities
const initialOpportunities = [
  { id: '1', company: 'ABC Pvt Ltd', rep: 'John Doe', value: 45000, stage: 'Lead', probability: 30, age: 5 },
  { id: '2', company: 'Tech Solutions', rep: 'Mary Jane', value: 85000, stage: 'Qualified', probability: 50, age: 12 },
  { id: '3', company: 'Global Corp', rep: 'Robert Smith', value: 250000, stage: 'Negotiation', probability: 80, age: 24 },
  { id: '4', company: 'Prime Systems', rep: 'David Brown', value: 65000, stage: 'Proposal', probability: 60, age: 10 },
  { id: '5', company: 'Next Gen Tech', rep: 'Mary Jane', value: 120000, stage: 'Negotiation', probability: 75, age: 18 },
  { id: '6', company: 'Vertex Systems', rep: 'David Brown', value: 95000, stage: 'Won', probability: 100, age: 30 },
  { id: '7', company: 'InnoTech Pvt Ltd', rep: 'Robert Smith', value: 50000, stage: 'Proposal', probability: 40, age: 8 },
  { id: '8', company: 'Delta Softwares', rep: 'John Doe', value: 35000, stage: 'Lost', probability: 0, age: 15 },
]

const STAGES = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost']

const STAGE_COLORS = {
  Lead: 'border-blue-200 bg-blue-50 text-blue-700',
  Qualified: 'border-amber-200 bg-amber-50 text-amber-700',
  Proposal: 'border-purple-200 bg-purple-50 text-purple-700',
  Negotiation: 'border-pink-200 bg-pink-50 text-pink-700',
  Won: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Lost: 'border-rose-200 bg-rose-50 text-rose-700',
}

function SalesPipeline() {
  const { showToast } = useToast()
  const [opportunities, setOpportunities] = useState(() => {
    const saved = localStorage.getItem('tc_opportunities')
    if (saved) return JSON.parse(saved)
    localStorage.setItem('tc_opportunities', JSON.stringify(initialOpportunities))
    return initialOpportunities
  })

  // Fetch opportunities from Supabase on mount
  useEffect(() => {
    pipelineAPI.getOpportunities().then((res) => {
      const opps = res.data || res || []
      if (Array.isArray(opps) && opps.length > 0) {
        setOpportunities(opps)
        localStorage.setItem('tc_opportunities', JSON.stringify(opps))
      }
    }).catch((err) => {
      console.warn("Pipeline API fetch notice:", err)
    })
  }, [])

  // Listen for global state updates (from Quick Action modal)
  useEffect(() => {
    const handleUpdate = () => {
      const saved = localStorage.getItem('tc_opportunities')
      if (saved) setOpportunities(JSON.parse(saved))
    }
    window.addEventListener('tc_state_update', handleUpdate)
    return () => window.removeEventListener('tc_state_update', handleUpdate)
  }, [])

  // Sync state changes back to localStorage
  const updateOpps = (newOpps) => {
    setOpportunities(newOpps)
    localStorage.setItem('tc_opportunities', JSON.stringify(newOpps))
  }

  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  
  // New Opportunity Form State
  const [newCompany, setNewCompany] = useState('')
  const [newRep, setNewRep] = useState('John Doe')
  const [newValue, setNewValue] = useState('')
  const [newStage, setNewStage] = useState('Lead')
  const [newProb, setNewProb] = useState(30)

  // Drag and Drop State
  const [draggingId, setDraggingId] = useState(null)

  function handleDragStart(e, id) {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e) {
    e.preventDefault()
  }

  function handleDrop(e, stage) {
    e.preventDefault()
    if (!draggingId) return

    const targetOpp = opportunities.find(o => o.id === draggingId || o.opportunity_id === draggingId)
    if (targetOpp) {
      showToast(`Deal "${targetOpp.company}" moved to "${stage}".`, 'success')
    }

    let calculatedProb = targetOpp?.probability || 30
    if (stage === 'Won') calculatedProb = 100
    else if (stage === 'Lost') calculatedProb = 0
    else if (stage === 'Lead') calculatedProb = 30
    else if (stage === 'Qualified') calculatedProb = 50
    else if (stage === 'Proposal') calculatedProb = 60
    else if (stage === 'Negotiation') calculatedProb = 85

    updateOpps(
      opportunities.map((opp) => {
        if (opp.id === draggingId || opp.opportunity_id === draggingId) {
          return { ...opp, stage, probability: calculatedProb }
        }
        return opp
      })
    )

    // Persist stage update in Supabase
    pipelineAPI.updateStage(draggingId, { stage, probability: calculatedProb }).catch((err) => {
      console.warn("Failed updating stage in Supabase:", err)
    })

    setDraggingId(null)
  }

  function handleAddOpportunity(e) {
    e.preventDefault()
    if (!newCompany || !newValue) {
      showToast('Please enter a valid company and deal value.', 'error')
      return
    }

    const tempId = Date.now().toString()
    const numericVal = parseFloat(newValue) || 0
    const probVal = parseInt(newProb) || 30

    const newOpp = {
      id: tempId,
      opportunity_id: tempId,
      company: newCompany,
      customer_name: newCompany,
      title: `Opportunity - ${newCompany}`,
      rep: newRep,
      assigned_to: newRep,
      value: numericVal,
      expected_revenue: numericVal,
      stage: newStage,
      probability: probVal,
      age: 1,
    }

    updateOpps([newOpp, ...opportunities])
    
    // Reset Form
    setNewCompany('')
    setNewValue('')
    setNewStage('Lead')
    setNewProb(30)
    setModalOpen(false)
    showToast(`Opportunity for "${newCompany}" created and saving to Supabase!`, 'success')

    // Persist to Supabase
    pipelineAPI.createOpportunity({
      id: tempId,
      title: `Opportunity - ${newCompany}`,
      company: newCompany,
      customer_name: newCompany,
      rep: newRep,
      assigned_to: newRep,
      value: numericVal,
      expected_revenue: numericVal,
      stage: newStage,
      probability: probVal,
    }).then((res) => {
      const saved = res.data || res
      if (saved && (saved.id || saved.opportunity_id)) {
        const realId = saved.id || saved.opportunity_id
        updateOpps([saved, ...opportunities.filter(o => o.id !== tempId)])
      }
    }).catch((err) => {
      console.warn("Failed persisting opportunity to Supabase:", err)
    })
  }

  function handleDelete(id) {

    const targetOpp = opportunities.find(o => o.id === id)
    if (targetOpp) {
      showToast(`Deal "${targetOpp.company}" has been removed.`, 'warning')
    }
    updateOpps(opportunities.filter((opp) => opp.id !== id))
  }

  // Filtered Opportunities
  const filteredOpps = opportunities.filter(
    (opp) =>
      opp.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.rep.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Calculations
  const totalPipelineValue = filteredOpps.reduce((sum, opp) => sum + (opp.stage !== 'Lost' ? opp.value : 0), 0)
  const wonOpportunities = filteredOpps.filter((opp) => opp.stage === 'Won')
  const totalClosed = filteredOpps.filter((opp) => opp.stage === 'Won' || opp.stage === 'Lost').length
  const winRatio = totalClosed > 0 ? Math.round((wonOpportunities.length / totalClosed) * 100) : 75
  const avgDealSize = filteredOpps.length > 0 ? Math.round(totalPipelineValue / filteredOpps.filter(opp => opp.stage !== 'Lost').length) : 0

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Top Banner and Summary Stats */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Sales Pipeline</h2>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            Monitor deals across various stages and drag cards to update status.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#A8C2FF] to-[#3B82F6] px-5 py-2.5 text-sm font-bold text-black border border-[#2563EB]/40 shadow-[0_8px_20px_-3px_rgba(59,130,246,0.3),inset_0_1.5px_0_rgba(255,255,255,0.45)] hover:from-[#95B6FF] hover:to-[#2563EB] hover:shadow-[0_12px_24px_-3px_rgba(59,130,246,0.4),inset_0_1.5px_0_rgba(255,255,255,0.5)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] self-start md:self-center"
        >
          <Plus className="size-4" />
          Add Opportunity
        </button>
      </div>

      {/* Summary KPI Panel */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="grid size-12 place-items-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <DollarSign className="size-6" />
          </span>
          <div>
            <p className="text-2xl font-extrabold text-slate-900">₹{totalPipelineValue.toLocaleString()}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Pipeline Value</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="grid size-12 place-items-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Percent className="size-6" />
          </span>
          <div>
            <p className="text-2xl font-extrabold text-slate-900">{winRatio}%</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Win Ratio</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="grid size-12 place-items-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <TrendingUp className="size-6" />
          </span>
          <div>
            <p className="text-2xl font-extrabold text-slate-900">₹{avgDealSize.toLocaleString()}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Deal Size</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex items-center gap-4 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search deals by company name or representative..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Kanban Board columns wrapper */}
      <div className="grid gap-4 overflow-x-auto pb-4 md:grid-cols-6 min-w-[900px] lg:min-w-0">
        {STAGES.map((stage) => {
          const stageOpps = filteredOpps.filter((opp) => opp.stage === stage)
          const columnTotalValue = stageOpps.reduce((sum, opp) => sum + opp.value, 0)
          
          return (
            <div
              key={stage}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage)}
              className="flex flex-col min-h-[500px] rounded-2xl border border-slate-200 bg-slate-50/50 p-3"
            >
              {/* Stage Header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`rounded-lg border px-2 py-0.5 text-xs font-bold ${STAGE_COLORS[stage]}`}>
                    {stage}
                  </span>
                  <span className="text-xs font-bold text-slate-400">{stageOpps.length}</span>
                </div>
                <span className="text-xs font-extrabold text-slate-500">
                  ₹{(columnTotalValue / 1000).toFixed(0)}k
                </span>
              </div>

              {/* Opportunity Cards List */}
              <div className="flex-1 space-y-3">
                {stageOpps.map((opp) => (
                  <div
                    key={opp.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, opp.id)}
                    className="group relative cursor-grab rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md active:cursor-grabbing hover:border-blue-500/30"
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <h4 className="text-sm font-bold text-slate-900 pr-4">{opp.company}</h4>
                      <button
                        onClick={() => handleDelete(opp.id)}
                        className="opacity-0 group-hover:opacity-100 rounded p-1 text-slate-400 hover:bg-slate-50 hover:text-red-500 transition-opacity absolute right-2 top-2"
                        aria-label="Delete Opportunity"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1.5 text-xs font-medium text-slate-500">
                      <p className="flex items-center justify-between">
                        <span>Rep:</span>
                        <span className="font-semibold text-slate-700">{opp.rep}</span>
                      </p>
                      <p className="flex items-center justify-between">
                        <span>Value:</span>
                        <span className="font-bold text-slate-900">₹{opp.value.toLocaleString()}</span>
                      </p>
                      <p className="flex items-center justify-between">
                        <span>Win Prob:</span>
                        <span className="font-semibold text-blue-600">{opp.probability}%</span>
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[0.65rem] font-bold text-slate-400">
                      <span>Age: {opp.age} days</span>
                      {/* Simple action buttons to move columns without dragging on mobile */}
                      <div className="flex gap-1 sm:hidden">
                        <button
                          onClick={() => {
                            const curIdx = STAGES.indexOf(stage)
                            if (curIdx < STAGES.length - 1) {
                              setDraggingId(opp.id)
                              const dummyEvent = { preventDefault: () => {} }
                              setTimeout(() => handleDrop(dummyEvent, STAGES[curIdx + 1]), 10)
                            }
                          }}
                          className="rounded bg-slate-100 p-1 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <MoveRight className="size-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {stageOpps.length === 0 && (
                  <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs font-semibold text-slate-400">
                    No deals here
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Opportunity Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="size-5" />
            </button>
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900">Add Opportunity</h3>
              <p className="text-xs font-medium text-slate-500">Insert new opportunity into the sales pipeline.</p>
            </div>
            <form onSubmit={handleAddOpportunity} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase" htmlFor="company">
                  Company Name
                </label>
                <input
                  type="text"
                  id="company"
                  required
                  placeholder="e.g. Acme Corporation"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase" htmlFor="rep">
                    Representative
                  </label>
                  <select
                    id="rep"
                    value={newRep}
                    onChange={(e) => setNewRep(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                  >
                    <option value="John Doe">John Doe</option>
                    <option value="Mary Jane">Mary Jane</option>
                    <option value="Robert Smith">Robert Smith</option>
                    <option value="David Brown">David Brown</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase" htmlFor="value">
                    Deal Value (₹)
                  </label>
                  <input
                    type="number"
                    id="value"
                    required
                    placeholder="e.g. 50000"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase" htmlFor="stage">
                    Stage
                  </label>
                  <select
                    id="stage"
                    value={newStage}
                    onChange={(e) => {
                      setNewStage(e.target.value)
                      // Update default probability
                      const stage = e.target.value
                      if (stage === 'Won') setNewProb(100)
                      else if (stage === 'Lost') setNewProb(0)
                      else if (stage === 'Lead') setNewProb(30)
                      else if (stage === 'Qualified') setNewProb(50)
                      else if (stage === 'Proposal') setNewProb(60)
                      else if (stage === 'Negotiation') setNewProb(80)
                    }}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase" htmlFor="probability">
                    Win Probability (%)
                  </label>
                  <input
                    type="number"
                    id="probability"
                    min="0"
                    max="100"
                    required
                    placeholder="e.g. 60"
                    value={newProb}
                    onChange={(e) => setNewProb(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#A8C2FF] to-[#3B82F6] text-sm font-bold text-black border border-[#2563EB]/40 shadow-[0_8px_20px_-3px_rgba(59,130,246,0.3),inset_0_1.5px_0_rgba(255,255,255,0.45)] hover:from-[#95B6FF] hover:to-[#2563EB] hover:shadow-[0_12px_24px_-3px_rgba(59,130,246,0.4),inset_0_1.5px_0_rgba(255,255,255,0.5)] transition-all duration-300 active:scale-[0.98]"
              >
                Create Deal
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default SalesPipeline
