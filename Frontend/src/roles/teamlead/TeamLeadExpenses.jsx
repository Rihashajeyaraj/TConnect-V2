import React, { useState, useEffect } from 'react'
import ExecutiveExpenses from '../sales/Expenses.jsx'
import {
  Receipt,
  Info,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  RefreshCw,
  FileText,
  X,
  ShieldCheck,
  Briefcase,
  Calendar,
  MapPin,
  ExternalLink,
  DollarSign,
  AlertCircle,
} from 'lucide-react'
import { expenseAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'

export default function TeamLeadExpenses() {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState('team') // 'team' | 'own'

  // Team Expenses State (View-Only)
  const [teamExpenses, setTeamExpenses] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedClaim, setSelectedClaim] = useState(null)
  const [zoomReceipt, setZoomReceipt] = useState(null)

  // Fetch Team Expenses for View-Only Tab
  const fetchTeamExpenses = async () => {
    setLoading(true)
    try {
      const res = await expenseAPI.getManagerExpenses({ limit: 100 })
      const data = res?.data?.expenses || res?.expenses || res?.data || (Array.isArray(res) ? res : [])

      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map((item, idx) => ({
          id: item.id || item.expense_id || `EXP-${1001 + idx}`,
          employeeName: item.employee_name || item.assigned_to || item.user_name || item.name || 'Sales Executive',
          employeeCode: item.employee_code || item.emp_code || item.user_code || `EMP-${100 + idx}`,
          avatar: item.photo || item.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.employee_name || idx}`,
          customerName: item.customer_name || item.client || item.company || 'Direct Field Client',
          visitLocation: item.visit_location || item.location || item.city || 'Field Location',
          category: item.category || item.expense_category || item.type || 'Travel / Fuel',
          amount: item.amount ? (String(item.amount).startsWith('₹') ? item.amount : `₹${Number(item.amount).toLocaleString('en-IN')}`) : '₹0',
          numericAmount: parseFloat(String(item.amount || '0').replace(/[^0-9.]/g, '')) || 0,
          date: item.visit_date || item.expense_date || item.date || item.created_at || 'Recently',
          submittedDate: item.submitted_date || item.created_at || item.date || 'Today',
          status: (item.status || item.current_status || 'Pending').toLowerCase().includes('approv')
            ? 'Approved'
            : (item.status || '').toLowerCase().includes('reject')
            ? 'Rejected'
            : 'Pending',
          description: item.description || item.notes || item.purpose || 'Field travel & conveyance reimbursement request',
          receiptUrl: item.receipt_url || item.receiptUrl || item.voucher_url || item.file_url || null,
          receiptName: item.receipt_name || item.file_name || 'receipt_voucher.pdf',
          managerRemarks: item.manager_remarks || item.remarks || '',
        }))
        setTeamExpenses(mapped)
      } else {
        // Mock fallback if API returns empty array for demo
        setTeamExpenses(MOCK_TEAM_EXPENSES)
      }
    } catch (err) {
      console.warn('Using fallback team expenses data:', err)
      setTeamExpenses(MOCK_TEAM_EXPENSES)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'team') {
      fetchTeamExpenses()
    }
  }, [activeTab])

  // Filtered Team Expenses
  const filteredTeamExpenses = teamExpenses.filter((item) => {
    const matchesSearch =
      item.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter === 'All' || item.status.toLowerCase() === statusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

  // Summary Metrics
  const totalCount = teamExpenses.length
  const approvedCount = teamExpenses.filter((e) => e.status === 'Approved').length
  const pendingCount = teamExpenses.filter((e) => e.status === 'Pending').length
  const rejectedCount = teamExpenses.filter((e) => e.status === 'Rejected').length

  const totalAmount = teamExpenses.reduce((acc, curr) => acc + curr.numericAmount, 0)
  const approvedAmount = teamExpenses.filter((e) => e.status === 'Approved').reduce((acc, curr) => acc + curr.numericAmount, 0)
  const pendingAmount = teamExpenses.filter((e) => e.status === 'Pending').reduce((acc, curr) => acc + curr.numericAmount, 0)

  return (
    <div className="space-y-5 font-sans">
      {/* ── TOP TOGGLE BAR & HEADER ───────────────────────────────────────── */}
      <div className="bg-white border border-[#E8D8C8] p-3 sm:p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#F3ECE2] text-[#966038] rounded-xl shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-black text-[#543D30] uppercase tracking-wider flex items-center gap-2">
              Expense Claims & Reimbursements
              <span className="bg-[#FAF3EB] text-[#966038] border border-[#E8D8C8] text-[10px] px-2 py-0.5 rounded-full font-bold">
                Team Lead Portal
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {activeTab === 'team'
                ? 'Read-only audit view of team executive expense claims and clearance statuses.'
                : 'Submit and track your personal field travel expense claims submitted to Sales Manager.'}
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <div className="flex items-center gap-1.5 bg-[#FAF6F0] p-1.5 rounded-xl border border-[#E8D8C8] shrink-0 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('team')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'team'
                ? 'bg-[#543D30] text-white shadow-xs'
                : 'text-[#6B4E3D] hover:text-[#543D30] hover:bg-white/60'
            }`}
          >
            <Users className="w-4 h-4 text-[#D49A6A]" /> Team Expenses
          </button>
          <button
            onClick={() => setActiveTab('own')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'own'
                ? 'bg-[#966038] text-white shadow-xs'
                : 'text-[#6B4E3D] hover:text-[#543D30] hover:bg-white/60'
            }`}
          >
            <Briefcase className="w-4 h-4 text-amber-200" /> My Expenses
          </button>
        </div>
      </div>

      {/* ── TAB 1: TEAM EXPENSES (READ-ONLY AUDIT MODE) ───────────────────── */}
      {activeTab === 'team' && (
        <div className="space-y-5">

          {/* Read-Only Notice Banner */}
          <div className="bg-[#FFFDF9] border border-[#E8D8C8] p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 text-xs text-[#6B4E3D] font-semibold">
              <ShieldCheck className="w-5 h-5 text-[#966038] shrink-0" />
              <span>
                <strong className="font-extrabold text-[#543D30]">Read-Only Team Audit:</strong> You can view claims, receipt vouchers, and status updates sent by your executives. Final approval & payout is processed by Sales Manager.
              </span>
            </div>
            <button
              onClick={fetchTeamExpenses}
              disabled={loading}
              className="p-1.5 bg-[#FAF6F0] hover:bg-[#F3ECE2] text-[#6B4E3D] border border-[#E8D8C8] rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 shrink-0"
              title="Refresh Team Claims"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {/* Metrics Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="bg-white border border-[#E8D8C8] p-4 rounded-2xl shadow-xs space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Claims</span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-[#543D30]">{totalCount}</span>
                <span className="text-xs font-bold text-slate-500">₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold">Submitted by team</p>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-200/60 p-4 rounded-2xl shadow-xs space-y-1">
              <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Approved</span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-emerald-700">{approvedCount}</span>
                <span className="text-xs font-bold text-emerald-600">₹{approvedAmount.toLocaleString('en-IN')}</span>
              </div>
              <p className="text-[10px] text-emerald-600 font-semibold">Cleared by Manager</p>
            </div>

            <div className="bg-amber-50/50 border border-amber-200/60 p-4 rounded-2xl shadow-xs space-y-1">
              <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider">Pending</span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-amber-700">{pendingCount}</span>
                <span className="text-xs font-bold text-amber-600">₹{pendingAmount.toLocaleString('en-IN')}</span>
              </div>
              <p className="text-[10px] text-amber-600 font-semibold">Awaiting Manager Action</p>
            </div>

            <div className="bg-rose-50/50 border border-rose-200/60 p-4 rounded-2xl shadow-xs space-y-1">
              <span className="text-[10px] font-black text-rose-800 uppercase tracking-wider">Rejected</span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-rose-700">{rejectedCount}</span>
              </div>
              <p className="text-[10px] text-rose-600 font-semibold">Declined claims</p>
            </div>
          </div>

          {/* Search Bar & Filter Controls */}
          <div className="bg-white border border-[#E8D8C8] p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search executive, client, ID, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#FAF6F0] border border-[#E8D8C8] rounded-xl text-xs text-[#543D30] font-semibold focus:outline-none focus:ring-2 focus:ring-[#966038]/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {['All', 'Pending', 'Approved', 'Rejected'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                    statusFilter === status
                      ? 'bg-[#966038] text-white shadow-xs'
                      : 'bg-[#FAF6F0] text-[#6B4E3D] hover:bg-[#F3ECE2] border border-[#E8D8C8]'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Team Claims Table */}
          <div className="bg-white border border-[#E8D8C8] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAF6F0] border-b border-[#E8D8C8] text-[#6B4E3D] font-black uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Executive</th>
                    <th className="py-3 px-4">Client / Visit Account</th>
                    <th className="py-3 px-4">Expense Type</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Voucher</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">View Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-[#543D30]">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-slate-400 font-medium">
                        <div className="flex flex-col items-center gap-2">
                          <RefreshCw className="w-6 h-6 animate-spin text-[#966038]" />
                          <span>Loading team expense claims...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredTeamExpenses.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-slate-400 font-medium">
                        No team expense claims found matching filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTeamExpenses.map((item) => (
                      <tr key={item.id} className="hover:bg-[#FAF6F0]/60 transition">
                        {/* Executive Info */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={item.avatar}
                              alt={item.employeeName}
                              className="w-8 h-8 rounded-full bg-[#F3ECE2] object-cover ring-1 ring-[#E8D8C8] shrink-0"
                            />
                            <div>
                              <p className="font-extrabold text-[#543D30] text-xs leading-tight">{item.employeeName}</p>
                              <span className="text-[10px] text-slate-400 font-bold">{item.employeeCode}</span>
                            </div>
                          </div>
                        </td>

                        {/* Client / Visit Account */}
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-800 text-xs">{item.customerName}</p>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#966038]" /> {item.visitLocation}
                          </span>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded-lg bg-[#FAF6F0] border border-[#E8D8C8] text-[11px] font-bold text-[#6B4E3D]">
                            {item.category}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="py-3 px-4 text-slate-600 text-xs font-bold">
                          {item.date}
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-4 font-black text-[#543D30] text-xs">
                          {item.amount}
                        </td>

                        {/* Receipt Voucher */}
                        <td className="py-3 px-4">
                          {item.receiptUrl ? (
                            <button
                              onClick={() => setZoomReceipt(item.receiptUrl)}
                              className="text-[#966038] hover:text-[#543D30] font-bold text-[11px] flex items-center gap-1 underline cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" /> View Voucher
                            </button>
                          ) : (
                            <span className="text-slate-300 text-[11px]">No File</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-4 text-center">
                          {item.status === 'Approved' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black">
                              <CheckCircle2 className="w-3 h-3" /> APPROVED
                            </span>
                          ) : item.status === 'Rejected' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black">
                              <XCircle className="w-3 h-3" /> REJECTED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black">
                              <Clock className="w-3 h-3 animate-pulse" /> PENDING
                            </span>
                          )}
                        </td>

                        {/* View Audit Action */}
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedClaim(item)}
                            className="p-1.5 rounded-lg bg-[#FAF6F0] hover:bg-[#F3ECE2] text-[#6B4E3D] border border-[#E8D8C8] transition cursor-pointer inline-flex items-center gap-1 font-extrabold text-[11px]"
                            title="View Full Claim Audit"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#966038]" /> Inspect
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: MY EXPENSES (SUBMIT & TRACK PERSONAL CLAIMS) ──────────── */}
      {activeTab === 'own' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E8D8C8] p-3 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2 text-xs text-[#6B4E3D] font-semibold">
              <Info className="w-4 h-4 text-[#966038] shrink-0" />
              <span>
                Personal Expense Claims are routed directly to your assigned <strong className="text-[#543D30] font-extrabold">Sales Manager</strong> for approval & reimbursement.
              </span>
            </div>
          </div>

          <ExecutiveExpenses />
        </div>
      )}

      {/* ── MODAL 1: VIEW CLAIM AUDIT DETAILS (READ-ONLY) ────────────────── */}
      {selectedClaim && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8D8C8] rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#F3ECE2] text-[#966038] rounded-xl">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-[#543D30] text-sm uppercase tracking-wider">
                    Claim Details Audit ({selectedClaim.id})
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold">Read-Only Team Supervision</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedClaim(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Info */}
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3 p-3 bg-[#FAF6F0] rounded-xl border border-[#E8D8C8]">
                <img
                  src={selectedClaim.avatar}
                  alt={selectedClaim.employeeName}
                  className="w-10 h-10 rounded-full bg-white object-cover ring-1 ring-[#E8D8C8]"
                />
                <div>
                  <h4 className="font-extrabold text-[#543D30] text-sm">{selectedClaim.employeeName}</h4>
                  <p className="text-[11px] text-slate-500 font-semibold">Code: {selectedClaim.employeeCode}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Client Account</span>
                  <p className="font-bold text-slate-800 text-xs mt-0.5">{selectedClaim.customerName}</p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Claim Amount</span>
                  <p className="font-black text-[#543D30] text-sm mt-0.5">{selectedClaim.amount}</p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Category</span>
                  <p className="font-bold text-slate-800 text-xs mt-0.5">{selectedClaim.category}</p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Date Logged</span>
                  <p className="font-bold text-slate-800 text-xs mt-0.5">{selectedClaim.date}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase">Description / Purpose</span>
                <p className="text-slate-700 font-medium text-xs leading-relaxed">{selectedClaim.description}</p>
              </div>

              {selectedClaim.managerRemarks && (
                <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/80 space-y-1">
                  <span className="text-[10px] font-black text-amber-800 uppercase">Manager Review Remarks</span>
                  <p className="text-amber-900 font-semibold text-xs">{selectedClaim.managerRemarks}</p>
                </div>
              )}

              {/* Receipt Preview */}
              {selectedClaim.receiptUrl ? (
                <div className="pt-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase block mb-1.5">Uploaded Voucher File</span>
                  <button
                    onClick={() => setZoomReceipt(selectedClaim.receiptUrl)}
                    className="w-full p-2.5 bg-[#FAF6F0] hover:bg-[#F3ECE2] border border-[#E8D8C8] rounded-xl text-[#966038] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition"
                  >
                    <FileText className="w-4 h-4" /> View Full Receipt Document <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-center text-xs font-semibold">
                  No bill receipt image attached to this claim.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedClaim(null)}
                className="px-4 py-2 bg-[#543D30] hover:bg-[#422E22] text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: RECEIPT LIGHTBOX ZOOM ────────────────────────────────── */}
      {zoomReceipt && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-4 shadow-2xl space-y-3 font-sans relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="font-extrabold text-[#543D30] text-xs uppercase tracking-wider">Voucher / Receipt Preview</h4>
              <button
                onClick={() => setZoomReceipt(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-slate-900 rounded-xl p-2">
              <img src={zoomReceipt} alt="Receipt Voucher" className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-md" />
            </div>

            <div className="flex justify-end">
              <a
                href={zoomReceipt}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-[#966038] hover:bg-[#543D30] text-white font-bold text-xs rounded-xl transition cursor-pointer inline-flex items-center gap-1.5"
              >
                Open Original Image <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── FALLBACK DEMO DATA FOR TEAM EXPENSES ────────────────────────────────────
const MOCK_TEAM_EXPENSES = [
  {
    id: 'EXP-1092',
    employeeName: 'Ramesh Kumar',
    employeeCode: 'EMP-014',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ramesh',
    customerName: 'Bavani Sree Enterprises',
    visitLocation: 'T. Nagar, Chennai',
    category: 'Travel / Fuel',
    amount: '₹834',
    numericAmount: 834,
    date: '2026-08-14',
    submittedDate: '2026-08-14',
    status: 'Approved',
    description: 'Field visit conveyance for ongoing software demo meeting',
    receiptUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=60',
    receiptName: 'fuel_voucher.jpg',
    managerRemarks: 'Verified against GPS field visit check-in. Approved.',
  },
  {
    id: 'EXP-1095',
    employeeName: 'Sanjay Dutt',
    employeeCode: 'EMP-018',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sanjay',
    customerName: 'Hjewr Tech Solutions',
    visitLocation: 'Guindy Industrial Estate',
    category: 'Miscellaneous Field Cost',
    amount: '₹183',
    numericAmount: 183,
    date: '2026-08-25',
    submittedDate: '2026-08-25',
    status: 'Pending',
    description: 'Parking charges & refreshments during client onboarding session',
    receiptUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=60',
    receiptName: 'parking_bill.pdf',
    managerRemarks: '',
  },
  {
    id: 'EXP-1088',
    employeeName: 'Vikas Sharma',
    employeeCode: 'EMP-021',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Vikas',
    customerName: 'Apex Logistics Ltd',
    visitLocation: 'Velachery, Chennai',
    category: 'Client Refreshment',
    amount: '₹450',
    numericAmount: 450,
    date: '2026-08-20',
    submittedDate: '2026-08-20',
    status: 'Approved',
    description: 'Tea & snacks for client procurement head meeting',
    receiptUrl: null,
    receiptName: '',
    managerRemarks: 'Approved by Sales Manager',
  },
  {
    id: 'EXP-1077',
    employeeName: 'Anitha Roy',
    employeeCode: 'EMP-025',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anitha',
    customerName: 'Omni Health Corp',
    visitLocation: 'Nungambakkam',
    category: 'Travel / Conveyance',
    amount: '₹1,200',
    numericAmount: 1200,
    date: '2026-08-11',
    submittedDate: '2026-08-11',
    status: 'Rejected',
    description: 'Cab fare for duplicate visit attempt',
    receiptUrl: null,
    receiptName: '',
    managerRemarks: 'Duplicate claim request for same visit log.',
  },
]
