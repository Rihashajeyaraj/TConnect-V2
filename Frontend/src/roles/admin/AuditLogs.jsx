import { useState, useEffect } from 'react'
import { ShieldCheck, Search, Filter, RefreshCw, Eye } from 'lucide-react'
import { auditAPI } from '../../services/api.js'

function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLog, setSelectedLog] = useState(null)

  useEffect(() => {
    async function loadLogs() {
      try {
        const res = await auditAPI.getLogs()
        if (res && res.data) {
          setLogs(res.data)
        } else {
          // Fallback mock logs for preview
          setLogs([
            {
              log_id: 'log_001',
              user_id: 'usr_admin_001',
              performed_by_name: 'Rajesh Kumar',
              role: 'Admin',
              action: 'CREATE_EMPLOYEE',
              resource: 'hrms.employees',
              resource_id: 'emp_002',
              details: { employee_code: 'EMP-002', role: 'Sales Executive', email: 'suresh@tconnect.com' },
              ip_address: '192.168.1.10',
              created_at: '2026-07-31 09:30:00',
            },
            {
              log_id: 'log_002',
              user_id: 'usr_sales_002',
              performed_by_name: 'Suresh Raina',
              role: 'Sales Executive',
              action: 'CREATE_LEAD',
              resource: 'crm.leads',
              resource_id: 'lead_123',
              details: { title: 'Enterprise Software Deal', company: 'Apex Tech', address: 'OMR Chennai' },
              ip_address: '10.0.0.45',
              created_at: '2026-07-31 10:15:22',
            },
            {
              log_id: 'log_003',
              user_id: 'usr_sales_002',
              performed_by_name: 'Suresh Raina',
              role: 'Sales Executive',
              action: 'CLOCK_IN',
              resource: 'hrms.attendance_logs',
              resource_id: 'att_555',
              details: { lat: 13.0827, lng: 80.2707, location: 'Apex Tech Site', remarks: 'Arrived for demo' },
              ip_address: '10.0.0.45',
              created_at: '2026-07-31 10:30:00',
            },
            {
              log_id: 'log_004',
              user_id: 'usr_admin_001',
              performed_by_name: 'Rajesh Kumar',
              role: 'Admin',
              action: 'CONVERT_LEAD',
              resource: 'customer.customers',
              resource_id: 'cust_456',
              details: { lead_id: 'lead_123', credit_limit: 500000, gstin: '33AAAAA0000A1Z5' },
              ip_address: '192.168.1.10',
              created_at: '2026-07-31 11:00:15',
            },
            {
              log_id: 'log_005',
              user_id: 'usr_admin_001',
              performed_by_name: 'Rajesh Kumar',
              role: 'Admin',
              action: 'APPROVE_EXPENSE',
              resource: 'expense.expenses',
              resource_id: 'exp_789',
              details: { expense_id: 'exp_789', amount: 1500, status: 'APPROVED', remarks: 'Cab bill verified' },
              ip_address: '192.168.1.10',
              created_at: '2026-07-31 11:20:00',
            },
          ])
        }
      } catch (err) {
        console.error('Failed to load audit logs:', err)
      } finally {
        setLoading(false)
      }
    }
    loadLogs()
  }, [])

  const filteredLogs = logs.filter(
    (l) =>
      l.performed_by_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.resource?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-indigo-400" /> Security & Audit Logs
          </h1>
          <p className="text-sm text-slate-400">Complete audit trail of system events, actions, and security operations.</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-slate-800 border border-slate-700/80 rounded-xl p-3 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search action, user, or resource..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-800 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase border-b border-slate-700">
              <tr>
                <th className="px-6 py-3.5">Timestamp</th>
                <th className="px-6 py-3.5">Performed By</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Action</th>
                <th className="px-6 py-3.5">Resource</th>
                <th className="px-6 py-3.5">IP Address</th>
                <th className="px-6 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-400">Loading audit logs...</td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-400">No matching audit logs found.</td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => (
                  <tr key={log.log_id || idx} className="hover:bg-slate-700/40 transition-colors">
                    <td className="px-6 py-4 text-xs font-mono text-slate-400">{log.created_at}</td>
                    <td className="px-6 py-4 font-medium text-white">{log.performed_by_name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {log.role || 'Admin'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-amber-400 font-semibold">{log.action}</td>
                    <td className="px-6 py-4 text-xs text-slate-300 font-mono">{log.resource}</td>
                    <td className="px-6 py-4 text-xs text-slate-400 font-mono">{log.ip_address}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
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
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center justify-between">
              <span>Audit Payload Details</span>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-white">✕</button>
            </h3>
            <div className="space-y-2 text-xs">
              <p><strong className="text-slate-400">Action:</strong> <span className="text-amber-400">{selectedLog.action}</span></p>
              <p><strong className="text-slate-400">Resource:</strong> <span className="text-white">{selectedLog.resource}</span></p>
              <p><strong className="text-slate-400">Performed By:</strong> <span className="text-white">{selectedLog.performed_by_name} ({selectedLog.role})</span></p>
            </div>
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-700/80 font-mono text-xs text-emerald-400 overflow-x-auto">
              <pre>{JSON.stringify(selectedLog.details, null, 2)}</pre>
            </div>
            <div className="text-right">
              <button onClick={() => setSelectedLog(null)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-semibold text-white">
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
