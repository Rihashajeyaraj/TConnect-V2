import { useState, useEffect, useCallback } from 'react'
import { ShieldCheck, Search, Filter, RefreshCw, Eye, X, ChevronDown } from 'lucide-react'
import { auditAPI } from '../../services/api.js'

// ─── Action color badge ───────────────────────────────────────────────────────
function ActionBadge({ action = '' }) {
  const a = action.toUpperCase()
  let cls = 'bg-slate-500/20 text-slate-300 border-slate-600/40'
  if (a.includes('CREAT') || a.includes('ADD')) cls = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
  else if (a.includes('UPDAT') || a.includes('CHANGE') || a.includes('ASSIGN')) cls = 'bg-blue-500/15 text-blue-400 border-blue-500/30'
  else if (a.includes('DELET') || a.includes('REMOV')) cls = 'bg-red-500/15 text-red-400 border-red-500/30'
  else if (a.includes('CONVERT')) cls = 'bg-purple-500/15 text-purple-400 border-purple-500/30'
  else if (a.includes('LOGIN') || a.includes('LOGOUT') || a.includes('AUTH')) cls = 'bg-amber-500/15 text-amber-400 border-amber-500/30'
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${cls}`}>{action}</span>
  )
}

// ─── Module badge ─────────────────────────────────────────────────────────────
function ModuleBadge({ module = '' }) {
  const colors = {
    crm: 'text-teal-400', hrms: 'text-indigo-400', customer: 'text-emerald-400',
    'field management': 'text-sky-400', 'user management': 'text-orange-400',
    settings: 'text-amber-400', system: 'text-slate-400',
  }
  const color = colors[(module || '').toLowerCase()] || 'text-slate-400'
  return <span className={`text-xs font-semibold ${color}`}>{module || '—'}</span>
}

// ─── Main Component ───────────────────────────────────────────────────────────
function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState(null)
  const [showFilters, setShowFilters] = useState(false)

  // Filter state
  const [filters, setFilters] = useState({
    user_email: '', role: '', action: '', entity_type: '', from_date: '', to_date: '',
  })
  const [activeFilters, setActiveFilters] = useState({})

  const loadLogs = useCallback(async (appliedFilters = {}) => {
    setLoading(true)
    try {
      const res = await auditAPI.getLogs(appliedFilters)
      if (res && res.data) {
        setLogs(Array.isArray(res.data) ? res.data : [])
      } else {
        setLogs([])
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadLogs({}) }, [loadLogs])

  const applyFilters = () => {
    const active = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    setActiveFilters(active)
    loadLogs(active)
  }

  const resetFilters = () => {
    const empty = { user_email: '', role: '', action: '', entity_type: '', from_date: '', to_date: '' }
    setFilters(empty)
    setActiveFilters({})
    loadLogs({})
  }

  const activeFilterCount = Object.keys(activeFilters).length

  // Unique values for dropdowns from loaded data
  const roles = [...new Set(logs.map(l => l.role).filter(Boolean))]
  const modules = [...new Set(logs.map(l => l.module).filter(Boolean))]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-indigo-400" /> Security &amp; Audit Logs
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Complete audit trail of system events, actions, and security operations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadLogs(activeFilters)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg transition border ${
              activeFilterCount > 0
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-slate-800 border border-slate-700/80 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold">User Email</label>
              <input
                type="text"
                placeholder="e.g. admin@example.com"
                value={filters.user_email}
                onChange={e => setFilters(f => ({ ...f, user_email: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold">Role</label>
              <select
                value={filters.role}
                onChange={e => setFilters(f => ({ ...f, role: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Roles</option>
                {roles.map(r => <option key={r} value={r}>{r}</option>)}
                <option value="Super Admin">Super Admin</option>
                <option value="Admin">Admin</option>
                <option value="CEO / Founder">CEO / Founder</option>
                <option value="Sales Manager">Sales Manager</option>
                <option value="Sales Executive">Sales Executive</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold">Module (entity_type)</label>
              <input
                type="text"
                placeholder="e.g. crm.leads"
                value={filters.entity_type}
                onChange={e => setFilters(f => ({ ...f, entity_type: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold">Action</label>
              <input
                type="text"
                placeholder="e.g. LEAD_CREATED"
                value={filters.action}
                onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold">From Date</label>
              <input
                type="date"
                value={filters.from_date}
                onChange={e => setFilters(f => ({ ...f, from_date: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold">To Date</label>
              <input
                type="date"
                value={filters.to_date}
                onChange={e => setFilters(f => ({ ...f, to_date: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition"
            >
              Apply Filters
            </button>
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold rounded-lg transition"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-slate-800 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase border-b border-slate-700">
              <tr>
                <th className="px-4 py-3.5">Timestamp</th>
                <th className="px-4 py-3.5">Performed By</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Action</th>
                <th className="px-4 py-3.5">Module</th>
                <th className="px-4 py-3.5">Entity</th>
                <th className="px-4 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {loading ? (
                <tr><td colSpan="7" className="text-center py-10 text-slate-400">Loading audit logs...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-10 text-slate-400">No audit logs found.</td></tr>
              ) : (
                logs.map((log, idx) => (
                  <tr key={log.log_id || log.id || idx} className="hover:bg-slate-700/40 transition-colors">
                    <td className="px-4 py-3.5 text-xs font-mono text-slate-400 whitespace-nowrap">
                      {log.created_at ? new Date(log.created_at).toLocaleString('en-IN') : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-white text-sm leading-tight">{log.performed_by_name || log.user_email || '—'}</div>
                      {log.user_email && log.performed_by_name && log.performed_by_name !== log.user_email && (
                        <div className="text-[10px] text-slate-500 font-mono">{log.user_email}</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 whitespace-nowrap">
                        {log.role || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5"><ActionBadge action={log.action} /></td>
                    <td className="px-4 py-3.5"><ModuleBadge module={log.module} /></td>
                    <td className="px-4 py-3.5 text-xs font-mono text-slate-400">
                      <div>{log.resource || log.entity_type || '—'}</div>
                      {log.resource_id && log.resource_id !== 'None' && log.resource_id !== '' && (
                        <div className="text-[10px] text-slate-600 truncate max-w-[120px]">{log.resource_id}</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
                        title="View full details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {logs.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-700 text-xs text-slate-500">
            Showing {logs.length} record{logs.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" /> Audit Event Detail
              </h3>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Meta info */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900/60 rounded-lg p-3">
                <p className="text-slate-500 font-semibold mb-0.5">ACTION</p>
                <ActionBadge action={selectedLog.action} />
              </div>
              <div className="bg-slate-900/60 rounded-lg p-3">
                <p className="text-slate-500 font-semibold mb-0.5">MODULE</p>
                <ModuleBadge module={selectedLog.module} />
              </div>
              <div className="bg-slate-900/60 rounded-lg p-3">
                <p className="text-slate-500 font-semibold mb-0.5">PERFORMED BY</p>
                <p className="text-white font-medium">{selectedLog.performed_by_name || selectedLog.user_email}</p>
                {selectedLog.role && <p className="text-slate-400 text-[10px]">{selectedLog.role}</p>}
              </div>
              <div className="bg-slate-900/60 rounded-lg p-3">
                <p className="text-slate-500 font-semibold mb-0.5">TIMESTAMP</p>
                <p className="text-white font-mono text-xs">{selectedLog.created_at ? new Date(selectedLog.created_at).toLocaleString('en-IN') : '—'}</p>
              </div>
              {selectedLog.resource && (
                <div className="bg-slate-900/60 rounded-lg p-3 col-span-2">
                  <p className="text-slate-500 font-semibold mb-0.5">ENTITY</p>
                  <p className="text-white font-mono">{selectedLog.resource}</p>
                  {selectedLog.resource_id && selectedLog.resource_id !== 'None' && (
                    <p className="text-slate-400 text-[10px] mt-0.5">{selectedLog.resource_id}</p>
                  )}
                </div>
              )}
              {selectedLog.description && (
                <div className="bg-slate-900/60 rounded-lg p-3 col-span-2">
                  <p className="text-slate-500 font-semibold mb-0.5">DESCRIPTION</p>
                  <p className="text-slate-200">{selectedLog.description}</p>
                </div>
              )}
            </div>

            {/* Before / After */}
            {(selectedLog.details?.previous_value !== undefined || selectedLog.details?.new_value !== undefined) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-3">
                  <p className="text-red-400 text-xs font-bold mb-2">⬅ PREVIOUS VALUE</p>
                  <pre className="text-xs text-red-300 font-mono whitespace-pre-wrap break-words">
                    {JSON.stringify(selectedLog.details?.previous_value ?? '—', null, 2)}
                  </pre>
                </div>
                <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-xl p-3">
                  <p className="text-emerald-400 text-xs font-bold mb-2">➡ NEW VALUE</p>
                  <pre className="text-xs text-emerald-300 font-mono whitespace-pre-wrap break-words">
                    {JSON.stringify(selectedLog.details?.new_value ?? '—', null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Full details payload */}
            <div>
              <p className="text-slate-500 text-xs font-bold mb-2">FULL AUDIT PAYLOAD</p>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-700/80 font-mono text-xs text-emerald-400 overflow-x-auto max-h-48">
                <pre>{JSON.stringify(selectedLog.details, null, 2)}</pre>
              </div>
            </div>

            <div className="text-right">
              <button onClick={() => setSelectedLog(null)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-semibold text-white transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AuditLogs

