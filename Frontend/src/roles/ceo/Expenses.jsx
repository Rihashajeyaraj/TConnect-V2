import { useState, useEffect, useMemo } from 'react'
import { Search, Receipt, RefreshCw, Calendar, ExternalLink, CheckCircle2, Clock, XCircle, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { expenseAPI } from '../../services/api.js'

const STATUS_META = {
  APPROVED: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  approved:  { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Approved:  { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PENDING:   { label: 'Pending',  cls: 'bg-amber-50 text-amber-700 border-amber-200'   },
  REJECTED:  { label: 'Rejected', cls: 'bg-rose-50 text-rose-700 border-rose-200'       },
}

function fmtINR(val) {
  const n = parseFloat(String(val).replace(/[^\d.]/g, '')) || 0
  return '₹' + n.toLocaleString('en-IN')
}

function fmtDate(str) {
  if (!str || str === '—' || str === '--') return '—'
  try {
    const s = String(str).split('T')[0].split(' ')[0]
    const parts = s.split('-')
    if (parts.length === 3 && parts[0].length === 4) {
      const [y, m, d] = parts
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`
    }
    const dObj = new Date(str)
    if (!isNaN(dObj.getTime())) {
      const day = String(dObj.getDate()).padStart(2, '0')
      const month = String(dObj.getMonth() + 1).padStart(2, '0')
      const year = dObj.getFullYear()
      return `${day}/${month}/${year}`
    }
    return String(str)
  } catch {
    return String(str)
  }
}

function normalize(e, idx) {
  const statusRaw = e.status || e.approval_status || 'PENDING'
  const meta = STATUS_META[statusRaw] || { label: statusRaw, cls: 'bg-slate-50 text-slate-600 border-slate-200' }
  const isApproved = (statusRaw || '').toLowerCase() === 'approved'

  return {
    id: e.id || e.expense_id || `EXP-${idx}`,
    executive_name: e.employee_name || e.assigned_to || e.executive_name || e.name || 'Sales Executive',
    executive_email: e.employee_email || e.assigned_to_email || e.executive_email || e.email || '',
    category: e.category || e.type || e.expense_type || 'General',
    description: e.description || e.notes || e.purpose || '—',
    amount: parseFloat(String(e.amount || 0).replace(/[^\d.]/g, '')) || 0,
    claim_date: e.created_at || e.claim_date || e.submitted_at || '',
    approved_by: e.reviewed_by || e.approved_by || e.manager_name || '—',
    approved_at: e.approved_at || e.reviewed_at || e.approved_date || e.approval_date || e.updated_at || (isApproved ? (e.created_at || e.claim_date || e.submitted_at) : '') || '',
    receipt_url: e.receipt_url || e.receipt || e.bill_url || '',
    receipt_name: e.receipt_name || e.bill || e.file_name || 'Receipt',
    status: statusRaw,
    status_label: meta.label,
    status_cls: meta.cls,
    remarks: e.remarks || e.manager_remarks || '',
  }
}

export default function CeoExpenses() {
  const [expenses, setExpenses]   = useState([])
  const [loading, setLoading]     = useState(() => {
    try {
      return !localStorage.getItem('tc_ceo_expenses_cache')
    } catch {
      return true
    }
  })
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState('Approved')  // default: show approved

  async function fetchData() {
    if (!localStorage.getItem('tc_ceo_expenses_cache')) {
      setLoading(true)
    }
    try {
      const res = await expenseAPI.getManagerExpenses({ status: '' }) // fetch all
      const raw = Array.isArray(res) ? res : (res?.data?.expenses || res?.data || [])
      setExpenses(raw.map(normalize))
    } catch (err) {
      console.warn('CEO expenses fetch notice:', err)
      // fallback: try generic expenses endpoint
      try {
        const res2 = await expenseAPI.getExpenses()
        const raw2 = Array.isArray(res2) ? res2 : (res2?.data || [])
        setExpenses(raw2.map(normalize))
      } catch {
        setExpenses([])
      }
    } finally {
      try { localStorage.setItem('tc_ceo_expenses_cache', '1') } catch (_) {}
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return expenses.filter(e => {
      const matchStatus = statusFilter === 'All' || e.status_label === statusFilter ||
        e.status.toUpperCase() === statusFilter.toUpperCase()
      const matchSearch = !q ||
        e.executive_name.toLowerCase().includes(q) ||
        e.executive_email.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.approved_by.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q)
      return matchStatus && matchSearch
    })
  }, [expenses, search, statusFilter])

  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter])

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filtered.slice(start, start + ITEMS_PER_PAGE)
  }, [filtered, currentPage])

  const totalAmount = filtered.reduce((s, e) => s + e.amount, 0)
  const approvedCount = expenses.filter(e => e.status_label === 'Approved').length
  const pendingCount  = expenses.filter(e => e.status_label === 'Pending').length

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 pb-12">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-[#F8CAE4]/20 text-[#832D51]">
            <Receipt className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Expense Claims Audit</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Full audit log of all executive expense claims approved by Sales Managers
            </p>
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#832D51] hover:bg-[#6a2240] text-white font-black text-xs shadow-xs transition cursor-pointer disabled:opacity-60"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Claims', value: expenses.length, sub: 'All time', color: 'text-slate-900' },
          { label: 'Approved', value: approvedCount, sub: 'By Sales Managers', color: 'text-emerald-700' },
          { label: 'Pending', value: pendingCount, sub: 'Awaiting approval', color: 'text-amber-700' },
          { label: 'Approved Amount', value: fmtINR(expenses.filter(e=>e.status_label==='Approved').reduce((s,e)=>s+e.amount,0)), sub: 'Total disbursed', color: 'text-[#832D51]' },
        ].map(c => (
          <div key={c.label} className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{c.label}</span>
            <p className={`text-2xl font-black mt-2 ${c.color}`}>{c.value}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search executive, category, manager, description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 text-xs font-semibold text-slate-900 outline-none focus:border-[#832D51] focus:bg-white"
          />
        </div>
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
          {['All', 'Approved', 'Pending', 'Rejected'].map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                statusFilter === s ? 'bg-[#832D51] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw className="animate-spin size-6 text-[#832D51] mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-500">Loading expense records...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 font-semibold">
            No expense records found for the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/60">
                  <th className="px-5 py-3.5">Executive</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Description</th>
                  <th className="px-5 py-3.5 text-right">Amount</th>
                  <th className="px-5 py-3.5">Claim Date</th>
                  <th className="px-5 py-3.5">Approved By</th>
                  <th className="px-5 py-3.5">Approved On</th>
                  <th className="px-5 py-3.5">Receipt</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedExpenses.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5">
                      <p className="font-extrabold text-slate-900">{e.executive_name}</p>
                      {e.executive_email && <p className="text-[10px] text-slate-400">{e.executive_email}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 font-bold">{e.category}</td>
                    <td className="px-5 py-3.5 text-slate-600 max-w-[180px] truncate" title={e.description}>{e.description}</td>
                    <td className="px-5 py-3.5 text-right font-black text-slate-900">{fmtINR(e.amount)}</td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3 text-slate-400" />
                        {fmtDate(e.claim_date)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-800">{e.approved_by}</td>
                    <td className="px-5 py-3.5 text-slate-600">{fmtDate(e.approved_at)}</td>
                    <td className="px-5 py-3.5">
                      {e.receipt_url ? (
                        <a
                          href={e.receipt_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[#832D51] font-bold hover:underline"
                        >
                          <ExternalLink className="size-3" />
                          View
                        </a>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-1">
                          <Receipt className="size-3" />
                          {e.receipt_name !== 'Receipt' ? e.receipt_name : '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black border ${e.status_cls}`}>
                        {e.status_label === 'Approved' && <CheckCircle2 className="size-3" />}
                        {e.status_label === 'Pending'  && <Clock className="size-3" />}
                        {e.status_label === 'Rejected' && <XCircle className="size-3" />}
                        {e.status_label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Footer total */}
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50/80 font-black text-slate-900 text-xs">
                  <td className="px-5 py-3.5" colSpan={3}>
                    Showing {filtered.length} of {expenses.length} records
                  </td>
                  <td className="px-5 py-3.5 text-right text-[#832D51]">{fmtINR(totalAmount)}</td>
                  <td colSpan={5} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Pagination Bar (10 rows per page) */}
        {filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/80 border-t border-slate-200/80">
            <div className="text-xs text-slate-500 font-medium">
              Showing <span className="font-black text-slate-900">{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filtered.length)}</span> to <span className="font-black text-slate-900">{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}</span> of <span className="font-black text-slate-900">{filtered.length.toLocaleString()}</span> records
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition shadow-2xs"
              >
                <ChevronLeft className="size-3.5" />
                Previous
              </button>

              <div className="flex items-center gap-1 px-2">
                <span className="text-xs font-black text-slate-800">
                  Page {currentPage} of {totalPages}
                </span>
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition shadow-2xs"
              >
                Next
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
