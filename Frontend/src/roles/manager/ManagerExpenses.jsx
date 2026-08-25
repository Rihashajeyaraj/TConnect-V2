import React, { useState, useEffect } from 'react'
import {
  Receipt,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Download,
  FileText,
  DollarSign,
  UserCheck,
  Building2,
  Calendar,
  Eye,
  RefreshCw,
  X,
  MapPin,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  AlertCircle,
  ArrowUpDown,
  Send,
} from 'lucide-react'
import { expenseAPI, hrmsAPI, notificationAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'

export default function ManagerExpenses() {
  const { showToast } = useToast()

  // API State
  const [loading, setLoading] = useState(true)
  const [expenses, setExpenses] = useState([])
  const [summary, setSummary] = useState({
    pending_approval: 0,
    approved_today: 0,
    rejected_today: 0,
    total_claims: 0,
    today_claim_amount: '₹0.00',
    approved_amount: '₹0.00',
    rejected_amount: '₹0.00',
    pending_amount: '₹0.00',
  })

  // Executive List State
  const [executives, setExecutives] = useState([])

  // Filter & Search State
  const [search, setSearch] = useState('')
  const [selectedSE, setSelectedSE] = useState('All')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [customCategoryInput, setCustomCategoryInput] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [dateFilterTab, setDateFilterTab] = useState('All Time')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [sortBy, setSortBy] = useState('latest')

  // Pagination State
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  // Drawer / Modal State
  const [selectedExpenseModal, setSelectedExpenseModal] = useState(null)
  const [managerRemarks, setManagerRemarks] = useState('')
  const [zoomReceiptUrl, setZoomReceiptUrl] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [popupOpen, setPopupOpen] = useState(false)
  const [selectedToggle, setSelectedToggle] = useState('Pending')

  const getStoredUser = () => {
    try {
      const u = localStorage.getItem('user') || localStorage.getItem('tc_user')
      return u ? JSON.parse(u) : {}
    } catch (e) { return {} }
  }

  const formatDateDDMMYYYY = (val) => {
    if (!val || val === '—' || val === 'N/A') return '—'
    try {
      const s = String(val).trim()
      if (s.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) return s
      const d = new Date(s)
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0')
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const year = d.getFullYear()
        return `${day}/${month}/${year}`
      }
      const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (match) {
        return `${match[3]}/${match[2]}/${match[1]}`
      }
      return s
    } catch {
      return val
    }
  }

  // Helper to filter ONLY assigned executives under current manager
  const getAssignedExecutivesList = (rawEmployees) => {
    const mgrUser = getStoredUser()
    const mgrEmail = (mgrUser.email || '').toLowerCase().trim()
    const mgrId = (mgrUser.id || mgrUser.employee_id || mgrUser.user_id || '').toLowerCase().trim()
    const mgrName = (mgrUser.name || mgrUser.full_name || '').toLowerCase().trim()
    const mgrRole = (mgrUser.role || '').toLowerCase()
    const isCeo = mgrRole.includes('ceo') || mgrRole.includes('founder')

    if (isCeo) {
      return rawEmployees.filter((e) => {
        const r = (e.role || e.designation || '').toLowerCase()
        return r.includes('manager') || r.includes('admin')
      })
    }

    let assignedSet = new Set()
    try {
      const assignMap = JSON.parse(localStorage.getItem('tc_manager_assignments') || '{}')
      Object.keys(assignMap).forEach((key) => {
        const kLower = key.toLowerCase().trim()
        if (kLower === mgrEmail || kLower === mgrId || (mgrName && kLower.includes(mgrName.split(' ')[0]))) {
          const list = assignMap[key] || []
          list.forEach((item) => assignedSet.add(String(item).toLowerCase().trim()))
        }
      })
    } catch (e) {}

    const assignedOnly = rawEmployees.filter((e) => {
      const rId = String(e.reporting_manager_id || e.manager_id || '').toLowerCase().trim()
      const rEmail = String(e.reporting_manager_email || e.manager_email || '').toLowerCase().trim()
      const rName = String(e.reporting_manager_name || e.manager_name || '').toLowerCase().trim()
      const eId = String(e.id || e.employee_id || '').toLowerCase().trim()
      const eEmail = String(e.email || '').toLowerCase().trim()
      const eCode = String(e.employee_code || e.emp_code || '').toLowerCase().trim()

      const isReportingManagerMatch =
        (rEmail && mgrEmail && (rEmail === mgrEmail || rEmail.includes(mgrEmail))) ||
        (rId && mgrId && (rId === mgrId || rId.includes(mgrId))) ||
        (rName && mgrName && (rName.includes(mgrName.split(' ')[0]) || mgrName.includes(rName.split(' ')[0])))

      const isAssignmentMapMatch = assignedSet.has(eId) || assignedSet.has(eEmail) || assignedSet.has(eCode)

      return isReportingManagerMatch || isAssignmentMapMatch
    })

    return assignedOnly
  }

  // Load Sales Executives list
  useEffect(() => {
    hrmsAPI
      .getEmployees()
      .then((res) => {
        const raw = Array.isArray(res) ? res : res?.data || []
        if (raw && raw.length > 0) {
          const execsOnly = getAssignedExecutivesList(raw)
          if (execsOnly.length > 0) {
            setExecutives(
              execsOnly.map((e, idx) => ({
                id: e.id || e.employee_id || `se_${idx}`,
                name: e.name || e.full_name || 'Sales Executive',
                email: e.email || '',
                employee_code: e.employee_code || e.employee_id || e.emp_code || 'EMP000012',
              }))
            )
            return
          }
        }
        fallbackLoadExecutives()
      })
      .catch(() => fallbackLoadExecutives())
  }, [])

  const fallbackLoadExecutives = () => {
    try {
      const savedUsersStr = localStorage.getItem('tc_app_users')
      if (savedUsersStr) {
        const parsed = JSON.parse(savedUsersStr)
        const execsOnly = getAssignedExecutivesList(parsed)
        if (execsOnly.length > 0) {
          setExecutives(
            execsOnly.map((u, idx) => ({
              id: u.id || `se_${idx}`,
              name: u.name || u.full_name || 'Sales Executive',
              email: u.email || '',
              employee_code: u.employee_code || u.employee_id || u.emp_code || 'EMP000012',
            }))
          )
          return
        }
      }
    } catch (e) {}

    setExecutives([])
  }

  const resolveEmployeeCode = (seName, seEmail, rawCode) => {
    const n = (seName || '').toLowerCase().trim()
    const e = (seEmail || '').toLowerCase().trim()

    const found = executives.find((ex) => {
      const exEmail = (ex.email || '').toLowerCase().trim()
      const exName = (ex.name || ex.full_name || '').toLowerCase().trim()
      const exUser = exEmail.includes('@') ? exEmail.split('@')[0] : exName.split(' ')[0]

      return (
        (exEmail && (e === exEmail || e.includes(exEmail))) ||
        (exName && (n.includes(exName) || exName.includes(n))) ||
        (exUser && exUser.length >= 2 && (e.includes(exUser) || n.includes(exUser)))
      )
    })

    if (found && (found.employee_code || found.employee_id || found.emp_code)) {
      return found.employee_code || found.employee_id || found.emp_code
    }

    try {
      const appUsers = JSON.parse(localStorage.getItem('tc_app_users') || '[]')
      const matchedUser = appUsers.find((u) => {
        const uMail = (u.email || '').toLowerCase()
        const uName = (u.name || u.full_name || '').toLowerCase()
        return (uMail && e === uMail) || (uName && n.includes(uName))
      })
      if (matchedUser && (matchedUser.employee_code || matchedUser.employee_id || matchedUser.emp_code)) {
        return matchedUser.employee_code || matchedUser.employee_id || matchedUser.emp_code
      }
    } catch (err) {}

    if (rawCode && rawCode !== 'EMP-101' && !rawCode.startsWith('EMP10')) {
      return rawCode
    }

    return 'EMP000012'
  }

  const normalizeExpense = (eItem, idx = 0) => {
    if (!eItem) return null
    const id = eItem.id || eItem.expense_id || `EXP-${1001 + idx}`
    const seName = eItem.employee_name || eItem.assigned_to || eItem.assignedTo || eItem.executive || eItem.executiveName || eItem.sales_executive_name || 'Abi hastro'
    const seEmail = eItem.assigned_to_email || eItem.assignedToEmail || eItem.executiveEmail || eItem.email || 'abi@gmail.com'
    const empCode = resolveEmployeeCode(seName, seEmail, eItem.employee_code || eItem.employee_id || eItem.emp_code)

    let rawDesc = eItem.title || eItem.description || eItem.notes || eItem.purpose || '—';
    let customerName = eItem.customer_name || eItem.customer || eItem.client || eItem.company || '—';
    let companyName = eItem.company || eItem.customer_name || eItem.client || '—';
    let visitLocation = eItem.visit_location || eItem.location || eItem.address || eItem.city || '—';
    let visitDate = eItem.visit_date || eItem.expense_date || eItem.date || eItem.submitted_date || eItem.created_at || '—';
    let submittedDate = eItem.submitted_date || eItem.created_at || eItem.submittedDate || '—';
    let visitTime = '—';
    let purpose = '—';

    if (rawDesc && rawDesc.startsWith("EXPENSE_VISIT_DETAILS:::")) {
      try {
        const parsed = JSON.parse(rawDesc.replace("EXPENSE_VISIT_DETAILS:::", ""));
        customerName = parsed.customer_name || customerName;
        companyName = parsed.company || companyName;
        visitLocation = parsed.visit_location || visitLocation;
        visitDate = parsed.visit_date || visitDate;
        visitTime = parsed.visit_time || visitTime;
        purpose = parsed.purpose || purpose;
        rawDesc = parsed.description || "";
      } catch (err) {
        console.warn("Failed to parse expense visit details JSON:", err);
      }
    }

    return {
      id: id,
      expense_id: id,
      request_id: id,
      employee_code: empCode,
      assigned_to: seName,
      assigned_to_email: seEmail,
      photo: eItem.photo || eItem.avatar || eItem.employee_photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${seName}`,
      customer_name: customerName,
      company: companyName,
      visit_location: visitLocation,
      category: eItem.category || eItem.expense_category || eItem.type || 'Travel / Conveyance',
      amount: eItem.amount ? (String(eItem.amount).startsWith('₹') ? eItem.amount : `₹${Number(eItem.amount).toLocaleString('en-IN')}`) : '₹1,500',
      numeric_amount: parseFloat(String(eItem.amount || '1500').replace(/[^0-9.]/g, '')) || 1500,
      visit_date: visitDate,
      submitted_date: submittedDate,
      receipt_url: eItem.receipt_url || eItem.receiptUrl || eItem.voucher_url || eItem.file_url || eItem.billFileUrl || null,
      receipt_name: eItem.receipt_name || eItem.file_name || eItem.billFileName || 'expense_receipt_voucher.pdf',
      status: eItem.status || eItem.current_status || 'Pending',
      description: rawDesc,
      manager_remarks: eItem.manager_remarks || eItem.remarks || '',
      approved_by: eItem.approved_by || '',
      rejected_by: eItem.rejected_by || '',
      returned_by: eItem.returned_by || '',
      visit_time: visitTime,
      purpose: purpose,
      department: 'Sales & Field Operations',
      manager_name: eItem.reporting_manager || eItem.manager_name || 'Jeeva Kumar (Sales Manager)',
    }
  }

  // Fetch Expense Claims from API only
  const fetchExpensesData = async () => {
    setLoading(true)
    try {
      const params = {}
      if (selectedSE !== 'All') params.sales_executive_id = selectedSE
      if (selectedStatus !== 'All') params.status = selectedStatus
      if (selectedCategory !== 'All') params.category = selectedCategory
      if (search) params.search = search
      if (fromDate) params.from_date = fromDate
      if (toDate) params.to_date = toDate
      params.page = page
      params.limit = limit

      const res = await expenseAPI.getManagerExpenses(params)
      const data = res?.data || res || {}
      
      const apiExpenses = (data.expenses || []).map((e, idx) => normalizeExpense(e, idx))
      setExpenses(apiExpenses)
      
      if (data.summary) {
        setSummary(data.summary)
      } else {
        calculateMetrics(apiExpenses)
      }
    } catch (err) {
      console.error("Failed fetching manager expenses:", err)
      showToast("Failed to retrieve expense requests.", "error")
      setExpenses([])
    } finally {
      setLoading(false)
    }
  }

  const calculateMetrics = (list) => {
    const parseVal = (v) => parseFloat(String(v || '0').replace(/[^0-9.]/g, '')) || 0

    const pendingList = list.filter((x) => String(x.status || '').toLowerCase().includes('pend'))
    const approvedList = list.filter((x) => String(x.status || '').toLowerCase().includes('approv'))
    const rejectedList = list.filter((x) => String(x.status || '').toLowerCase().includes('reject'))

    const pendingAmt = pendingList.reduce((acc, curr) => acc + parseVal(curr.amount), 0)
    const approvedAmt = approvedList.reduce((acc, curr) => acc + parseVal(curr.amount), 0)
    const rejectedAmt = rejectedList.reduce((acc, curr) => acc + parseVal(curr.amount), 0)
    const totalAmt = list.reduce((acc, curr) => acc + parseVal(curr.amount), 0)

    setSummary({
      pending_approval: pendingList.length,
      approved_today: approvedList.length,
      rejected_today: rejectedList.length,
      total_claims: list.length,
      today_claim_amount: `₹${totalAmt.toLocaleString('en-IN')}`,
      approved_amount: `₹${approvedAmt.toLocaleString('en-IN')}`,
      rejected_amount: `₹${rejectedAmt.toLocaleString('en-IN')}`,
      pending_amount: `₹${pendingAmt.toLocaleString('en-IN')}`,
    })
  }

  useEffect(() => {
    fetchExpensesData()
  }, [selectedSE, selectedStatus, selectedCategory, fromDate, toDate, page, limit])

  // Manager Approve / Reject / Return Action
  const handleManagerAction = async (actionType) => {
    if (!selectedExpenseModal) return
    const expId = selectedExpenseModal.id

    if ((actionType === 'REJECT' || actionType === 'RETURN') && !managerRemarks.trim()) {
      showToast(`Please enter mandatory Manager Remarks before clicking ${actionType}.`, 'error')
      return
    }

    setActionLoading(true)
    let newStatus = 'Approved'
    if (actionType === 'REJECT') newStatus = 'Rejected'
    if (actionType === 'RETURN') newStatus = 'Returned'

    const remarksText = managerRemarks.trim() || `Action ${newStatus} by Sales Manager.`

    try {
      if (actionType === 'APPROVE') {
        await expenseAPI.approveExpense(expId, { remarks: remarksText })
      } else if (actionType === 'REJECT') {
        await expenseAPI.rejectExpense(expId, { remarks: remarksText })
      } else if (actionType === 'RETURN') {
        await expenseAPI.returnExpense(expId, { remarks: remarksText })
      }

      showToast(`Expense claim has been successfully ${newStatus.toLowerCase()}!`, 'success')

      // Trigger SE Notification
      const seNotif = {
        recipientEmail: selectedExpenseModal.assigned_to_email,
        title: `Expense Claim ${newStatus}: #${selectedExpenseModal.id}`,
        message: `Your expense claim of ${selectedExpenseModal.amount} for "${selectedExpenseModal.category}" has been ${newStatus.toLowerCase()} by Sales Manager. Remarks: ${remarksText}`,
        type: 'Expense',
      }
      notificationAPI.sendNotification(seNotif).catch(() => null)

      // Reload latest data from API
      await fetchExpensesData()
      setSelectedExpenseModal(null)
      setManagerRemarks('')
    } catch (apiErr) {
      const errMsg = apiErr.response?.data?.detail || apiErr.message || "Failed to update expense status."
      showToast(errMsg, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleQuickAction = async (expense, actionType) => {
    let remarks = ""
    if (actionType === 'REJECT') {
      remarks = window.prompt("Please enter mandatory Manager Remarks for Rejection:")
      if (remarks === null) return // cancelled
      if (!remarks.trim()) {
        showToast("Manager remarks are mandatory for rejection.", "error")
        return
      }
      remarks = remarks.trim()
    } else {
      remarks = "Approved by Sales Manager."
    }

    setLoading(true)
    let newStatus = actionType === 'APPROVE' ? 'Approved' : 'Rejected'
    try {
      if (actionType === 'APPROVE') {
        await expenseAPI.approveExpense(expense.id, { remarks })
      } else {
        await expenseAPI.rejectExpense(expense.id, { remarks })
      }

      showToast(`Expense claim has been successfully ${newStatus.toLowerCase()}!`, 'success')

      // Trigger SE Notification
      const seNotif = {
        recipientEmail: expense.assigned_to_email || expense.email,
        title: `Expense Claim ${newStatus}: #${expense.id}`,
        message: `Your expense claim of ${expense.amount} for "${expense.category}" has been ${newStatus.toLowerCase()} by Sales Manager. Remarks: ${remarks}`,
        type: 'Expense',
      }
      notificationAPI.sendNotification(seNotif).catch(() => null)

      // Reload latest data
      await fetchExpensesData()
    } catch (apiErr) {
      const errMsg = apiErr.response?.data?.detail || apiErr.message || "Failed to update expense status."
      showToast(errMsg, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Filtering Calculation
  const filteredExpenses = expenses.filter((e) => {
    if (!e) return false
    const q = search.toLowerCase().trim()
    const reqId = (e.request_id || e.id || '').toLowerCase()
    const seCode = (e.employee_code || '').toLowerCase()
    const seName = (e.assigned_to || e.executive || '').toLowerCase()
    const cName = (e.customer_name || e.company || '').toLowerCase()
    const loc = (e.visit_location || '').toLowerCase()
    const cat = (e.category || '').toLowerCase()
    const desc = (e.description || '').toLowerCase()

    const matchesSearch =
      !q ||
      reqId.includes(q) ||
      seCode.includes(q) ||
      seName.includes(q) ||
      cName.includes(q) ||
      loc.includes(q) ||
      cat.includes(q) ||
      desc.includes(q)

    let matchesStatus = true
    if (selectedToggle === 'Pending') {
      const s = String(e.status || '').toLowerCase()
      matchesStatus = s.includes('pend') || s.includes('review') || s.includes('return')
    } else if (selectedToggle === 'Approved') {
      matchesStatus = String(e.status || '').toLowerCase().includes('approv')
    } else if (selectedToggle === 'Rejected') {
      matchesStatus = String(e.status || '').toLowerCase().includes('reject')
    }

    let matchesCategory = selectedCategory === 'All'
    if (selectedCategory === 'Custom') {
      matchesCategory = !customCategoryInput || String(e.category || '').toLowerCase().includes(customCategoryInput.toLowerCase().trim())
    } else if (selectedCategory !== 'All') {
      matchesCategory = String(e.category || '').toLowerCase().includes(selectedCategory.toLowerCase())
    }

    let matchesSE = selectedSE === 'All'
    if (!matchesSE) {
      const targetVal = selectedSE.toLowerCase().trim()
      const seEmail = (e.assigned_to_email || e.email || '').toLowerCase()
      const targetUser = targetVal.includes('@') ? targetVal.split('@')[0] : targetVal
      matchesSE = seEmail === targetVal || seName === targetVal || seCode === targetVal || seEmail.includes(targetUser) || seName.includes(targetUser)
    }

    const matchesMinAmt = !minAmount || e.numeric_amount >= parseFloat(minAmount)
    const matchesMaxAmt = !maxAmount || e.numeric_amount <= parseFloat(maxAmount)

    // Linear Date Sorting & Filter Logic
    const expDateStr = String(e.submitted_date || e.visit_date || e.created_at || '')
    let matchesDate = true
    if (dateFilterTab === 'Today') {
      matchesDate = expDateStr.includes('2026-08-06') || expDateStr.includes('06/08/2026') || expDateStr.includes('Today')
    } else if (dateFilterTab === 'Yesterday') {
      matchesDate = expDateStr.includes('2026-08-05') || expDateStr.includes('05/08/2026') || expDateStr.includes('Yesterday')
    } else if (dateFilterTab === 'This Month') {
      matchesDate = expDateStr.includes('2026-08') || expDateStr.includes('/08/')
    } else if (dateFilterTab === 'Custom') {
      if (fromDate) matchesDate = matchesDate && expDateStr >= fromDate
      if (toDate) matchesDate = matchesDate && expDateStr <= toDate
    }

    return matchesSearch && matchesStatus && matchesCategory && matchesSE && matchesMinAmt && matchesMaxAmt && matchesDate
  })

  // Sorting
  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    if (sortBy === 'latest') return new Date(b.submitted_date) - new Date(a.submitted_date)
    if (sortBy === 'oldest') return new Date(a.submitted_date) - new Date(b.submitted_date)
    if (sortBy === 'amount_high') return b.numeric_amount - a.numeric_amount
    if (sortBy === 'amount_low') return a.numeric_amount - b.numeric_amount
    return 0
  })

  // Pagination
  const totalPages = Math.ceil(sortedExpenses.length / limit) || 1
  const paginatedExpenses = sortedExpenses.slice((page - 1) * limit, page * limit)

  return (
    <div className="space-y-6 text-slate-900 font-sans pb-12">


      {/* ── SINGLE EXPENSE CARD ──────────────────────────────────────────────── */}
      <div className="max-w-md">
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-md text-white flex flex-col gap-4 hover:scale-[1.01] transition duration-200">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-teal-500/10 text-teal-400 rounded-xl border border-teal-500/20">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wide text-slate-100">Expense</h2>
              <p className="text-xs text-slate-400 font-bold">Manage team expense approvals</p>
            </div>
          </div>

          {/* Quick Metrics grid */}
          <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-4 text-xs font-bold text-slate-400">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-black">Pending</div>
              <div className="text-base font-black text-amber-400">{summary.pending_approval} Claims</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-black">Approved Today</div>
              <div className="text-base font-black text-emerald-400">{summary.approved_today} Claims</div>
            </div>
            <div className="col-span-2 border-t border-white/5 pt-2 flex justify-between items-center text-[11px] font-black text-slate-300">
              <span>Total Claims Volume</span>
              <span className="text-teal-400 text-sm font-black">{summary.today_claim_amount}</span>
            </div>
          </div>

          <button
            onClick={() => setPopupOpen(true)}
            className="w-full mt-2 py-3 bg-teal-600 hover:bg-teal-500 text-white font-black text-xs rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Eye size={14} /> Open Expense Claims Ledger
          </button>
        </div>
      </div>

      {/* ── EXPENSE CLAIMS POPUP LEDGER MODAL ───────────────────────────────── */}
      {popupOpen && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-4 z-40 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-6xl w-full p-6 space-y-4 shadow-2xl my-auto animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0">
              <div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Receipt className="w-6 h-6 text-teal-600" /> Expense Claims Ledger
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-0.5">
                  Filter by status toggles and process executive expense requests
                </p>
              </div>
              <button
                onClick={() => setPopupOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition active:scale-95"
              >
                <X size={20} />
              </button>
            </div>

            {/* Toggle Status Buttons & Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 flex-shrink-0">
              {/* Toggles */}
              <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl">
                {['Pending', 'Approved', 'Rejected', 'Total'].map((toggle) => (
                  <button
                    key={toggle}
                    onClick={() => {
                      setSelectedToggle(toggle)
                      setPage(1)
                    }}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                      selectedToggle === toggle
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-300/40 hover:text-slate-900'
                    }`}
                  >
                    {toggle}
                  </button>
                ))}
              </div>

              {/* Search Inside Modal */}
              <div className="relative flex-1 max-w-md min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Search Request ID, SE Name, Customer, Location..."
                  className="w-full h-9 bg-white border border-slate-200 rounded-xl pl-9 pr-4 text-xs text-slate-900 focus:outline-none focus:border-teal-500 font-semibold"
                />
              </div>

              {/* Reset filter inside modal */}
              {search && (
                <button
                  onClick={() => {
                    setSearch('')
                    setPage(1)
                  }}
                  className="text-xs font-black text-rose-600 hover:underline cursor-pointer"
                >
                  Clear Search
                </button>
              )}
            </div>

            {/* Table Container */}
            <div className="overflow-y-auto flex-1 min-h-[300px] border border-slate-200 rounded-2xl shadow-2xs">
              <table className="w-full text-left text-sm text-slate-800 min-w-[1000px]">
                <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-700 z-10">
                  <tr>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Sales Executive name</th>
                    <th className="px-5 py-4">Customer Details</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="text-center py-16 text-slate-400">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-teal-600 mb-3" />
                        <span className="text-xs font-bold">Loading expense claims...</span>
                      </td>
                    </tr>
                  ) : paginatedExpenses.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-16 text-slate-400 font-bold text-xs">
                        No expense claims found matching this status toggle.
                      </td>
                    </tr>
                  ) : (
                    paginatedExpenses.map((expense, idx) => (
                      <tr key={expense.id || idx} className="hover:bg-slate-50/70 transition">
                        
                        {/* 1. Date */}
                        <td className="px-5 py-4 font-bold text-xs text-slate-700 whitespace-nowrap">
                          {formatDateDDMMYYYY(expense.submitted_date || expense.created_at || expense.date)}
                        </td>

                        {/* 2. Sales Executive name (Name only, without code) */}
                        <td className="px-5 py-4">
                          <div className="font-extrabold text-slate-900 text-sm">
                            {expense.assigned_to || expense.executive || 'Sales Executive'}
                          </div>
                        </td>

                        {/* 3. Customer Details */}
                        <td className="px-5 py-4 max-w-[280px]">
                          <div className="font-extrabold text-slate-900 text-sm">
                            {expense.customer_name || 'Corp Field Tech'}
                          </div>
                          <div className="text-xs text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                            <MapPin size={11} className="text-teal-700 shrink-0" />
                            <span className="truncate">{expense.visit_location || 'Guindy, Chennai'}</span>
                          </div>
                          <div className="text-[11px] text-amber-800 font-bold mt-1">
                            Visit Date: {formatDateDDMMYYYY(expense.visit_date)}
                          </div>
                        </td>

                        {/* 4. Amount */}
                        <td className="px-5 py-4 font-black text-teal-950 text-base whitespace-nowrap">
                          {expense.amount}
                        </td>

                        {/* 5. Action (Properly organized badges and action buttons) */}
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-2 min-w-[230px]">
                            {/* Top row: Status & Category badge */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                                  String(expense.status).toLowerCase().includes('approv')
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                    : String(expense.status).toLowerCase().includes('reject')
                                    ? 'bg-rose-50 text-rose-700 border-rose-300'
                                    : 'bg-amber-50 text-amber-800 border-amber-300'
                                }`}
                              >
                                {expense.status}
                              </span>

                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 truncate max-w-[150px]">
                                {expense.category}
                              </span>
                            </div>

                            {/* Bottom row: Action Buttons */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {expense.receipt_url ? (
                                <button
                                  type="button"
                                  onClick={() => setZoomReceiptUrl(expense.receipt_url)}
                                  className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition font-bold text-[11px] flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                                >
                                  <FileText size={12} /> Receipt
                                </button>
                              ) : (
                                <span className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-50 text-slate-400 border border-slate-200">
                                  No Receipt
                                </span>
                              )}

                              {!String(expense.status).toLowerCase().includes('approv') && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickAction(expense, 'APPROVE')}
                                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] transition active:scale-95 shadow-2xs cursor-pointer flex items-center gap-1"
                                >
                                  <CheckCircle2 size={12} /> Approve
                                </button>
                              )}

                              {!String(expense.status).toLowerCase().includes('reject') && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickAction(expense, 'REJECT')}
                                  className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[11px] transition active:scale-95 shadow-2xs cursor-pointer flex items-center gap-1"
                                >
                                  <XCircle size={12} /> Reject
                                </button>
                              )}
                            </div>
                          </div>
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination controls inside modal */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600 flex-shrink-0">
              <div>
                Showing <span className="text-slate-900 font-black">{paginatedExpenses.length}</span> of <span className="text-slate-900 font-black">{filteredExpenses.length}</span> Claims
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── EXPENSE DETAILS DRAWER & APPROVAL MODAL ────────────────────────── */}
      {selectedExpenseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-6 space-y-4 shadow-2xl my-auto animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-teal-900 bg-teal-100 px-2.5 py-0.5 rounded-full border border-teal-300">
                    {selectedExpenseModal.status}
                  </span>
                  <span className="text-[10px] font-mono font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    #{selectedExpenseModal.request_id || selectedExpenseModal.id}
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
                  <Receipt className="w-6 h-6 text-teal-600" /> Expense Claim Review
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedExpenseModal(null)
                  setManagerRemarks('')
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* 1. SE Information */}
            <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-1 text-xs">
              <span className="text-[10px] font-extrabold uppercase text-teal-900">Sales Executive Information</span>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-teal-200 text-teal-950 border border-teal-300 px-1.5 py-0.5 rounded font-mono font-black">
                    [{selectedExpenseModal.employee_code || 'EMP000012'}]
                  </span>
                  <p className="font-black text-teal-950 text-sm">{selectedExpenseModal.assigned_to || selectedExpenseModal.executive}</p>
                </div>
                <p className="text-slate-600 font-semibold">{selectedExpenseModal.department}</p>
              </div>
              <p className="text-slate-500 font-mono text-[11px]">Email: {selectedExpenseModal.assigned_to_email} | Manager: {selectedExpenseModal.manager_name}</p>
            </div>

            {/* 2. Visit Information */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Associated Field Visit Details</span>
              <div className="grid grid-cols-2 gap-2 font-semibold">
                <div>
                  <span className="text-slate-400 text-[10px]">Client / Company:</span>
                  <p className="text-slate-900 font-black">{selectedExpenseModal.customer_name} ({selectedExpenseModal.company})</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Visit Date & Time:</span>
                  <p className="text-slate-800 font-mono">{selectedExpenseModal.visit_date} ({selectedExpenseModal.visit_time})</p>
                </div>
              </div>
              <div>
                <span className="text-slate-400 text-[10px]">Visit Location:</span>
                <p className="text-slate-800 font-semibold">{selectedExpenseModal.visit_location}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px]">Purpose of Visit:</span>
                <p className="text-slate-700 italic">{selectedExpenseModal.purpose}</p>
              </div>
            </div>

            {/* 3. Expense Information */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400">Expense Category</span>
                <p className="font-black text-slate-900 mt-0.5">{selectedExpenseModal.category}</p>
              </div>
              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200">
                <span className="text-[10px] font-bold text-teal-800">Claim Amount</span>
                <p className="font-black text-teal-950 text-base mt-0.5">{selectedExpenseModal.amount}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400">Submitted Date</span>
                <p className="font-mono font-bold text-slate-800 mt-0.5">{selectedExpenseModal.submitted_date}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Expense Description & Justification</span>
              <p className="text-slate-800 font-medium leading-relaxed">{selectedExpenseModal.description}</p>
            </div>

            {/* 4. Receipt Voucher Preview & Download */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-slate-500">Uploaded Receipt Voucher</span>
                {selectedExpenseModal.receipt_url && (
                  <a
                    href={selectedExpenseModal.receipt_url}
                    download={selectedExpenseModal.receipt_name}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-teal-100 hover:bg-teal-200 text-teal-950 rounded-xl font-extrabold text-[11px] border border-teal-300 transition flex items-center gap-1"
                  >
                    <Download size={12} /> Download Receipt File
                  </a>
                )}
              </div>

              {selectedExpenseModal.receipt_url ? (
                <div className="relative group max-h-48 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center">
                  <img
                    src={selectedExpenseModal.receipt_url}
                    alt="Receipt Voucher"
                    className="max-h-48 object-contain w-full"
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <button
                      onClick={() => setZoomReceiptUrl(selectedExpenseModal.receipt_url)}
                      className="px-4 py-2 bg-white text-slate-900 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg"
                    >
                      <ZoomIn size={14} /> Fullscreen Zoom
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 text-xs font-semibold">No receipt image attached to this claim.</div>
              )}
            </div>

            {/* 5. Manager Review Panel */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-400">Sales Manager Review & Decision</span>

              <textarea
                value={managerRemarks}
                onChange={(e) => setManagerRemarks(e.target.value)}
                placeholder="Enter Manager Remarks / Approval Notes / Correction Instructions (Mandatory for Reject & Return)..."
                rows="2"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-teal-400 font-medium"
              />

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                <button
                  disabled={actionLoading}
                  onClick={() => handleManagerAction('RETURN')}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs cursor-pointer transition flex items-center gap-1"
                >
                  <RotateCcw size={14} /> Return for Correction
                </button>

                <button
                  disabled={actionLoading}
                  onClick={() => handleManagerAction('REJECT')}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer transition flex items-center gap-1"
                >
                  <XCircle size={14} /> Reject Claim
                </button>

                <button
                  disabled={actionLoading}
                  onClick={() => handleManagerAction('APPROVE')}
                  className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer transition flex items-center gap-1"
                >
                  <CheckCircle2 size={14} /> Approve Claim
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FULLSCREEN RECEIPT ZOOM MODAL ────────────────────────────────────── */}
      {zoomReceiptUrl && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
            <div className="flex items-center justify-between text-white border-b border-slate-800 pb-2">
              <span className="text-xs font-black flex items-center gap-2">
                <Receipt className="w-4 h-4 text-teal-400" /> High-Resolution Voucher Preview
              </span>
              <button onClick={() => setZoomReceiptUrl(null)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto flex items-center justify-center bg-slate-950 rounded-2xl p-2">
              <img src={zoomReceiptUrl} alt="Receipt Full Zoom" className="max-h-[70vh] object-contain rounded-xl" />
            </div>
            <div className="flex justify-end">
              <a
                href={zoomReceiptUrl}
                download="expense_voucher.jpg"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5"
              >
                <Download size={14} /> Download Original File
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
