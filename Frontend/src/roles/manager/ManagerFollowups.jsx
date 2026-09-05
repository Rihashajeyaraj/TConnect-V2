import React, { useState, useEffect } from 'react'
import {
  PhoneCall,
  Search,
  Filter,
  CalendarDays,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LayoutGrid,
  Table,
  Eye,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useToast } from '../../common/ToastContext.jsx'
import { crmAPI } from '../../services/api.js'

const DEFAULT_FOLLOWUPS = []

const STATUS_COLORS = {
  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  Pending: 'bg-mgr-primary-100 text-mgr-primary-800 border-mgr-primary-300',
  Overdue: 'bg-rose-100 text-rose-800 border-rose-300',
  Rescheduled: 'bg-sky-100 text-sky-800 border-sky-300',
}

const PRIORITY_COLORS = {
  High: 'text-rose-700',
  Medium: 'text-mgr-primary-700',
  Low: 'text-emerald-700',
}

export default function ManagerFollowups() {
  const { showToast } = useToast()

  const [viewMode, setViewMode] = useState('cards')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedItem, setSelectedItem] = useState(null)

  const [followups, setFollowups] = useState([])
  const [loading, setLoading] = useState(false)

  const normalizeFollowup = (f, idx) => ({
    id: f.id || f.follow_up_id || `fol_${2000 + idx}`,
    customer: f.customer || f.company || f.clientName || 'Client Account',
    contactPerson: f.contactPerson || f.person || f.contactName || 'Contact Person',
    executive: f.executive || f.assignedTo || f.assigned_to || f.executiveName || 'Sales Executive',
    employeeCode: f.employeeCode || f.employee_code || f.empCode || 'EMP000012',
    type: f.type || f.follow_up_type || f.followUpType || f.purpose || 'Follow-up Call',
    status: f.status || 'Pending',
    scheduledTime: f.scheduledDate || f.scheduledTime || f.date || f.follow_up_date || 'TBD',
    priority: f.priority || 'Medium',
    reminder: f.reminder || 'No reminder set',
    notes: f.remark || f.notes || f.remarks || f.description || 'Client follow-up scheduled.',
  })

  useEffect(() => {
    setLoading(true)
    // 1. Load from backend API
    crmAPI.getFollowupsAll()
      .then(res => {
        const raw = Array.isArray(res) ? res : (res?.data || [])
        if (raw.length > 0) {
          setFollowups(raw.map(normalizeFollowup))
          setLoading(false)
          return
        }
        // 2. Fallback to localStorage if empty
        loadFromLocalStorage()
      })
      .catch(() => loadFromLocalStorage())
      .finally(() => setLoading(false))
  }, [])

  const loadFromLocalStorage = () => {
    let combined = []
    try {
      const savedStr = localStorage.getItem('tc_sales_followups')
      if (savedStr) {
        const parsed = JSON.parse(savedStr)
        if (Array.isArray(parsed) && parsed.length > 0) {
          combined = parsed.map(normalizeFollowup)
        }
      }
    } catch (e) {}
    setFollowups(combined)
  }

  const filteredFollowups = followups.filter((f) => {
    const q = search.toLowerCase()
    const matchesSearch =
      (f.customer || '').toLowerCase().includes(q) ||
      (f.executive || '').toLowerCase().includes(q) ||
      (f.contactPerson || '').toLowerCase().includes(q) ||
      (f.employeeCode || '').toLowerCase().includes(q) ||
      (f.notes || '').toLowerCase().includes(q)
    const matchesStatus = statusFilter === 'All' || f.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalPending = followups.filter((f) => f.status === 'Pending').length
  const totalCompleted = followups.filter((f) => f.status === 'Completed').length
  const totalOverdue = followups.filter((f) => f.status === 'Overdue').length
  const totalHigh = followups.filter((f) => f.priority === 'High').length

  return (
    <div className="space-y-6 font-sans text-slate-900 pb-12">
      {/* HEADER */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <PhoneCall className="w-6 h-6 text-teal-600" /> Team Follow-Ups & Call Reminders
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Monitor client call schedules, meeting follow-ups, overdue reminders, and executive interaction notes.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('cards')}
              className={`mgr-card px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'cards' ? 'bg-white text-teal-700 shadow-2xs border border-slate-200' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid size={14} /> Cards View
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`mgr-card px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-teal-700 shadow-2xs border border-slate-200' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Table size={14} /> Table View
            </button>
          </div>
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-500">Pending Follow-ups</span>
          <h2 className="text-2xl font-black text-mgr-primary-600">{totalPending}</h2>
        </div>
        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-emerald-700">Completed Today</span>
          <h2 className="text-2xl font-black text-emerald-700">{totalCompleted}</h2>
        </div>
        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-rose-700">Overdue Calls</span>
          <h2 className="text-2xl font-black text-rose-600">{totalOverdue}</h2>
        </div>
        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-600">High Priority</span>
          <h2 className="text-2xl font-black text-slate-900">{totalHigh}</h2>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customer, executive, employee code, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 bg-slate-50 border-slate-200 rounded-xl pl-9 pr-4 text-xs font-semibold text-slate-900 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-50 border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold">
          <span className="text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="mgr-card bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
            <option value="Overdue">Overdue</option>
            <option value="Rescheduled">Rescheduled</option>
          </select>
        </div>
      </div>

      {/* CONTENT: CARDS OR TABLE */}
      {viewMode === 'cards' ? (
        <div className="space-y-4">
          {filteredFollowups.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400 font-semibold text-xs">
              No follow-ups match your search or filter criteria.
            </div>
          ) : (
            filteredFollowups.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:border-teal-400/50 transition space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900">{item.customer}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${STATUS_COLORS[item.status] || 'bg-slate-100 text-slate-700 border-slate-300'}`}>
                        ● {item.status}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">Contact: {item.contactPerson}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-black text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-300">
                      [{item.employeeCode}]
                    </span>
                    <span className="text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-xl border border-teal-200">
                      {item.executive}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs font-semibold text-slate-700 p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">TYPE</span>
                    <span className="text-slate-900 font-extrabold">{item.type}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">SCHEDULED TIME</span>
                    <span className="text-teal-700 font-extrabold">{item.scheduledTime}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">PRIORITY</span>
                    <span className={`font-extrabold ${PRIORITY_COLORS[item.priority] || 'text-slate-700'}`}>{item.priority} Priority</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-700 font-medium">
                  <span className="text-[10px] font-extrabold text-slate-400 block uppercase">FOLLOW UP NOTES & INSTRUCTIONS</span>
                  <p className="mt-0.5">{item.notes}</p>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 min-w-[900px]">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200 text-[10px]">
                <tr>
                  <th className="px-3.5 py-3.5">#</th>
                  <th className="px-3.5 py-3.5">Customer</th>
                  <th className="px-3.5 py-3.5">Contact Person</th>
                  <th className="px-3.5 py-3.5">SE Code</th>
                  <th className="px-3.5 py-3.5">Executive</th>
                  <th className="px-3.5 py-3.5">Follow-up Type</th>
                  <th className="px-3.5 py-3.5">Scheduled Time</th>
                  <th className="px-3.5 py-3.5">Priority</th>
                  <th className="px-3.5 py-3.5">Status</th>
                  <th className="px-3.5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredFollowups.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-10 text-slate-400">No follow-ups match your criteria.</td>
                  </tr>
                ) : (
                  filteredFollowups.map((item, idx) => (
                    <tr key={item.id} className="mgr-card hover:bg-teal-50/30 transition cursor-pointer" onClick={() => setSelectedItem(item)}>
                      <td className="px-3.5 py-3 font-mono text-slate-500">{idx + 1}</td>
                      <td className="px-3.5 py-3 font-extrabold text-slate-900">{item.customer}</td>
                      <td className="px-3.5 py-3 text-slate-600">{item.contactPerson}</td>
                      <td className="px-3.5 py-3">
                        <span className="bg-teal-50 text-teal-900 border border-teal-300 px-1.5 py-0.5 rounded text-[10px] font-mono font-black">
                          [{item.employeeCode}]
                        </span>
                      </td>
                      <td className="px-3.5 py-3 font-bold text-teal-800">{item.executive}</td>
                      <td className="px-3.5 py-3 text-slate-700">{item.type}</td>
                      <td className="px-3.5 py-3 font-bold text-slate-800">{item.scheduledTime}</td>
                      <td className="px-3.5 py-3">
                        <span className={`font-extrabold text-xs ${PRIORITY_COLORS[item.priority] || 'text-slate-700'}`}>{item.priority}</span>
                      </td>
                      <td className="px-3.5 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${STATUS_COLORS[item.status] || 'bg-slate-100 text-slate-700 border-slate-300'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedItem(item) }}
                          className="mgr-card px-2.5 py-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-[10px] shadow-xs cursor-pointer transition flex items-center gap-1 ml-auto"
                        >
                          <Eye size={11} /> View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-black text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-300">[{selectedItem.employeeCode}]</span>
                  <span className="text-xs font-extrabold text-teal-800">{selectedItem.executive}</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">{selectedItem.customer}</h3>
                <p className="text-xs text-slate-500 font-semibold">Contact: {selectedItem.contactPerson}</p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border-slate-200 space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Follow-up Type</span>
                <span className="font-extrabold text-slate-900">{selectedItem.type}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 space-y-0.5">
                <span className="text-[10px] font-bold text-teal-600 uppercase block">Scheduled Time</span>
                <span className="font-extrabold text-teal-900">{selectedItem.scheduledTime}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border-slate-200 space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Priority</span>
                <span className={`font-extrabold ${PRIORITY_COLORS[selectedItem.priority] || 'text-slate-700'}`}>{selectedItem.priority}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border-slate-200 space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Status</span>
                <span className={`font-extrabold text-xs ${STATUS_COLORS[selectedItem.status] || 'text-slate-700'}`}>{selectedItem.status}</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border-slate-200 text-xs space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Follow-up Notes & Instructions</span>
              <p className="text-slate-800 font-medium">{selectedItem.notes}</p>
            </div>

            <div className="flex justify-end">
              <button onClick={() => setSelectedItem(null)} className="mgr-card px-4 py-2 rounded-xl bg-slate-900 text-white font-extrabold text-xs cursor-pointer">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
