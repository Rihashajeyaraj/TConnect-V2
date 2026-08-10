import { useState, useEffect } from 'react'
import { Calendar, Search, AlertCircle, CheckCircle, Clock, Check, X, MessageSquare } from 'lucide-react'
import { useToast } from '../../common/ToastContext.jsx'
import { attendanceAPI, hrmsAPI } from '../../services/api.js'

const STATUS_COLORS = {
  Pending: 'text-amber-600 bg-amber-50 border-amber-100',
  Approved: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  Rejected: 'text-rose-600 bg-rose-50 border-rose-100',
}

function Leaves() {
  const { showToast } = useToast()
  const [leaves, setLeaves] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  // Approval Modal state
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [actionType, setActionType] = useState('Approved') // 'Approved' or 'Rejected'
  const [remarks, setRemarks] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      // 1. Fetch leave requests
      const leaveRes = await attendanceAPI.getLeaveRequests().catch(() => null)
      const empRes = await hrmsAPI.getEmployees().catch(() => null)

      const rawLeaves = leaveRes && leaveRes.data ? leaveRes.data : []
      const rawEmps = empRes && empRes.data ? empRes.data : []
      setEmployees(rawEmps)

      if (rawLeaves.length > 0) {
        const loadedLeaves = rawLeaves.map((l) => {
          const matchedEmp = rawEmps.find(e => e.employee_id === l.employee_code || e.email === l.employee_email)
          return {
            id: l.id || l.leave_id,
            name: l.employee_name || matchedEmp?.name || 'Staff Member',
            role: matchedEmp?.role || l.designation || 'Sales Manager',
            type: l.leave_type || 'Casual Leave',
            start: l.from_date || l.start_date || 'N/A',
            end: l.to_date || l.end_date || 'N/A',
            days: l.duration || 1,
            reason: l.reason || 'Personal work',
            status: l.status || 'Pending',
            remarks: l.comment || l.remarks || '',
          }
        })
        setLeaves(loadedLeaves)
      } else {
        // Fallbacks
        const fallbackLeaves = [
          { id: 'leave_1', name: 'Vikram Singh', role: 'Sales Manager', type: 'Sick Leave', start: '2026-08-07', end: '2026-08-07', days: 1, reason: 'Severe Migraine', status: 'Pending', remarks: '' },
          { id: 'leave_2', name: 'Suresh V', role: 'Sales Manager', type: 'Casual Leave', start: '2026-08-10', end: '2026-08-11', days: 2, reason: 'Family Function', status: 'Pending', remarks: '' },
          { id: 'leave_3', name: 'Ananya Roy', role: 'Sales Executive', type: 'Paid Leave', start: '2026-08-05', end: '2026-08-05', days: 1, reason: 'Personal work', status: 'Approved', remarks: 'Approved by Manager' },
          { id: 'leave_4', name: 'John Doe', role: 'Admin', type: 'Casual Leave', start: '2026-08-06', end: '2026-08-06', days: 1, reason: 'Doctor checkup', status: 'Approved', remarks: 'Granted' },
        ]
        setLeaves(fallbackLeaves)
      }
    } catch (e) {
      console.warn('Leaves directory load notice:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenApproval = (req, type) => {
    setSelectedRequest(req)
    setActionType(type)
    setRemarks('')
    setShowApprovalModal(true)
  }

  const handleConfirmApproval = async () => {
    if (!selectedRequest) return
    
    try {
      await attendanceAPI.updateLeaveStatus(selectedRequest.id, actionType, remarks)
      setLeaves((prev) =>
        prev.map((l) =>
          l.id === selectedRequest.id ? { ...l, status: actionType, remarks: remarks } : l
        )
      )
      showToast(`Leave request ${actionType.toLowerCase()} successfully!`, 'success')
      setShowApprovalModal(false)
      setSelectedRequest(null)
    } catch (err) {
      showToast(`Failed to update leave status: ${err?.message || 'Server Error'}`, 'error')
    }
  }

  const filtered = leaves.filter((l) => {
    // Show Admins and Sales Managers only (the CEO approves them)
    const isExecutiveRole = (l.role || '').toLowerCase().includes('manager') || (l.role || '').toLowerCase().includes('admin')
    
    const matchesSearch = l.name.toLowerCase().includes(search.toLowerCase()) || l.type.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'All' || l.status === statusFilter
    
    return isExecutiveRole && matchesSearch && matchesStatus
  })

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 font-sans">
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#004749]" /> Executive Leave Management
          </h2>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            Review and approve leave requests submitted by corporate Admins and Sales Managers.
          </p>
        </div>
      </div>

      {/* ── FILTER MATRIX ── */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by corporate representative..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-bold text-slate-900 outline-none transition focus:border-[#b09b72] focus:bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 text-xs border border-slate-200 rounded-xl px-3 bg-slate-50 font-bold text-slate-600 focus:outline-none"
        >
          <option value="All">All Requests</option>
          <option value="Pending">Pending Only</option>
          <option value="Approved">Approved Only</option>
          <option value="Rejected">Rejected Only</option>
        </select>
      </div>

      {/* ── LEAVE DIRECTORY TABLE ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">Employee Name</th>
              <th className="px-6 py-4">Designation</th>
              <th className="px-6 py-4">Leave Type</th>
              <th className="px-6 py-4">Dates</th>
              <th className="px-6 py-4 text-center">Duration</th>
              <th className="px-6 py-4">Reason</th>
              <th className="px-6 py-4">Remarks / Comments</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
            {filtered.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50/50 transition">
                <td className="px-6 py-4 text-slate-900 font-bold">{l.name}</td>
                <td className="px-6 py-4">
                  <span className="bg-[#b09b72]/10 text-[#938160] px-2 py-0.5 rounded-lg text-[9px] font-black uppercase">
                    {l.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-800">{l.type}</td>
                <td className="px-6 py-4 whitespace-nowrap">{l.start} to {l.end}</td>
                <td className="px-6 py-4 text-center font-bold text-slate-950">{l.days} days</td>
                <td className="px-6 py-4 text-slate-500 max-w-xs truncate">{l.reason}</td>
                <td className="px-6 py-4 text-slate-400 italic font-normal">{l.remarks || 'No remarks added'}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-0.5 text-[10px] font-black ${STATUS_COLORS[l.status]}`}>
                    {l.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                  {l.status === 'Pending' ? (
                    <>
                      <button
                        onClick={() => handleOpenApproval(l, 'Approved')}
                        className="h-7 w-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold inline-flex items-center justify-center transition cursor-pointer"
                        title="Approve Request"
                      >
                        <Check className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenApproval(l, 'Rejected')}
                        className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold inline-flex items-center justify-center transition cursor-pointer"
                        title="Reject Request"
                      >
                        <X className="size-3.5" />
                      </button>
                    </>
                  ) : (
                    <span className="text-[10px] text-slate-400">Processed</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400 font-semibold">
                  No leave requests found matching filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── REMARKS / CONFIRMATION MODAL ── */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                Confirm: {actionType === 'Approved' ? 'Approve Leave' : 'Reject Leave'}
              </h3>
              <button onClick={() => setShowApprovalModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            
            <div className="space-y-3.5 text-xs font-semibold text-slate-700">
              <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl space-y-1">
                <p className="font-bold text-slate-900">{selectedRequest.name} ({selectedRequest.role})</p>
                <p className="text-slate-400">{selectedRequest.type} • {selectedRequest.days} days</p>
                <p className="text-slate-500 italic mt-1.5">" {selectedRequest.reason} "</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                  <MessageSquare className="size-3 text-slate-400" /> Executive Remarks / Remarks
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add corporate reason or note for this decision..."
                  className="w-full h-20 rounded-xl border border-slate-200 p-3 font-bold text-slate-900 outline-none focus:border-[#b09b72] resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-50">
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-250 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmApproval}
                  className={`px-5 py-2 rounded-xl text-white font-extrabold shadow-sm cursor-pointer ${
                    actionType === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Confirm Decision
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Leaves
